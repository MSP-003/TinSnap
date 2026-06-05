"use client";

import Link from "next/link";
import {
  ScanLine,
  ArrowRight,
  Trash2,
  ShieldCheck,
  Zap,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ImagePicker } from "@/components/image-picker";
import { ImageGrid } from "@/components/image-grid";
import { useAppStore } from "@/lib/store";

export default function HomePage() {
  const items = useAppStore((s) => s.items);
  const clearImages = useAppStore((s) => s.clearImages);

  return (
    <div className="space-y-8">
      <section className="space-y-3 text-center pt-4">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
          <ScanLine className="h-8 w-8 text-primary" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          TinSnap Claim Helper
        </h1>
        <p className="mx-auto max-w-md text-sm text-muted-foreground leading-relaxed">
          Batch scan QR codes from your Zintin photos, then process each Zim
          Rewards claim link quickly and easily.
        </p>
      </section>

      <section className="space-y-4">
        <ImagePicker />
        <ImageGrid />

        {items.length > 0 && (
          <div className="flex flex-col gap-2 sm:flex-row animate-slide-up">
            <Link href="/scan" className="flex-1">
              <Button className="w-full h-12 gap-2 text-base font-semibold">
                Scan {items.length} {items.length === 1 ? "Photo" : "Photos"}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Button
              variant="outline"
              onClick={clearImages}
              className="h-12 gap-2 text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
              Clear All
            </Button>
          </div>
        )}
      </section>

      {items.length === 0 && (
        <section className="space-y-4">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            How it works
          </h2>
          <div className="grid gap-3 sm:grid-cols-3">
            <FeatureCard
              icon={<Layers className="h-5 w-5 text-primary" />}
              title="1. Add Photos"
              description="Upload photos of your Zintins or snap them with your camera."
            />
            <FeatureCard
              icon={<Zap className="h-5 w-5 text-primary" />}
              title="2. Auto Scan"
              description="TinSnap decodes QR codes, deduplicates, and validates links."
            />
            <FeatureCard
              icon={<ShieldCheck className="h-5 w-5 text-primary" />}
              title="3. Claim"
              description="Process each link one by one. You stay in control."
            />
          </div>
        </section>
      )}

      <section className="rounded-lg border bg-card p-4 text-xs text-muted-foreground leading-relaxed">
        <p>
          <span className="font-semibold text-foreground">Privacy note:</span>{" "}
          All image processing happens locally in your browser. No photos are
          uploaded to any server. Your claim data is stored only on this device.
        </p>
      </section>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-lg border bg-card p-4 space-y-2">
      {icon}
      <h3 className="text-sm font-semibold">{title}</h3>
      <p className="text-xs text-muted-foreground leading-relaxed">
        {description}
      </p>
    </div>
  );
}
