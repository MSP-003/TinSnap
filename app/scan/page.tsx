"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScanQueueProgress } from "@/components/scan-queue-progress";
import { useAppStore } from "@/lib/store";

export default function ScanPage() {
  const items = useAppStore((s) => s.items);

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
        <p className="text-lg font-medium text-muted-foreground">
          No photos to scan
        </p>
        <p className="text-sm text-muted-foreground/70">
          Go back and add some photos first.
        </p>
        <Link href="/">
          <Button variant="outline" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/">
          <Button variant="ghost" size="icon" className="h-9 w-9">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-xl font-bold">Scanning</h1>
      </div>

      <ScanQueueProgress />
    </div>
  );
}
