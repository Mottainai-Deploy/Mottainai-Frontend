export interface ApiQueryState<T> {
  data: T;
  status: 'loading' | 'success' | 'error';
  error: string;
}

export interface ApiQuerySnapshot<T> extends ApiQueryState<T> {
  query: (signal: AbortSignal) => Promise<T>;
  reloadKey: number;
}
