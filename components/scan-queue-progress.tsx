"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Loader as Loader2, CircleCheck as CheckCircle2, Circle as XCircle, TriangleAlert as AlertTriangle, Copy as CopyIcon, Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useAppStore } from "@/lib/store";
import { decodeQrFromUrl } from "@/lib/qr-decoder";
import { processQrText } from "@/lib/url-utils";
import { ScanResult } from "@/lib/types";

export function ScanQueueProgress() {
  const router = useRouter();
  const results = useAppStore((s) => s.results);
  const scanProgress = useAppStore((s) => s.scanProgress);

  const seenUrls = useRef(new Set<string>());
  const seenCodes = useRef(new Set<string>());

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      const store = useAppStore.getState();
      const { setScanProgress, setScanResult, buildClaimQueue } = store;

      const toScan = store.items.filter((item) => !store.results[item.id]);

      if (toScan.length === 0) {
        setScanProgress({ isScanning: false });
        buildClaimQueue();
        return;
      }

      seenUrls.current.clear();
      seenCodes.current.clear();

      Object.values(store.results).forEach((r) => {
        if (r.status === "decoded") {
          if (r.claimUrl) seenUrls.current.add(r.claimUrl);
          if (r.codeValue) seenCodes.current.add(r.codeValue);
        }
      });

      console.log(`[BatchScan] batch started with ${toScan.length} items`);

      setScanProgress({
        total: toScan.length,
        completed: 0,
        isScanning: true,
        current: null,
      });

      for (let i = 0; i < toScan.length; i++) {
        if (cancelled) {
          console.log(`[BatchScan] cancelled at item ${i + 1}`);
          break;
        }

        const item = toScan[i];
        console.log(`[BatchScan] processing item ${i + 1} of ${toScan.length}: ${item.fileName}`);

        try {
          const decodeResult = await decodeQrFromUrl(item.objectUrl);

          if (cancelled) break;

          const settings = useAppStore.getState().settings;
          let result: ScanResult;

          if (decodeResult.error) {
            result = {
              imageId: item.id,
              rawText: null,
              claimUrl: null,
              codeValue: null,
              status: "error",
              errorMessage: decodeResult.error,
              isProcessed: false,
              duplicateOf: null,
            };
          } else if (!decodeResult.success || !decodeResult.data) {
            result = {
              imageId: item.id,
              rawText: null,
              claimUrl: null,
              codeValue: null,
              status: "notFound",
              errorMessage: null,
              isProcessed: false,
              duplicateOf: null,
            };
          } else {
            const { claimUrl, codeValue, isValidDomain } = processQrText(
              decodeResult.data,
              settings
            );

            if (!isValidDomain) {
              result = {
                imageId: item.id,
                rawText: decodeResult.data,
                claimUrl,
                codeValue,
                status: "invalidDomain",
                errorMessage: null,
                isProcessed: false,
                duplicateOf: null,
              };
            } else if (
              (claimUrl && seenUrls.current.has(claimUrl)) ||
              (codeValue && seenCodes.current.has(codeValue))
            ) {
              result = {
                imageId: item.id,
                rawText: decodeResult.data,
                claimUrl,
                codeValue,
                status: "duplicate",
                errorMessage: null,
                isProcessed: false,
                duplicateOf: claimUrl,
              };
            } else {
              if (claimUrl) seenUrls.current.add(claimUrl);
              if (codeValue) seenCodes.current.add(codeValue);
              result = {
                imageId: item.id,
                rawText: decodeResult.data,
                claimUrl,
                codeValue,
                status: "decoded",
                errorMessage: null,
                isProcessed: false,
                duplicateOf: null,
              };
            }
          }

          setScanResult(item.id, result);
          const prog = useAppStore.getState().scanProgress;
          setScanProgress({ completed: prog.completed + 1 });
          console.log(`[BatchScan] decode finished for item ${i + 1}: ${item.fileName} -> ${result.status}`);
        } catch {
          if (cancelled) break;
          setScanResult(item.id, {
            imageId: item.id,
            rawText: null,
            claimUrl: null,
            codeValue: null,
            status: "error",
            errorMessage: "Processing failed (memory limit)",
            isProcessed: false,
            duplicateOf: null,
          });
          const prog = useAppStore.getState().scanProgress;
          setScanProgress({ completed: prog.completed + 1 });
          console.log(`[BatchScan] error for item ${i + 1}: ${item.fileName}`);
        }

        if (i < toScan.length - 1 && !cancelled) {
          await new Promise((r) => setTimeout(r, 250));
        }
      }

      if (!cancelled) {
        console.log(`[BatchScan] batch completed`);
        setScanProgress({ isScanning: false, current: null });
        buildClaimQueue();
      }
    };

    run();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCancel = () => {
    const { setScanProgress, buildClaimQueue } = useAppStore.getState();
    setScanProgress({ isScanning: false });
    buildClaimQueue();
  };

  const percent =
    scanProgress.total > 0
      ? Math.round((scanProgress.completed / scanProgress.total) * 100)
      : 0;

  const decoded = Object.values(results).filter(
    (r) => r.status === "decoded"
  ).length;
  const duplicates = Object.values(results).filter(
    (r) => r.status === "duplicate"
  ).length;
  const notFound = Object.values(results).filter(
    (r) => r.status === "notFound"
  ).length;
  const invalidDomain = Object.values(results).filter(
    (r) => r.status === "invalidDomain"
  ).length;
  const errors = Object.values(results).filter(
    (r) => r.status === "error"
  ).length;
  const failed = notFound + invalidDomain + errors;

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Scanning Photos</h2>
          {scanProgress.isScanning &&
            scanProgress.completed < scanProgress.total && (
              <span className="text-sm font-medium text-muted-foreground">
                Scanning {scanProgress.completed + 1} of {scanProgress.total}
              </span>
            )}
        </div>

        <Progress value={percent} className="h-3" />

        {scanProgress.isScanning && scanProgress.current && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="truncate">Scanning: {scanProgress.current}</span>
          </div>
        )}

        {!scanProgress.isScanning && scanProgress.completed > 0 && (
          <div className="rounded-lg border-2 border-success/30 bg-success/5 p-4">
            <p className="text-sm font-semibold text-success">
              Scan complete: {decoded} decoded
              {duplicates > 0
                ? `, ${duplicates} duplicate${duplicates !== 1 ? "s" : ""}`
                : ""}
              {failed > 0 ? `, ${failed} failed` : ""}
            </p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          icon={<CheckCircle2 className="h-5 w-5 text-success" />}
          label="Decoded"
          value={decoded}
        />
        <StatCard
          icon={<CopyIcon className="h-5 w-5 text-warning" />}
          label="Duplicates"
          value={duplicates}
        />
        <StatCard
          icon={<XCircle className="h-5 w-5 text-muted-foreground" />}
          label="No QR Found"
          value={notFound}
        />
        <StatCard
          icon={<AlertTriangle className="h-5 w-5 text-destructive" />}
          label="Errors"
          value={errors + invalidDomain}
        />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        {scanProgress.isScanning ? (
          <Button
            onClick={handleCancel}
            variant="destructive"
            className="flex-1 h-12"
          >
            Cancel Scan
          </Button>
        ) : (
          <>
            {decoded > 0 && (
              <Button
                onClick={() => router.push("/results")}
                className="flex-1 h-12 text-base font-semibold gap-2"
              >
                <Rocket className="h-4 w-4" />
                Open Batch Rewards Runner ({decoded})
              </Button>
            )}
            <Button
              onClick={() => router.push("/results?tab=results")}
              variant={decoded > 0 ? "outline" : "default"}
              className="flex-1 h-12 text-base font-semibold"
            >
              View All Results
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border bg-card p-3">
      {icon}
      <div>
        <p className="text-xl font-bold leading-none">{value}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
      </div>
    </div>
  );
}
