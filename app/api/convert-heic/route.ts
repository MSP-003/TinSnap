import { NextResponse } from "next/server";

export const runtime = "nodejs";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const convert = require("heic-convert") as (opts: {
  buffer: Buffer;
  format: "JPEG" | "PNG";
  quality: number;
}) => Promise<Buffer>;

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const inputBuffer = Buffer.from(arrayBuffer);

    const outputBuffer = await convert({
      buffer: inputBuffer,
      format: "JPEG",
      quality: 0.92,
    });

    return new NextResponse(outputBuffer, {
      status: 200,
      headers: {
        "Content-Type": "image/jpeg",
        "Content-Disposition": "inline",
      },
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Conversion failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
