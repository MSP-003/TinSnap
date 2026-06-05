"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, ListChecks, Rocket, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ResultsList } from "@/components/results-list";
import { ClaimRunner } from "@/components/claim-runner";
import { useAppStore } from "@/lib/store";

export default function ResultsPage() {
  const results = useAppStore((s) => s.results);
  const resetSession = useAppStore((s) => s.resetSession);
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") || "runner";
  const [tab, setTab] = useState(initialTab);

  const decoded = Object.values(results).filter(
    (r) => r.status === "decoded"
  ).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/">
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-xl font-bold">Results</h1>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={resetSession}
          className="gap-1.5 text-xs text-destructive hover:text-destructive"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Clear Session
        </Button>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="w-full grid grid-cols-2">
          <TabsTrigger value="runner" className="gap-1.5">
            <Rocket className="h-4 w-4" />
            Batch Rewards Runner
            {decoded > 0 && (
              <span className="ml-1 rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-bold text-primary">
                {decoded}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="results" className="gap-1.5">
            <ListChecks className="h-4 w-4" />
            Results
          </TabsTrigger>
        </TabsList>

        <TabsContent value="runner" className="mt-4">
          <ClaimRunner />
        </TabsContent>

        <TabsContent value="results" className="mt-4">
          <ResultsList />
        </TabsContent>
      </Tabs>
    </div>
  );
}
