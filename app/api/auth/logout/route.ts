import { NextResponse } from "next/server";
import { clearAuthSession } from "@/src/platform/auth/server";

export async function POST() {
  const response = NextResponse.json({ success: true });
  clearAuthSession(response);
  return response;
}