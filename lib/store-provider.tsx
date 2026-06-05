"use client";

import { useEffect } from "react";
import { useAppStore } from "./store";
import { registerServiceWorker } from "./register-sw";

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const hydrateFromStorage = useAppStore((s) => s.hydrateFromStorage);

  useEffect(() => {
    hydrateFromStorage();
    registerServiceWorker();
  }, [hydrateFromStorage]);

  return <>{children}</>;
}
