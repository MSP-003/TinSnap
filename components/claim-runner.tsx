"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import {
  Play,
  Pause,
  SkipForward,
  CircleCheck as CheckCircle2,
  ExternalLink,
  CircleAlert as AlertCircle,
  LogIn,
  Zap,
  Puzzle,
  ChevronDown,
  Ban,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useAppStore } from "@/lib/store";
import { shortenUrl } from "@/lib/url-utils";
import { ClaimStatus } from "@/lib/types";

function encodeQueue(codes: string[], delayMs: number): string {
  const payload = JSON.stringify({ codes, delayMs });
  return btoa(payload).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function buildFirstUrl(allCodes: string[], delayMs: number): string {
  const firstCode = allCodes[0];
  const remaining = allCodes.slice(1);
  const hash = encodeQueue(remaining, delayMs);
  return `https://us.zyn.com/ZYNRewards/?serialNumber=${encodeURIComponent(firstCode)}#tinsnap=${hash}`;
}

export function ClaimRunner() {
  const claimQueue = useAppStore((s) => s.claimQueue);
  const runner = useAppStore((s) => s.runner);
  const settings = useAppStore((s) => s.settings);
  const updateSettings = useAppStore((s) => s.updateSettings);

  const claimTabRef = useRef<Window | null>(null);
  const mountedRef = useRef(true);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (!mountedRef.current) return;
      const data = event.data;
      if (!data || !data.type) return;

      const store = useAppStore.getState();

      if (data.type === "TINSNAP_CLAIM_DONE") {
        const outcome = data.outcome || "claimed";
        const code = data.code;
        const mapped: ClaimStatus =
          outcome === "claimed"
            ? "claimed"
            : outcome === "already_claimed"
              ? "already_claimed"
              : outcome === "skipped"
                ? "skipped"
                : "failed";

        const item = store.claimQueue.find(
          (q) => q.codeValue === code || q.claimUrl.includes(code)
        );
        if (item) {
          store.updateClaimStatus(item.claimUrl, mapped);
        }

        const currentIdx = store.runner.currentIndex;
        store.setRunnerIndex(currentIdx + 1);
      }

      if (data.type === "TINSNAP_BATCH_COMPLETE") {
        store.setBatchStatus("complete");
        store.setClaimTabOpen(false);
      }
    };

    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  useEffect(() => {
    if (runner.batchStatus !== "running") return;

    pollRef.current = setInterval(() => {
      if (claimTabRef.current && claimTabRef.current.closed) {
        claimTabRef.current = null;
        const store = useAppStore.getState();
        store.setClaimTabOpen(false);

        const queue = store.claimQueue;
        const allDone = queue.every(
          (q) => q.status !== "pending" && q.status !== "inProgress"
        );

        if (allDone || store.runner.currentIndex >= queue.length) {
          store.setBatchStatus("complete");
        } else {
          const remaining = queue.filter(
            (q) => q.status === "pending" || q.status === "inProgress"
          );
          remaining.forEach((q) => store.updateClaimStatus(q.claimUrl, "claimed"));
          store.setBatchStatus("complete");
        }
      }
    }, 1000);

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [runner.batchStatus]);

  const startBatch = () => {
    const store = useAppStore.getState();
    const queue = store.claimQueue;

    const pendingCodes: string[] = [];
    let firstPendingIdx = -1;
    for (let i = 0; i < queue.length; i++) {
      if (queue[i].status === "pending" || queue[i].status === "inProgress") {
        if (firstPendingIdx === -1) firstPendingIdx = i;
        const code =
          queue[i].codeValue ||
          new URL(queue[i].claimUrl).searchParams.get("serialNumber") ||
          "";
        if (code) pendingCodes.push(code);
      }
    }

    if (pendingCodes.length === 0) {
      store.setBatchStatus("complete");
      return;
    }

    store.setRunnerIndex(firstPendingIdx);
    store.setBatchStatus("running");
    store.updateClaimStatus(queue[firstPendingIdx].claimUrl, "inProgress");

    const url = buildFirstUrl(pendingCodes, store.runner.delayMs);
    const w = window.open(url, "tinsnap-claim");
    if (w) {
      claimTabRef.current = w;
      store.setClaimTabOpen(true);
    } else {
      store.setBatchStatus("idle");
      store.updateClaimStatus(queue[firstPendingIdx].claimUrl, "pending");
    }
  };

  const openLoginPage = () => {
    window.open("https://us.zyn.com/ZYNRewards/", "_blank");
  };

  const claimedCount = claimQueue.filter((q) => q.status === "claimed").length;
  const alreadyClaimedCount = claimQueue.filter(
    (q) => q.status === "already_claimed"
  ).length;
  const skippedCount = claimQueue.filter((q) => q.status === "skipped").length;
  const failedCount = claimQueue.filter((q) => q.status === "failed").length;
  const pendingCount = claimQueue.filter((q) => q.status === "pending").length;
  const inProgressCount = claimQueue.filter(
    (q) => q.status === "inProgress"
  ).length;
  const processedCount =
    claimedCount + alreadyClaimedCount + skippedCount + failedCount;
  const progressPercent =
    claimQueue.length > 0
      ? Math.round((processedCount / claimQueue.length) * 100)
      : 0;

  const current = claimQueue[runner.currentIndex];
  const isRunning = runner.batchStatus === "running";
  const isPaused = runner.batchStatus === "paused";
  const isComplete = runner.batchStatus === "complete";
  const isIdle = runner.batchStatus === "idle";

  if (claimQueue.length === 0) {
    return (
      <div className="rounded-lg border bg-card p-6 text-center">
        <p className="text-sm text-muted-foreground">
          No claim links available. Scan your photos first.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="rounded-lg border-2 border-primary/30 bg-primary/5 p-4 space-y-1">
        <h2 className="text-base font-semibold text-primary">
          Batch Rewards Claim Runner
        </h2>
        <p className="text-sm text-muted-foreground">
          Log in to ZYN Rewards first, then tap Start Auto Claim. The
          extension will process all {claimQueue.length} code
          {claimQueue.length !== 1 ? "s" : ""} in a single tab automatically.
        </p>
      </div>

      {isIdle && (
        <div className="rounded-lg border bg-card p-4 space-y-3">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <LogIn className="h-4 w-4" />
            Step 1: ZYN Rewards Login
          </h3>
          <ol className="space-y-1.5 text-sm text-muted-foreground list-decimal pl-5">
            <li>Open ZYN Rewards and log in with your account</li>
            <li>Return here and start the batch runner below</li>
          </ol>
          <Button
            variant="outline"
            size="sm"
            onClick={openLoginPage}
            className="gap-1.5"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Open ZYN Rewards Login
          </Button>
        </div>
      )}

      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">
            {isRunning
              ? `Processing ${Math.min(runner.currentIndex + 1, claimQueue.length)} of ${claimQueue.length}`
              : `${processedCount} of ${claimQueue.length} processed`}
          </span>
          <span className="text-muted-foreground">{progressPercent}%</span>
        </div>
        <Progress value={progressPercent} className="h-2" />
        {(isRunning || isPaused || isComplete) && (
          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
            <span>
              Claimed:{" "}
              <strong className="text-success">{claimedCount}</strong>
            </span>
            {alreadyClaimedCount > 0 && (
              <span>
                Already Claimed:{" "}
                <strong className="text-warning">{alreadyClaimedCount}</strong>
              </span>
            )}
            <span>
              Skipped: <strong>{skippedCount}</strong>
            </span>
            <span>
              Failed:{" "}
              <strong className="text-destructive">{failedCount}</strong>
            </span>
            <span>
              Remaining:{" "}
              <strong>{pendingCount + inProgressCount}</strong>
            </span>
          </div>
        )}
      </div>

      {isComplete && (
        <div className="rounded-lg border-2 border-success/30 bg-success/5 p-6 text-center space-y-1">
          <CheckCircle2 className="h-8 w-8 text-success mx-auto mb-2" />
          <p className="font-semibold">Batch Complete</p>
          <p className="text-sm text-muted-foreground">
            Claimed {claimedCount}
            {alreadyClaimedCount > 0
              ? `, ${alreadyClaimedCount} already claimed`
              : ""}
            {skippedCount > 0 ? `, skipped ${skippedCount}` : ""}
            {failedCount > 0 ? `, ${failedCount} failed` : ""}
          </p>
        </div>
      )}

      {current && !isComplete && !isIdle && runner.currentIndex < claimQueue.length && (
        <div className="rounded-lg border-2 border-primary/30 bg-primary/5 p-4 space-y-2">
          <div className="flex items-center justify-between">
            <Badge className="bg-primary/15 text-primary border-primary/30">
              #{runner.currentIndex + 1}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {isRunning ? "Processing..." : isPaused ? "Paused" : ""}
            </span>
          </div>
          <p className="font-mono text-sm break-all">
            {shortenUrl(current.claimUrl, 60)}
          </p>
          {current.codeValue && (
            <p className="text-xs text-muted-foreground">
              Code:{" "}
              <span className="font-mono font-medium">
                {current.codeValue}
              </span>
            </p>
          )}
        </div>
      )}

      {isRunning && (
        <div className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm text-primary">
          <Zap className="h-4 w-4 flex-shrink-0 animate-pulse" />
          Auto-claiming in progress. Do not close the claim tab.
        </div>
      )}

      {!isComplete && (
        <div className="flex flex-col gap-2 sm:flex-row">
          {isIdle && (
            <Button
              onClick={startBatch}
              className="flex-1 h-12 gap-2 text-base font-semibold"
            >
              <Zap className="h-4 w-4" />
              Start Auto Claim
            </Button>
          )}
          {isRunning && (
            <p className="text-xs text-muted-foreground text-center py-2">
              The extension is processing codes in the claim tab. When
              finished, the tab will close automatically.
            </p>
          )}
        </div>
      )}

      {isIdle && (
        <div className="space-y-3">
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div className="flex items-center gap-2 min-w-0">
              <Puzzle className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-medium">Chrome Extension Required</p>
                <p className="text-xs text-muted-foreground">
                  Install the TinSnap extension from{" "}
                  <Link
                    href="/settings"
                    className="text-primary underline underline-offset-2"
                  >
                    Settings
                  </Link>{" "}
                  for auto-claiming to work.
                </p>
              </div>
            </div>
            <Switch
              checked={settings.autoSubmit}
              onCheckedChange={(checked) =>
                updateSettings({ autoSubmit: checked })
              }
            />
          </div>
        </div>
      )}

      {isIdle && (
        <Collapsible>
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 text-xs text-muted-foreground w-full justify-start"
            >
              <ChevronDown className="h-3.5 w-3.5" />
              Advanced Options
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-3 pt-2">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  Delay between claims
                </span>
                <span className="font-medium">
                  {runner.delayMs / 1000}s
                </span>
              </div>
              <Slider
                value={[runner.delayMs]}
                onValueChange={([v]) =>
                  useAppStore.getState().setRunnerDelay(v)
                }
                min={2000}
                max={15000}
                step={500}
                className="w-full"
              />
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}

      <div className="space-y-1.5 max-h-60 overflow-y-auto">
        {claimQueue.map((q, i) => (
          <div
            key={q.claimUrl}
            className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors ${
              i === runner.currentIndex && !isComplete
                ? "bg-primary/10 border border-primary/20"
                : ""
            }`}
          >
            <span className="w-6 text-xs text-muted-foreground text-right">
              {i + 1}
            </span>
            <span className="flex-1 truncate font-mono text-xs">
              {shortenUrl(q.claimUrl, 35)}
            </span>
            {q.status === "claimed" && (
              <CheckCircle2 className="h-4 w-4 text-success flex-shrink-0" />
            )}
            {q.status === "already_claimed" && (
              <Ban className="h-4 w-4 text-warning flex-shrink-0" />
            )}
            {q.status === "skipped" && (
              <SkipForward className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            )}
            {q.status === "failed" && (
              <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0" />
            )}
            {q.status === "inProgress" && (
              <Badge
                variant="outline"
                className="text-[10px] h-5 bg-primary/10 text-primary border-primary/20"
              >
                Active
              </Badge>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
