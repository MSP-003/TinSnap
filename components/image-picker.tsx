"use client";

import { useCallback, useRef, useState } from "react";
import { ImagePlus, Camera, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/lib/store";
import { generateId, isHeic, convertHeicToJpeg } from "@/lib/image-utils";
import { TinImageItem } from "@/lib/types";

export function ImagePicker() {
  const addImages = useAppStore((s) => s.addImages);
  const items = useAppStore((s) => s.items);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [converting, setConverting] = useState(false);
  const [heicError, setHeicError] = useState<string | null>(null);

  const processFiles = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return;
      setHeicError(null);

      const newItems: TinImageItem[] = [];
      const heicFiles: File[] = [];
      const regularFiles: File[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (isHeic(file)) {
          heicFiles.push(file);
        } else if (file.type.startsWith("image/")) {
          regularFiles.push(file);
        }
      }

      for (const file of regularFiles) {
        const objectUrl = URL.createObjectURL(file);
        newItems.push({
          id: generateId(),
          fileName: file.name,
          fileSize: file.size,
          createdAt: Date.now(),
          objectUrl,
        });
      }

      if (heicFiles.length > 0) {
        setConverting(true);
        for (const file of heicFiles) {
          try {
            const jpegBlob = await convertHeicToJpeg(file);
            const objectUrl = URL.createObjectURL(jpegBlob);
            newItems.push({
              id: generateId(),
              fileName: file.name.replace(/\.heic$/i, ".jpg"),
              fileSize: jpegBlob.size,
              createdAt: Date.now(),
              objectUrl,
            });
          } catch {
            setHeicError(
              `Could not convert "${file.name}". On iOS, go to Settings > Camera > Formats and select "Most Compatible" to save as JPEG. Or share photos to Files first, which may auto-convert them.`
            );
          }
        }
        setConverting(false);
      }

      if (newItems.length > 0) {
        addImages(newItems);
      }
    },
    [addImages]
  );

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleCameraCapture = () => {
    cameraInputRef.current?.click();
  };

  return (
    <div className="space-y-4">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,.heic,.heif"
        multiple
        className="hidden"
        onChange={(e) => {
          processFiles(e.target.files);
          e.target.value = "";
        }}
        aria-label="Select photos from device"
      />

      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          processFiles(e.target.files);
          e.target.value = "";
        }}
        aria-label="Take photo with camera"
      />

      <div className="flex flex-col gap-3 sm:flex-row">
        <Button
          onClick={handleFileSelect}
          size="lg"
          className="flex-1 gap-2 text-base font-semibold h-14"
          disabled={converting}
        >
          {converting ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <ImagePlus className="h-5 w-5" />
          )}
          {converting ? "Converting HEIC..." : "Add Photos"}
        </Button>
        <Button
          onClick={handleCameraCapture}
          variant="outline"
          size="lg"
          className="flex-1 gap-2 text-base h-14"
          disabled={converting}
        >
          <Camera className="h-5 w-5" />
          Use Camera
        </Button>
      </div>

      {heicError && (
        <div className="animate-fade-in flex gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">HEIC conversion failed</p>
            <p className="text-xs mt-1 text-destructive/80">{heicError}</p>
          </div>
        </div>
      )}

      {items.length > 0 && (
        <div className="animate-fade-in rounded-lg bg-primary/5 border border-primary/20 px-4 py-3">
          <p className="text-sm font-medium text-primary">
            {items.length} {items.length === 1 ? "photo" : "photos"} ready to
            scan
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {(
              items.reduce((sum, i) => sum + i.fileSize, 0) /
              (1024 * 1024)
            ).toFixed(1)}{" "}
            MB total
          </p>
        </div>
      )}
    </div>
  );
}
