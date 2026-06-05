"use client";

import { X } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { formatFileSize } from "@/lib/image-utils";

export function ImageGrid() {
  const items = useAppStore((s) => s.items);
  const removeImage = useAppStore((s) => s.removeImage);

  if (items.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">
          Queued Photos
        </h3>
        <span className="text-xs text-muted-foreground">
          {items.length} {items.length === 1 ? "photo" : "photos"}
        </span>
      </div>
      <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
        {items.map((item) => (
          <div
            key={item.id}
            className="animate-fade-in group relative aspect-square overflow-hidden rounded-lg border border-border bg-muted"
          >
            <img
              src={item.objectUrl}
              alt={item.fileName}
              className="h-full w-full object-cover"
              loading="lazy"
            />
            <button
              onClick={() => removeImage(item.id)}
              className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-opacity group-hover:opacity-100 active:opacity-100"
              aria-label={`Remove ${item.fileName}`}
            >
              <X className="h-3.5 w-3.5" />
            </button>
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 to-transparent px-1 pb-1 pt-3">
              <p className="truncate text-[10px] text-white/90">
                {formatFileSize(item.fileSize)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
