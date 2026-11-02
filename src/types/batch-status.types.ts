export interface BatchStatusProps { onChanged: () => void; }
export interface BatchStatusState {
  id: string;
  active: boolean;
  busy: boolean;
  uncertain: boolean;
  revision: number;
  confirmed: string;
}
