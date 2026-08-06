import { ValidationError } from "@/domain/errors/application-error";
import { isSafeRelativePath } from "@/domain/portability/rules";

export interface ArchiveFile {
  path: string;
  body: Uint8Array;
}

const LOCAL_FILE_SIGNATURE = 0x04034b50;
const CENTRAL_DIRECTORY_SIGNATURE = 0x02014b50;
const END_OF_CENTRAL_DIRECTORY_SIGNATURE = 0x06054b50;

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function writeU16(view: DataView, offset: number, value: number): void {
  view.setUint16(offset, value, true);
}

function writeU32(view: DataView, offset: number, value: number): void {
  view.setUint32(offset, value >>> 0, true);
}

function readU16(view: DataView, offset: number): number {
  return view.getUint16(offset, true);
}

function readU32(view: DataView, offset: number): number {
  return view.getUint32(offset, true);
}

function concatBytes(parts: readonly Uint8Array[]): Uint8Array {
  const length = parts.reduce((sum, part) => sum + part.byteLength, 0);
  const output = new Uint8Array(length);
  let offset = 0;
  for (const part of parts) {
    output.set(part, offset);
    offset += part.byteLength;
  }
  return output;
}

export function createZip(files: readonly ArchiveFile[]): Uint8Array {
  const encoder = new TextEncoder();
  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let localOffset = 0;
  const names = new Set<string>();

  for (const file of files) {
    if (!isSafeRelativePath(file.path) || names.has(file.path)) {
      throw new ValidationError("ZIP entries must use unique safe relative paths.");
    }
    names.add(file.path);
    const name = encoder.encode(file.path);
    const checksum = crc32(file.body);
    const local = new Uint8Array(30 + name.byteLength + file.body.byteLength);
    const localView = new DataView(local.buffer);
    writeU32(localView, 0, LOCAL_FILE_SIGNATURE);
    writeU16(localView, 4, 20);
    writeU16(localView, 6, 0);
    writeU16(localView, 8, 0);
    writeU16(localView, 10, 0);
    writeU16(localView, 12, 0);
    writeU32(localView, 14, checksum);
    writeU32(localView, 18, file.body.byteLength);
    writeU32(localView, 22, file.body.byteLength);
    writeU16(localView, 26, name.byteLength);
    writeU16(localView, 28, 0);
    local.set(name, 30);
    local.set(file.body, 30 + name.byteLength);
    localParts.push(local);

    const central = new Uint8Array(46 + name.byteLength);
    const centralView = new DataView(central.buffer);
    writeU32(centralView, 0, CENTRAL_DIRECTORY_SIGNATURE);
    writeU16(centralView, 4, 20);
    writeU16(centralView, 6, 20);
    writeU16(centralView, 8, 0);
    writeU16(centralView, 10, 0);
    writeU16(centralView, 12, 0);
    writeU16(centralView, 14, 0);
    writeU32(centralView, 16, checksum);
    writeU32(centralView, 20, file.body.byteLength);
    writeU32(centralView, 24, file.body.byteLength);
    writeU16(centralView, 28, name.byteLength);
    writeU16(centralView, 30, 0);
    writeU16(centralView, 32, 0);
    writeU16(centralView, 34, 0);
    writeU16(centralView, 36, 0);
    writeU32(centralView, 38, 0);
    writeU32(centralView, 42, localOffset);
    central.set(name, 46);
    centralParts.push(central);
    localOffset += local.byteLength;
  }

  const centralDirectory = concatBytes(centralParts);
  const localDirectory = concatBytes(localParts);
  const end = new Uint8Array(22);
  const endView = new DataView(end.buffer);
  writeU32(endView, 0, END_OF_CENTRAL_DIRECTORY_SIGNATURE);
  writeU16(endView, 4, 0);
  writeU16(endView, 6, 0);
  writeU16(endView, 8, files.length);
  writeU16(endView, 10, files.length);
  writeU32(endView, 12, centralDirectory.byteLength);
  writeU32(endView, 16, localDirectory.byteLength);
  writeU16(endView, 20, 0);
  return concatBytes([localDirectory, centralDirectory, end]);
}

export function readZip(bytes: Uint8Array): ArchiveFile[] {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const decoder = new TextDecoder();
  let endOffset = -1;
  for (let offset = bytes.byteLength - 22; offset >= 0; offset -= 1) {
    if (readU32(view, offset) === END_OF_CENTRAL_DIRECTORY_SIGNATURE) {
      endOffset = offset;
      break;
    }
  }
  if (endOffset < 0) throw new ValidationError("The ZIP archive is missing its directory.");
  const entryCount = readU16(view, endOffset + 10);
  const directorySize = readU32(view, endOffset + 12);
  const directoryOffset = readU32(view, endOffset + 16);
  if (directoryOffset + directorySize > bytes.byteLength) {
    throw new ValidationError("The ZIP archive directory is truncated.");
  }

  const files: ArchiveFile[] = [];
  const names = new Set<string>();
  let offset = directoryOffset;
  for (let index = 0; index < entryCount; index += 1) {
    if (readU32(view, offset) !== CENTRAL_DIRECTORY_SIGNATURE) {
      throw new ValidationError("The ZIP archive contains an invalid directory entry.");
    }
    const flags = readU16(view, offset + 8);
    const method = readU16(view, offset + 10);
    const checksum = readU32(view, offset + 16);
    const compressedSize = readU32(view, offset + 20);
    const uncompressedSize = readU32(view, offset + 24);
    const nameLength = readU16(view, offset + 28);
    const extraLength = readU16(view, offset + 30);
    const commentLength = readU16(view, offset + 32);
    const localOffset = readU32(view, offset + 42);
    const name = decoder.decode(bytes.slice(offset + 46, offset + 46 + nameLength));
    if (!isSafeRelativePath(name) || names.has(name) || flags & 0x1 || method !== 0) {
      throw new ValidationError("The ZIP archive contains an unsupported or unsafe entry.");
    }
    names.add(name);
    if (readU32(view, localOffset) !== LOCAL_FILE_SIGNATURE) {
      throw new ValidationError("The ZIP archive contains an invalid local entry.");
    }
    const localNameLength = readU16(view, localOffset + 26);
    const localExtraLength = readU16(view, localOffset + 28);
    const bodyOffset = localOffset + 30 + localNameLength + localExtraLength;
    const bodyEnd = bodyOffset + compressedSize;
    if (bodyEnd > bytes.byteLength || compressedSize !== uncompressedSize) {
      throw new ValidationError("The ZIP archive contains a truncated entry.");
    }
    const body = bytes.slice(bodyOffset, bodyEnd);
    if (crc32(body) !== checksum)
      throw new ValidationError(`ZIP entry '${name}' failed its checksum.`);
    files.push({ path: name, body });
    offset += 46 + nameLength + extraLength + commentLength;
  }
  return files;
}
