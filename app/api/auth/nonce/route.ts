import { NextResponse } from "next/server";
import { issueAuthNonce } from "@/src/platform/auth/server";

export async function GET() {
  return NextResponse.json({ nonce: issueAuthNonce() });
}