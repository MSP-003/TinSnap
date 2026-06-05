"use client";

import Link from "next/link";
import { ArrowLeft, ShieldCheck, Eye, HardDrive, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PrivacyPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/">
          <Button variant="ghost" size="icon" className="h-9 w-9">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-xl font-bold">Privacy</h1>
      </div>

      <div className="space-y-6">
        <div className="rounded-lg border bg-card p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10">
              <ShieldCheck className="h-5 w-5 text-success" />
            </div>
            <div>
              <h2 className="font-semibold">Your Privacy Matters</h2>
              <p className="text-xs text-muted-foreground">
                TinSnap is designed with privacy first
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <PrivacyItem
            icon={<Eye className="h-5 w-5 text-primary" />}
            title="Local Processing Only"
            description="All QR code scanning and image processing happens entirely in your browser. No images or data are sent to any server. Your photos never leave your device."
          />

          <PrivacyItem
            icon={<HardDrive className="h-5 w-5 text-primary" />}
            title="On-Device Storage"
            description="Settings, scan results, and claim progress are stored in your browser's local storage. This data stays on your device and can be cleared at any time from the Settings page."
          />

          <PrivacyItem
            icon={<Globe className="h-5 w-5 text-primary" />}
            title="No Account Required"
            description="TinSnap does not require you to create an account, provide an email, or sign in. There is no user tracking, analytics, or telemetry."
          />
        </div>

        <div className="rounded-lg border bg-card p-5 space-y-3">
          <h3 className="font-semibold text-sm">About ZYN Rewards Integration</h3>
          <div className="space-y-2 text-sm text-muted-foreground leading-relaxed">
            <p>
              TinSnap helps you open ZYN Rewards claim links in a separate
              browser tab. It does not:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Collect or store your ZYN Rewards credentials</li>
              <li>Auto-click submit buttons on the ZYN Rewards site</li>
              <li>Bypass any security measures, CAPTCHAs, or rate limits</li>
              <li>Scrape or read data from your ZYN Rewards account</li>
              <li>Interact with the ZYN Rewards page in any automated way</li>
            </ul>
            <p>
              You remain fully in control. TinSnap simply opens the claim URL
              so you can review and submit each claim yourself.
            </p>
          </div>
        </div>

        <div className="rounded-lg border bg-muted/50 p-4 text-xs text-muted-foreground leading-relaxed">
          <p>
            <span className="font-semibold">iOS note:</span> Safari may block
            pop-ups if you have not interacted with TinSnap recently. If the
            claim tab does not open, check your pop-up settings or tap the
            &quot;Open Claim Tab&quot; button directly.
          </p>
        </div>
      </div>
    </div>
  );
}

function PrivacyItem({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex gap-4 rounded-lg border bg-card p-4">
      <div className="mt-0.5 flex-shrink-0">{icon}</div>
      <div>
        <h3 className="font-semibold text-sm">{title}</h3>
        <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
          {description}
        </p>
      </div>
    </div>
  );
}
