import { NextResponse } from "next/server";
import { getMiniAppManifest } from "../_shared/manifest";

export function GET() {
  return NextResponse.json(getMiniAppManifest());
}