export type ScanStatus =
  | "decoded"
  | "duplicate"
  | "invalidDomain"
  | "notFound"
  | "error"
  | "pending"
  | "scanning";

export type BatchRunnerStatus =
  | "idle"
  | "running"
  | "paused"
  | "manual-required"
  | "complete";

export type ClaimStatus =
  | "pending"
  | "inProgress"
  | "claimed"
  | "already_claimed"
  | "skipped"
  | "failed";

export const TERMINAL_CLAIM_STATUSES = new Set<ClaimStatus>([
  "claimed",
  "already_claimed",
  "skipped",
  "failed",
]);

export interface TinImageItem {
  id: string;
  fileName: string;
  fileSize: number;
  createdAt: number;
  objectUrl: string;
}

export interface ScanResult {
  imageId: string;
  rawText: string | null;
  claimUrl: string | null;
  codeValue: string | null;
  status: ScanStatus;
  errorMessage: string | null;
  isProcessed: boolean;
  duplicateOf: string | null;
}

export interface ClaimQueueItem {
  claimUrl: string;
  codeValue: string | null;
  status: ClaimStatus;
  imageIds: string[];
}

export interface RunnerState {
  delayMs: number;
  currentIndex: number;
  batchStatus: BatchRunnerStatus;
  claimTabOpen: boolean;
}

export interface AppSettings {
  allowedDomains: string[];
  claimUrlTemplate: string;
  codeParamName: string;
  defaultDelay: number;
  soundEnabled: boolean;
  autoSubmit: boolean;
}

export const DEFAULT_SETTINGS: AppSettings = {
  allowedDomains: [],
  claimUrlTemplate: "https://us.zyn.com/ZYNRewards/?serialNumber={CODE}",
  codeParamName: "serialNumber",
  defaultDelay: 4000,
  soundEnabled: false,
  autoSubmit: true,
};

export interface ScanProgress {
  total: number;
  completed: number;
  current: string | null;
  isScanning: boolean;
}
