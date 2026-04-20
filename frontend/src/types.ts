export const QUOTA = 104_857_600; // 100 MB in bytes

export interface FileRecord {
  id: string;
  filename: string;
  path: string;
  size: number;
  start: number;
  end: number;
  createdAt: string;
  uid: string;
}

export interface SchedulerResult {
  sequence: number[];
  seekDistance: number;
  finalHead: number;
}

export interface AppState {
  uid: string;
  email: string;
  lastHead: number;
  files: FileRecord[];
  currentPath: string;
  selectedFileIds: Set<string>;
}

export interface AuthState {
  uid: string;
  email: string;
  lastHead: number;
}
