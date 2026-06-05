"use client";

import { create } from "zustand";
import {
  TinImageItem,
  ScanResult,
  ClaimQueueItem,
  RunnerState,
  AppSettings,
  ScanProgress,
  ClaimStatus,
  BatchRunnerStatus,
  TERMINAL_CLAIM_STATUSES,
  DEFAULT_SETTINGS,
} from "./types";

interface AppStore {
  items: TinImageItem[];
  results: Record<string, ScanResult>;
  claimQueue: ClaimQueueItem[];
  runner: RunnerState;
  settings: AppSettings;
  scanProgress: ScanProgress;

  addImages: (images: TinImageItem[]) => void;
  removeImage: (id: string) => void;
  clearImages: () => void;

  setScanResult: (imageId: string, result: ScanResult) => void;
  clearResults: () => void;

  buildClaimQueue: () => void;
  updateClaimStatus: (claimUrl: string, status: ClaimStatus) => void;
  replaceClaimQueue: (queue: ClaimQueueItem[]) => void;
  markCurrentClaimed: () => void;
  skipCurrent: () => void;

  setBatchStatus: (status: BatchRunnerStatus) => void;
  setRunnerDelay: (ms: number) => void;
  setRunnerIndex: (index: number) => void;
  setClaimTabOpen: (open: boolean) => void;
  advanceRunner: () => void;

  setScanProgress: (progress: Partial<ScanProgress>) => void;

  updateSettings: (settings: Partial<AppSettings>) => void;

  resetSession: () => void;

  hydrateFromStorage: () => void;
  persistToStorage: () => void;
}

const STORAGE_KEY = "tinsnap-state";

function loadFromStorage(): Partial<AppStore> | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveToStorage(state: Partial<AppStore>) {
  if (typeof window === "undefined") return;
  try {
    const toSave = {
      results: state.results,
      claimQueue: state.claimQueue,
      runner: state.runner,
      settings: state.settings,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
  } catch {
    // Storage full or unavailable
  }
}

export const useAppStore = create<AppStore>((set, get) => ({
  items: [],
  results: {},
  claimQueue: [],
  runner: {
    delayMs: DEFAULT_SETTINGS.defaultDelay,
    currentIndex: 0,
    batchStatus: "idle",
    claimTabOpen: false,
  },
  settings: { ...DEFAULT_SETTINGS },
  scanProgress: {
    total: 0,
    completed: 0,
    current: null,
    isScanning: false,
  },

  addImages: (images) => {
    set((s) => ({ items: [...s.items, ...images] }));
  },

  removeImage: (id) => {
    set((s) => {
      const item = s.items.find((i) => i.id === id);
      if (item) URL.revokeObjectURL(item.objectUrl);
      const newResults = { ...s.results };
      delete newResults[id];
      return {
        items: s.items.filter((i) => i.id !== id),
        results: newResults,
      };
    });
  },

  clearImages: () => {
    const { items } = get();
    items.forEach((item) => URL.revokeObjectURL(item.objectUrl));
    set({ items: [], results: {}, claimQueue: [], scanProgress: { total: 0, completed: 0, current: null, isScanning: false } });
    get().persistToStorage();
  },

  setScanResult: (imageId, result) => {
    set((s) => ({
      results: { ...s.results, [imageId]: result },
    }));
    get().persistToStorage();
  },

  clearResults: () => {
    set({ results: {}, claimQueue: [] });
    get().persistToStorage();
  },

  buildClaimQueue: () => {
    const { results, claimQueue: existing } = get();

    const existingByKey = new Map<string, ClaimQueueItem>();
    existing.forEach((item) => {
      const key = item.codeValue || item.claimUrl;
      existingByKey.set(key, item);
    });

    const seen = new Map<string, ClaimQueueItem>();

    Object.values(results).forEach((r) => {
      if (r.status !== "decoded" || !r.claimUrl) return;

      const key = r.codeValue || r.claimUrl;
      if (seen.has(key)) {
        seen.get(key)!.imageIds.push(r.imageId);
        return;
      }

      const prev = existingByKey.get(key);
      const preservedStatus =
        prev && TERMINAL_CLAIM_STATUSES.has(prev.status) ? prev.status : "pending";

      seen.set(key, {
        claimUrl: r.claimUrl,
        codeValue: r.codeValue,
        status: preservedStatus,
        imageIds: [r.imageId],
      });
    });

    set({ claimQueue: Array.from(seen.values()) });
    get().persistToStorage();
  },

  updateClaimStatus: (claimUrl, status) => {
    set((s) => ({
      claimQueue: s.claimQueue.map((q) =>
        q.claimUrl === claimUrl ? { ...q, status } : q
      ),
    }));
    get().persistToStorage();
  },

  replaceClaimQueue: (queue) => {
    set({ claimQueue: queue });
    get().persistToStorage();
  },

  markCurrentClaimed: () => {
    const { claimQueue, runner } = get();
    const current = claimQueue[runner.currentIndex];
    if (current) {
      get().updateClaimStatus(current.claimUrl, "claimed");
    }
  },

  skipCurrent: () => {
    const { claimQueue, runner } = get();
    const current = claimQueue[runner.currentIndex];
    if (current) {
      get().updateClaimStatus(current.claimUrl, "skipped");
    }
  },

  setBatchStatus: (status) => {
    set((s) => ({ runner: { ...s.runner, batchStatus: status } }));
    get().persistToStorage();
  },

  setRunnerDelay: (ms) => {
    set((s) => ({ runner: { ...s.runner, delayMs: ms } }));
    get().persistToStorage();
  },

  setRunnerIndex: (index) => {
    set((s) => ({ runner: { ...s.runner, currentIndex: index } }));
    get().persistToStorage();
  },

  setClaimTabOpen: (open) => {
    set((s) => ({ runner: { ...s.runner, claimTabOpen: open } }));
  },

  advanceRunner: () => {
    const { runner, claimQueue } = get();
    const next = runner.currentIndex + 1;
    if (next >= claimQueue.length) {
      set((s) => ({ runner: { ...s.runner, batchStatus: "complete" as BatchRunnerStatus, currentIndex: next } }));
    } else {
      set((s) => ({ runner: { ...s.runner, currentIndex: next } }));
    }
    get().persistToStorage();
  },

  setScanProgress: (progress) => {
    set((s) => ({ scanProgress: { ...s.scanProgress, ...progress } }));
  },

  updateSettings: (newSettings) => {
    set((s) => ({ settings: { ...s.settings, ...newSettings } }));
    get().persistToStorage();
  },

  resetSession: () => {
    const { items } = get();
    items.forEach((item) => URL.revokeObjectURL(item.objectUrl));
    set({
      items: [],
      results: {},
      claimQueue: [],
      runner: {
        delayMs: get().settings.defaultDelay,
        currentIndex: 0,
        batchStatus: "idle",
        claimTabOpen: false,
      },
      scanProgress: { total: 0, completed: 0, current: null, isScanning: false },
    });
    get().persistToStorage();
  },

  hydrateFromStorage: () => {
    const saved = loadFromStorage();
    if (!saved) return;

    let runner = saved.runner as RunnerState | undefined;
    if (runner) {
      const raw = runner as unknown as Record<string, unknown>;
      if ("isRunning" in raw || "mode" in raw) {
        runner = {
          delayMs: (raw.delayMs as number) || DEFAULT_SETTINGS.defaultDelay,
          currentIndex: (raw.currentIndex as number) || 0,
          batchStatus: "idle",
          claimTabOpen: false,
        };
      } else {
        runner = { ...runner, batchStatus: "idle", claimTabOpen: false };
      }
    }

    set((s) => ({
      results: (saved.results as Record<string, ScanResult>) || s.results,
      claimQueue: (saved.claimQueue as ClaimQueueItem[]) || s.claimQueue,
      runner: runner || s.runner,
      settings: (saved.settings as AppSettings) || s.settings,
    }));
  },

  persistToStorage: () => {
    const state = get();
    saveToStorage(state);
  },
}));
