import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { SiweMessage } from "siwe";
import { createPublicClient, http, isAddressEqual, type Address } from "viem";
import { base } from "viem/chains";
import {
  applyAuthSession,
  consumeAuthNonce,
  createAuthSession,
  getExpectedDomain,
  getExpectedOrigin,
  logAuthDebug,
  maskDebugAddress,
} from "@/src/platform/auth/server";
import { AUTH_CHAIN_ID } from "@/src/platform/auth/shared";

const publicClient = createPublicClient({
  chain: base,
  transport: http(),
});

type VerifyRequestBody = {
  address?: string;
  message?: string;
  signature?: string;
};

export async function POST(request: NextRequest) {
  const requestId = randomUUID().slice(0, 8);
  let body: VerifyRequestBody;

  try {
    body = (await request.json()) as VerifyRequestBody;
  } catch {
    logAuthDebug("auth/verify", "Rejected invalid JSON body", { requestId });
    return NextResponse.json({ message: "Request body must be valid JSON" }, { status: 400 });
  }

  const { address, message, signature } = body;
  if (!address || !message || !signature) {
    logAuthDebug("auth/verify", "Rejected incomplete verify payload", {
      requestId,
      hasAddress: Boolean(address),
      hasMessage: Boolean(message),
      hasSignature: Boolean(signature),
    });
    return NextResponse.json({ message: "address, message, and signature are required" }, { status: 400 });
  }

  let parsedMessage: SiweMessage;
  try {
    parsedMessage = new SiweMessage(message);
  } catch {
    logAuthDebug("auth/verify", "Rejected unparsable SIWE message", {
      requestId,
      address: maskDebugAddress(address),
    });
    return NextResponse.json({ message: "Invalid SIWE message" }, { status: 400 });
  }

  logAuthDebug("auth/verify", "Received verify request", {
    requestId,
    address: maskDebugAddress(address),
    siweAddress: maskDebugAddress(parsedMessage.address),
    chainId: parsedMessage.chainId,
    domain: parsedMessage.domain,
    origin: request.headers.get("origin"),
  });

  if (!isAddressEqual(parsedMessage.address as Address, address as Address)) {
    logAuthDebug("auth/verify", "Rejected address mismatch", {
      requestId,
      address: maskDebugAddress(address),
      siweAddress: maskDebugAddress(parsedMessage.address),
    });
    return NextResponse.json({ message: "Address does not match SIWE payload" }, { status: 400 });
  }

  if (parsedMessage.chainId !== AUTH_CHAIN_ID) {
    logAuthDebug("auth/verify", "Rejected unsupported chain", {
      requestId,
      address: maskDebugAddress(address),
      chainId: parsedMessage.chainId,
    });
    return NextResponse.json({ message: "Unsupported chain id" }, { status: 400 });
  }

  const expectedDomain = getExpectedDomain(request);
  if (parsedMessage.domain !== expectedDomain) {
    logAuthDebug("auth/verify", "Rejected domain mismatch", {
      requestId,
      address: maskDebugAddress(address),
      domain: parsedMessage.domain,
      expectedDomain,
    });
    return NextResponse.json({ message: "Invalid SIWE domain" }, { status: 400 });
  }

  const expectedOrigin = getExpectedOrigin(request);
  if (!parsedMessage.uri.startsWith(expectedOrigin)) {
    logAuthDebug("auth/verify", "Rejected origin mismatch", {
      requestId,
      address: maskDebugAddress(address),
      uri: parsedMessage.uri,
      expectedOrigin,
    });
    return NextResponse.json({ message: "Invalid SIWE uri" }, { status: 400 });
  }

  if (!consumeAuthNonce(parsedMessage.nonce)) {
    logAuthDebug("auth/verify", "Rejected nonce validation", {
      requestId,
      address: maskDebugAddress(address),
    });
    return NextResponse.json({ message: "Invalid or expired nonce" }, { status: 400 });
  }

  const isValidSignature = await publicClient.verifyMessage({
    address: parsedMessage.address as Address,
    message,
    signature: signature as `0x${string}`,
  });

  if (!isValidSignature) {
    logAuthDebug("auth/verify", "Rejected invalid signature", {
      requestId,
      address: maskDebugAddress(address),
    });
    return NextResponse.json({ message: "Invalid signature" }, { status: 401 });
  }

  try {
    const session = createAuthSession(parsedMessage.address as Address, parsedMessage.chainId);
    const response = NextResponse.json({
      success: true,
      session,
    });

    applyAuthSession(response, session);
    logAuthDebug("auth/verify", "Created auth session", {
      requestId,
      address: maskDebugAddress(session.address),
      chainId: session.chainId,
      expiresAt: session.expiresAt,
    });
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown auth session error";

    logAuthDebug("auth/verify", "Failed to create auth session", {
      requestId,
      address: maskDebugAddress(address),
      error: message,
    });

    if (/AUTH_SESSION_SECRET/i.test(message)) {
      return NextResponse.json({
        message: "Server auth session is not configured. Set AUTH_SESSION_SECRET in the deployed environment.",
      }, { status: 500 });
    }

    return NextResponse.json({
      message: "Failed to create auth session",
    }, { status: 500 });
  }
}