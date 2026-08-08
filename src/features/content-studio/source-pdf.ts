import { ValidationError } from "@/domain/errors/application-error";
import type { ExtractedSourcePage } from "@/features/content-studio/source-ingestion";

const MAX_PDF_PAGES = 1_500;
const EXTRACTION_TIMEOUT_MS = 45_000;

export async function extractPdfPages(body: Uint8Array): Promise<readonly ExtractedSourcePage[]> {
  const { extractText, getDocumentProxy } = await import("unpdf");
  const pdf = await getDocumentProxy(body, { maxImageSize: 16_777_216 });
  try {
    if (pdf.numPages < 1 || pdf.numPages > MAX_PDF_PAGES) {
      throw new ValidationError(`PDF books must contain between 1 and ${MAX_PDF_PAGES} pages.`);
    }
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<never>((_resolve, reject) => {
      timer = setTimeout(
        () => reject(new ValidationError("PDF text extraction timed out. Try a smaller book.")),
        EXTRACTION_TIMEOUT_MS,
      );
    });
    let extracted: Awaited<ReturnType<typeof extractText>>;
    try {
      extracted = await Promise.race([extractText(pdf, { mergePages: false }), timeout]);
    } finally {
      if (timer) clearTimeout(timer);
    }
    if (!Array.isArray(extracted.text)) {
      throw new ValidationError("The PDF text extractor returned an unexpected result.");
    }
    const pages = extracted.text.map((text, index) => ({
      pageNumber: index + 1,
      text: normalizeExtractedText(text),
    }));
    const readableCharacters = pages.reduce((total, page) => total + page.text.length, 0);
    if (readableCharacters < Math.max(120, pages.length * 30)) {
      throw new ValidationError(
        "This PDF does not contain enough selectable text. Run OCR on the book, then upload it again.",
      );
    }
    return pages;
  } finally {
    await pdf.cleanup();
  }
}

function normalizeExtractedText(value: string): string {
  return value
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
