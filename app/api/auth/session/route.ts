import { NextRequest, NextResponse } from "next/server";
import { applyAuthSession, clearAuthSession, readAuthSession, refreshAuthSession } from "@/src/platform/auth/server";

export async function GET(request: NextRequest) {
  const session = readAuthSession(request);
  if (!session) {
    const response = NextResponse.json({ authenticated: false });
    clearAuthSession(response);
    return response;
  }

  const refreshedSession = refreshAuthSession(session);
  const response = NextResponse.json({
    authenticated: true,
    session: refreshedSession,
  });

  applyAuthSession(response, refreshedSession);
  return response;
}