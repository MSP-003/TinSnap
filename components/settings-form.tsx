"use client";

import { useState } from "react";
import { Save, RotateCcw, Plus, X, Puzzle, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useAppStore } from "@/lib/store";
import { DEFAULT_SETTINGS } from "@/lib/types";

export function SettingsForm() {
  const settings = useAppStore((s) => s.settings);
  const updateSettings = useAppStore((s) => s.updateSettings);

  const [domains, setDomains] = useState(settings.allowedDomains.join(", "));
  const [template, setTemplate] = useState(settings.claimUrlTemplate);
  const [paramName, setParamName] = useState(settings.codeParamName);
  const [delay, setDelay] = useState(settings.defaultDelay / 1000);
  const [sound, setSound] = useState(settings.soundEnabled);
  const [saved, setSaved] = useState(false);
  const [newDomain, setNewDomain] = useState("");

  const parsedDomains = domains
    .split(",")
    .map((d) => d.trim())
    .filter(Boolean);

  const handleSave = () => {
    updateSettings({
      allowedDomains: parsedDomains,
      claimUrlTemplate: template,
      codeParamName: paramName,
      defaultDelay: delay * 1000,
      soundEnabled: sound,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleReset = () => {
    setDomains(DEFAULT_SETTINGS.allowedDomains.join(", "));
    setTemplate(DEFAULT_SETTINGS.claimUrlTemplate);
    setParamName(DEFAULT_SETTINGS.codeParamName);
    setDelay(DEFAULT_SETTINGS.defaultDelay / 1000);
    setSound(DEFAULT_SETTINGS.soundEnabled);
    updateSettings({ ...DEFAULT_SETTINGS });
  };

  const addDomain = () => {
    if (!newDomain.trim()) return;
    const updated = [...parsedDomains, newDomain.trim()];
    setDomains(updated.join(", "));
    setNewDomain("");
  };

  const removeDomain = (index: number) => {
    const updated = parsedDomains.filter((_, i) => i !== index);
    setDomains(updated.join(", "));
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div>
          <Label className="text-sm font-semibold">Allowed Domains</Label>
          <p className="text-xs text-muted-foreground mt-0.5 mb-3">
            Restrict QR results to specific domains. Leave empty to accept all domains.
          </p>
          <div className="space-y-2">
            {parsedDomains.map((d, i) => (
              <div
                key={i}
                className="flex items-center gap-2 rounded-md border bg-muted/50 px-3 py-2"
              >
                <span className="flex-1 font-mono text-sm">{d}</span>
                <button
                  onClick={() => removeDomain(i)}
                  className="text-muted-foreground hover:text-destructive transition-colors"
                  aria-label={`Remove ${d}`}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
            {parsedDomains.length === 0 && (
              <p className="text-xs text-success font-medium py-1">
                All domains accepted (no restriction)
              </p>
            )}
            <div className="flex gap-2">
              <Input
                value={newDomain}
                onChange={(e) => setNewDomain(e.target.value)}
                placeholder="e.g. us.zyn.com"
                className="flex-1"
                onKeyDown={(e) => e.key === "Enter" && addDomain()}
              />
              <Button variant="outline" size="sm" onClick={addDomain} className="gap-1">
                <Plus className="h-4 w-4" />
                Add
              </Button>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="template" className="text-sm font-semibold">
            Claim URL Template
          </Label>
          <p className="text-xs text-muted-foreground">
            Used when QR contains a code instead of a full URL. Use {"{CODE}"}{" "}
            as placeholder.
          </p>
          <Input
            id="template"
            value={template}
            onChange={(e) => setTemplate(e.target.value)}
            className="font-mono text-sm"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="param" className="text-sm font-semibold">
            Code Parameter Name
          </Label>
          <p className="text-xs text-muted-foreground">
            The URL query parameter that contains the claim code
          </p>
          <Input
            id="param"
            value={paramName}
            onChange={(e) => setParamName(e.target.value)}
            className="font-mono text-sm w-40"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="delay" className="text-sm font-semibold">
            Default Timer Delay
          </Label>
          <p className="text-xs text-muted-foreground">
            Seconds between each claim in timed mode
          </p>
          <Input
            id="delay"
            type="number"
            min={2}
            max={15}
            step={0.5}
            value={delay}
            onChange={(e) => setDelay(parseFloat(e.target.value) || 4)}
            className="w-24"
          />
        </div>

        <div className="flex items-center justify-between rounded-lg border p-4">
          <div>
            <Label htmlFor="sound" className="text-sm font-semibold cursor-pointer">
              Sound on Decode
            </Label>
            <p className="text-xs text-muted-foreground mt-0.5">
              Play a sound when a QR code is successfully decoded
            </p>
          </div>
          <Switch
            id="sound"
            checked={sound}
            onCheckedChange={setSound}
          />
        </div>

        <div className="rounded-lg border p-4 space-y-4">
          <div className="flex items-center gap-2">
            <Puzzle className="h-4 w-4 text-muted-foreground" />
            <Label className="text-sm font-semibold">Chrome Extension</Label>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Install the TinSnap Auto-Submit extension to automatically enter and
            submit codes on the ZYN Rewards page.
          </p>
          <a
            href="/api/download-extension"
            className="inline-flex items-center gap-2 rounded-md bg-teal-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-teal-700 active:bg-teal-800"
          >
            <Download className="h-4 w-4" />
            Download Extension (.zip)
          </a>
          <div className="space-y-2">
            <p className="text-xs font-semibold text-foreground">Installation steps:</p>
            <ol className="text-xs text-muted-foreground leading-relaxed list-decimal list-inside space-y-1.5">
              <li>Click the button above to download the ZIP file</li>
              <li>Unzip the downloaded file to a folder on your computer</li>
              <li>
                Open{" "}
                <span className="font-mono text-foreground">chrome://extensions</span>{" "}
                in Chrome
              </li>
              <li>Enable <span className="font-semibold text-foreground">Developer mode</span> (toggle in the top-right corner)</li>
              <li>Click <span className="font-semibold text-foreground">Load unpacked</span> and select the unzipped folder</li>
            </ol>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Once installed, toggle &quot;Auto-submit with extension&quot; in the Claim Runner to activate it.
          </p>
        </div>
      </div>

      <div className="flex gap-3">
        <Button onClick={handleSave} className="flex-1 h-11 gap-2">
          <Save className="h-4 w-4" />
          {saved ? "Saved!" : "Save Settings"}
        </Button>
        <Button onClick={handleReset} variant="outline" className="h-11 gap-2">
          <RotateCcw className="h-4 w-4" />
          Reset
        </Button>
      </div>
    </div>
  );
}
