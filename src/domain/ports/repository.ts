export interface Repository<TRecord, TCreate, TUpdate = Partial<TCreate>> {
  findById(id: string): Promise<TRecord | null>;
  list(): Promise<readonly TRecord[]>;
  create(input: TCreate): Promise<TRecord>;
  update(id: string, input: TUpdate): Promise<TRecord>;
  delete(id: string): Promise<void>;
}
