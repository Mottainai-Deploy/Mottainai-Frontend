export interface PendingApiRead {
  controller: AbortController;
  promise: Promise<unknown>;
  subscribers: number;
}
