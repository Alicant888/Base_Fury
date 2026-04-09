import { NextRequest, NextResponse } from "next/server";
import { isAddress, isAddressEqual, type Address } from "viem";
import {
  applyAuthSession,
  createPaymasterAuthToken,
  readAuthSession,
  refreshAuthSession,
} from "@/src/platform/auth/server";

export async function GET(request: NextRequest) {
  const session = readAuthSession(request);
  if (!session) {
    return NextResponse.json({ message: "Authentication required" }, { status: 401 });
  }

  const requestedAddress = request.nextUrl.searchParams.get("address");
  if (requestedAddress) {
    if (!isAddress(requestedAddress)) {
      return NextResponse.json({ message: "Invalid address" }, { status: 400 });
    }
    if (!isAddressEqual(requestedAddress as Address, session.address)) {
      return NextResponse.json({ message: "Authenticated wallet does not match requested address" }, { status: 403 });
    }
  }

  const refreshedSession = refreshAuthSession(session);
  const response = NextResponse.json({
    token: createPaymasterAuthToken(refreshedSession),
    expiresAt: refreshedSession.expiresAt,
  });

  applyAuthSession(response, refreshedSession);
  return response;
}
