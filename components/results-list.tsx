"use client";

import { useState, useMemo } from "react";
import { CircleCheck as CheckCircle2, Copy, ExternalLink, Filter, Download, FileSpreadsheet, Circle as XCircle, TriangleAlert as AlertTriangle, CopyCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAppStore } from "@/lib/store";
import { shortenUrl } from "@/lib/url-utils";
import { ScanResult, ScanStatus } from "@/lib/types";

type FilterOption = "all" | "decoded" | "duplicate" | "invalidDomain" | "notFound" | "error";
type SortOption = "newest" | "status" | "code";

const STATUS_CONFIG: Record<
  ScanStatus,
  { label: string; className: string }
> = {
  decoded: { label: "Decoded", className: "bg-success/15 text-success border-success/30" },
  duplicate: { label: "Duplicate", className: "bg-warning/15 text-warning border-warning/30" },
  invalidDomain: { label: "Invalid", className: "bg-destructive/15 text-destructive border-destructive/30" },
  notFound: { label: "Not Found", className: "bg-muted text-muted-foreground border-border" },
  error: { label: "Error", className: "bg-destructive/15 text-destructive border-destructive/30" },
  pending: { label: "Pending", className: "bg-muted text-muted-foreground border-border" },
  scanning: { label: "Scanning", className: "bg-primary/15 text-primary border-primary/30" },
};

export function ResultsList() {
  const items = useAppStore((s) => s.items);
  const results = useAppStore((s) => s.results);
  const [filter, setFilter] = useState<FilterOption>("all");
  const [sort, setSort] = useState<SortOption>("newest");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const resultsList = useMemo(() => {
    let list = items
      .map((item) => ({
        item,
        result: results[item.id],
      }))
      .filter((r) => r.result);

    if (filter !== "all") {
      list = list.filter((r) => r.result.status === filter);
    }

    list.sort((a, b) => {
      switch (sort) {
        case "newest":
          return b.item.createdAt - a.item.createdAt;
        case "status":
          return a.result.status.localeCompare(b.result.status);
        case "code":
          return (a.result.codeValue || "").localeCompare(
            b.result.codeValue || ""
          );
        default:
          return 0;
      }
    });

    return list;
  }, [items, results, filter, sort]);

  const handleCopy = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // Fallback for older browsers
    }
  };

  const handleExportCsv = () => {
    const decoded = Object.values(results).filter(
      (r) => r.status === "decoded" && r.claimUrl
    );
    const csv = [
      "claimUrl,codeValue",
      ...decoded.map(
        (r) => `"${r.claimUrl || ""}","${r.codeValue || ""}"`
      ),
    ].join("\n");
    downloadFile(csv, "tinsnap-claims.csv", "text/csv");
  };

  const handleExportJson = () => {
    const data = {
      exportedAt: new Date().toISOString(),
      results: Object.values(results),
    };
    downloadFile(
      JSON.stringify(data, null, 2),
      "tinsnap-session.json",
      "application/json"
    );
  };

  const handleExportExcel = async () => {
    try {
      const decoded = Object.values(results).filter(
        (r) => r.status === "decoded" && r.claimUrl
      );
      const ExcelJS = (await import("exceljs")).default;
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet("Claim Codes", {
        views: [{ state: "frozen", ySplit: 2 }],
      });

      ws.columns = [
        { width: 6 },
        { width: 30 },
        { width: 16 },
        { width: 22 },
      ];

      // Row 1: Title
      ws.mergeCells("A1:D1");
      const titleCell = ws.getCell("A1");
      titleCell.value = `TinSnap Rewards Codes (exported ${new Date().toLocaleDateString()})`;
      titleCell.font = { bold: true, size: 16, color: { argb: "FFFFFFFF" } };
      titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F172A" } };
      titleCell.alignment = { horizontal: "left", vertical: "middle" };
      ws.getRow(1).height = 28;

      // Row 2: Headers
      const headers = ["#", "Code", "Status", "Claim Link"];
      const headerRow = ws.getRow(2);
      headers.forEach((h, i) => {
        const cell = headerRow.getCell(i + 1);
        cell.value = h;
        cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E293B" } };
        cell.alignment = { horizontal: "center", vertical: "middle" };
        cell.border = { bottom: { style: "thin", color: { argb: "FF334155" } } };
      });
      headerRow.height = 22;

      // Data rows
      decoded.forEach((r, idx) => {
        const rowNum = idx + 3;
        const row = ws.getRow(rowNum);
        row.height = 20;

        const isZebra = idx % 2 === 1;
        const zebraFill = isZebra
          ? { type: "pattern" as const, pattern: "solid" as const, fgColor: { argb: "FFF1F5F9" } }
          : undefined;

        // Column A: index
        const cellA = row.getCell(1);
        cellA.value = idx + 1;
        cellA.alignment = { horizontal: "center", vertical: "middle" };
        if (zebraFill) cellA.fill = zebraFill;

        // Column B: code
        const cellB = row.getCell(2);
        cellB.value = r.codeValue || "";
        cellB.alignment = { vertical: "middle" };
        if (zebraFill) cellB.fill = zebraFill;

        // Column C: status
        const cellC = row.getCell(3);
        cellC.value = r.status;
        cellC.alignment = { horizontal: "center", vertical: "middle" };
        if (zebraFill) cellC.fill = zebraFill;

        // Column D: hyperlink button
        const cellD = row.getCell(4);
        cellD.value = { text: "Open Claim Page", hyperlink: r.claimUrl! };
        cellD.font = { bold: true, color: { argb: "FFFFFFFF" }, underline: false };
        cellD.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF2563EB" } };
        cellD.alignment = { horizontal: "center", vertical: "middle" };
        cellD.border = {
          top: { style: "thin", color: { argb: "FF1D4ED8" } },
          bottom: { style: "thin", color: { argb: "FF1D4ED8" } },
          left: { style: "thin", color: { argb: "FF1D4ED8" } },
          right: { style: "thin", color: { argb: "FF1D4ED8" } },
        };
      });

      ws.autoFilter = "A2:D2";

      const buffer = await wb.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      downloadBlob(blob, "tinsnap-claims.xlsx");
    } catch (e) {
      console.error("[ResultsList] Excel export failed:", e);
    }
  };

  if (Object.keys(results).length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <XCircle className="h-12 w-12 text-muted-foreground/40 mb-4" />
        <p className="text-lg font-medium text-muted-foreground">
          No results yet
        </p>
        <p className="text-sm text-muted-foreground/70 mt-1">
          Add photos and scan them first
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select
            value={filter}
            onValueChange={(v) => setFilter(v as FilterOption)}
          >
            <SelectTrigger className="h-9 w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="decoded">Decoded</SelectItem>
              <SelectItem value="duplicate">Duplicate</SelectItem>
              <SelectItem value="invalidDomain">Invalid</SelectItem>
              <SelectItem value="notFound">Not Found</SelectItem>
              <SelectItem value="error">Error</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Select
          value={sort}
          onValueChange={(v) => setSort(v as SortOption)}
        >
          <SelectTrigger className="h-9 w-28">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest</SelectItem>
            <SelectItem value="status">Status</SelectItem>
            <SelectItem value="code">Code</SelectItem>
          </SelectContent>
        </Select>

        <div className="ml-auto flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
            className="gap-1.5"
          >
            <Download className="h-3.5 w-3.5" />
            CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportExcel}
            className="gap-1.5"
          >
            <FileSpreadsheet className="h-3.5 w-3.5" />
            Excel
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportJson}
            className="gap-1.5"
          >
            <Download className="h-3.5 w-3.5" />
            JSON
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        {resultsList.map(({ item, result }) => (
          <ResultCard
            key={item.id}
            item={item}
            result={result}
            copiedId={copiedId}
            onCopy={handleCopy}
          />
        ))}
      </div>

      {resultsList.length === 0 && (
        <p className="py-8 text-center text-sm text-muted-foreground">
          No results match the current filter
        </p>
      )}
    </div>
  );
}

function ResultCard({
  item,
  result,
  copiedId,
  onCopy,
}: {
  item: { id: string; objectUrl: string; fileName: string };
  result: ScanResult;
  copiedId: string | null;
  onCopy: (text: string, id: string) => void;
}) {
  const config = STATUS_CONFIG[result.status];

  return (
    <div className="animate-fade-in flex gap-3 rounded-lg border bg-card p-3 transition-colors hover:bg-accent/5">
      <div className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-md bg-muted">
        <img
          src={item.objectUrl}
          alt={item.fileName}
          className="h-full w-full object-cover"
          loading="lazy"
        />
      </div>

      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className={`text-[11px] ${config.className}`}>
            {config.label}
          </Badge>
          <span className="truncate text-xs text-muted-foreground">
            {item.fileName}
          </span>
        </div>

        {result.claimUrl && (
          <p className="truncate text-sm font-mono text-foreground/80">
            {shortenUrl(result.claimUrl)}
          </p>
        )}
        {result.codeValue && (
          <p className="text-xs text-muted-foreground">
            Code: <span className="font-mono font-medium">{result.codeValue}</span>
          </p>
        )}
        {result.errorMessage && (
          <p className="flex items-center gap-1 text-xs text-destructive">
            <AlertTriangle className="h-3 w-3" />
            {result.errorMessage}
          </p>
        )}

        {result.claimUrl && (
          <div className="flex items-center gap-1.5 pt-0.5">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1 px-2 text-xs"
              onClick={() => window.open(result.claimUrl!, "_blank")}
            >
              <ExternalLink className="h-3 w-3" />
              Open
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1 px-2 text-xs"
              onClick={() => onCopy(result.claimUrl!, item.id + "-url")}
            >
              {copiedId === item.id + "-url" ? (
                <CopyCheck className="h-3 w-3 text-success" />
              ) : (
                <Copy className="h-3 w-3" />
              )}
              Link
            </Button>
            {result.codeValue && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 gap-1 px-2 text-xs"
                onClick={() =>
                  onCopy(result.codeValue!, item.id + "-code")
                }
              >
                {copiedId === item.id + "-code" ? (
                  <CopyCheck className="h-3 w-3 text-success" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
                Code
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function downloadFile(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
