import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { isAddress, isAddressEqual, type Address } from "viem";
import {
  applyAuthSession,
  logAuthDebug,
  maskDebugAddress,
  readAuthSession,
  readPaymasterAuthSession,
  refreshAuthSession,
} from "@/src/platform/auth/server";

type RateLimitBucket = {
  windowStartMs: number;
  count: number;
};

const globalRateStore = globalThis as typeof globalThis & {
  __paymasterRateLimitStore?: Map<string, RateLimitBucket>;
};

if (!globalRateStore.__paymasterRateLimitStore) {
  globalRateStore.__paymasterRateLimitStore = new Map<string, RateLimitBucket>();
}

const paymasterRateLimitStore = globalRateStore.__paymasterRateLimitStore;

function getConfiguredTargetUrl(): string | null {
  const value = process.env.CDP_PAYMASTER_URL?.trim();
  return value || null;
}

function normalizeOrigin(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return `${url.protocol}//${url.host}`.toLowerCase();
  } catch {
    return null;
  }
}

function getAllowedOrigins(): string[] {
  const configured = process.env.PAYMASTER_ALLOWED_ORIGINS?.trim();
  const configuredOrigins = configured
    ? configured.split(",").map((item) => normalizeOrigin(item.trim())).filter((item): item is string => !!item)
    : [];
  if (configuredOrigins.length > 0) {
    return Array.from(new Set(configuredOrigins));
  }

  const fallback = normalizeOrigin(process.env.NEXT_PUBLIC_URL);
  return fallback ? [fallback] : [];
}

function getRequestOrigin(request: NextRequest): string | null {
  const origin = normalizeOrigin(request.headers.get("origin"));
  if (origin) return origin;
  return normalizeOrigin(request.headers.get("referer"));
}

function isOriginAllowed(request: NextRequest, skipOriginCheck = false): boolean {
  if (skipOriginCheck) return true;

  const allowedOrigins = getAllowedOrigins();
  const requireOrigin = process.env.PAYMASTER_REQUIRE_ORIGIN?.trim() === "true";
  if (allowedOrigins.length === 0 && !requireOrigin) return true;

  const requestOrigin = getRequestOrigin(request);
  if (!requestOrigin) return !requireOrigin;
  if (allowedOrigins.length === 0) return true;
  return allowedOrigins.includes(requestOrigin);
}

function getNumberEnv(name: string, fallback: number): number {
  const raw = process.env[name]?.trim();
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return parsed;
}

function getRateLimitKey(request: NextRequest, address?: Address): string {
  if (address) {
    return `address:${address.toLowerCase()}`;
  }

  const forwardedFor = request.headers.get("x-forwarded-for");
  const ip = forwardedFor?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
  if (ip !== "unknown") {
    return `ip:${ip}`;
  }

  const requestOrigin = getRequestOrigin(request);
  if (requestOrigin) {
    return `origin:${requestOrigin}`;
  }

  return `ip:${ip}`;
}

function isRateLimited(key: string): boolean {
  const maxRequests = getNumberEnv("PAYMASTER_RATE_LIMIT_MAX", 80);
  const windowMs = getNumberEnv("PAYMASTER_RATE_LIMIT_WINDOW_MS", 60_000);
  const nowMs = Date.now();

  if (paymasterRateLimitStore.size > 5000) {
    for (const [bucketKey, bucket] of paymasterRateLimitStore) {
      if (nowMs - bucket.windowStartMs > windowMs * 2) {
        paymasterRateLimitStore.delete(bucketKey);
      }
    }
  }

  const existing = paymasterRateLimitStore.get(key);
  if (!existing || nowMs - existing.windowStartMs >= windowMs) {
    paymasterRateLimitStore.set(key, { windowStartMs: nowMs, count: 1 });
    return false;
  }

  if (existing.count >= maxRequests) {
    return true;
  }

  existing.count += 1;
  return false;
}

function extractRpcMethods(rawPayload: unknown): string[] | null {
  const extractFromItem = (item: unknown): string | null => {
    if (!item || typeof item !== "object") return null;
    const method = (item as { method?: unknown }).method;
    return typeof method === "string" && method.length > 0 ? method : null;
  };

  if (Array.isArray(rawPayload)) {
    if (rawPayload.length === 0) return null;
    const methods = rawPayload.map(extractFromItem).filter((value): value is string => !!value);
    return methods.length === rawPayload.length ? methods : null;
  }

  const singleMethod = extractFromItem(rawPayload);
  return singleMethod ? [singleMethod] : null;
}

function isRpcMethodAllowed(methods: string[]): boolean {
  const rawAllowedMethods = process.env.PAYMASTER_ALLOWED_RPC_METHODS?.trim();
  if (!rawAllowedMethods) {
    const defaultAllowedMethods = new Set([
      "pm_getPaymasterStubData",
      "pm_getPaymasterData",
      "pm_getAcceptedPaymentTokens",
    ]);
    return methods.every((method) => defaultAllowedMethods.has(method));
  }
  if (rawAllowedMethods === "*") return true;

  const allowed = new Set(
    rawAllowedMethods.split(",").map((item) => item.trim()).filter((item) => item.length > 0),
  );
  if (allowed.size === 0) return true;
  return methods.every((method) => allowed.has(method));
}

function extractRpcSenders(rawPayload: unknown): { ok: true; senders: Address[] } | { ok: false } {
  const payloads = Array.isArray(rawPayload) ? rawPayload : [rawPayload];
  if (payloads.length === 0) {
    return { ok: false };
  }

  const senders: Address[] = [];
  for (const payload of payloads) {
    if (!payload || typeof payload !== "object") {
      return { ok: false };
    }

    const method = (payload as { method?: unknown }).method;
    if (method === "pm_getAcceptedPaymentTokens") {
      continue;
    }

    const params = (payload as { params?: unknown }).params;
    if (!Array.isArray(params) || params.length === 0) {
      return { ok: false };
    }

    const userOperation = params[0];
    if (!userOperation || typeof userOperation !== "object") {
      return { ok: false };
    }

    const sender = (userOperation as { sender?: unknown }).sender;
    if (typeof sender !== "string" || !isAddress(sender)) {
      return { ok: false };
    }

    senders.push(sender);
  }

  return { ok: true, senders };
}

export async function POST(request: NextRequest) {
  const requestId = randomUUID().slice(0, 8);
  const targetUrl = getConfiguredTargetUrl();
  if (!targetUrl) {
    logAuthDebug("paymaster", "Rejected request because upstream URL is missing", { requestId });
    return NextResponse.json({ message: "CDP_PAYMASTER_URL is not configured" }, { status: 500 });
  }

  const cookieSession = readAuthSession(request);
  const paymasterTokenSession = readPaymasterAuthSession(request);
  const authSession = cookieSession ?? paymasterTokenSession;

  if (!isOriginAllowed(request, Boolean(paymasterTokenSession))) {
    logAuthDebug("paymaster", "Rejected request because origin is not allowlisted", {
      requestId,
      origin: getRequestOrigin(request),
      hasPaymasterToken: Boolean(paymasterTokenSession),
    });
    return NextResponse.json({ message: "Origin is not allowed" }, { status: 403 });
  }

  if (!authSession) {
    logAuthDebug("paymaster", "Rejected unauthenticated request", {
      requestId,
      origin: getRequestOrigin(request),
    });
    return NextResponse.json({ message: "Authentication required" }, { status: 401 });
  }

  const rateLimitKey = getRateLimitKey(request, authSession.address);
  if (isRateLimited(rateLimitKey)) {
    logAuthDebug("paymaster", "Rejected rate-limited request", {
      requestId,
      address: maskDebugAddress(authSession.address),
    });
    return NextResponse.json({ message: "Too many requests" }, { status: 429 });
  }

  let body = "";
  try {
    body = await request.text();
  } catch (error) {
    logAuthDebug("paymaster", "Failed to read request body", {
      requestId,
      address: maskDebugAddress(authSession.address),
      error: error instanceof Error ? error.message : String(error),
    });
    console.warn("Paymaster proxy: failed to read request body", error);
    return NextResponse.json({ message: "Invalid request body" }, { status: 400 });
  }

  const maxBodyBytes = getNumberEnv("PAYMASTER_MAX_BODY_BYTES", 200_000);
  if (!body || body.length === 0) {
    logAuthDebug("paymaster", "Rejected empty body", {
      requestId,
      address: maskDebugAddress(authSession.address),
    });
    return NextResponse.json({ message: "Empty request body" }, { status: 400 });
  }
  if (body.length > maxBodyBytes) {
    logAuthDebug("paymaster", "Rejected oversized body", {
      requestId,
      address: maskDebugAddress(authSession.address),
      bodyLength: body.length,
      maxBodyBytes,
    });
    return NextResponse.json({ message: "Request body too large" }, { status: 413 });
  }

  let parsedPayload: unknown;
  try {
    parsedPayload = JSON.parse(body);
  } catch {
    logAuthDebug("paymaster", "Rejected invalid JSON-RPC payload", {
      requestId,
      address: maskDebugAddress(authSession.address),
    });
    return NextResponse.json({ message: "Request body must be valid JSON" }, { status: 400 });
  }

  const rpcMethods = extractRpcMethods(parsedPayload);
  if (!rpcMethods) {
    logAuthDebug("paymaster", "Rejected malformed JSON-RPC request", {
      requestId,
      address: maskDebugAddress(authSession.address),
    });
    return NextResponse.json({ message: "Invalid JSON-RPC payload" }, { status: 400 });
  }
  if (!isRpcMethodAllowed(rpcMethods)) {
    logAuthDebug("paymaster", "Rejected non-allowlisted RPC methods", {
      requestId,
      address: maskDebugAddress(authSession.address),
      rpcMethods,
    });
    return NextResponse.json({ message: "RPC method is not allowlisted" }, { status: 403 });
  }

  const senderValidation = extractRpcSenders(parsedPayload);
  if (!senderValidation.ok) {
    logAuthDebug("paymaster", "Rejected invalid sender payload", {
      requestId,
      address: maskDebugAddress(authSession.address),
      rpcMethods,
    });
    return NextResponse.json({ message: "Invalid JSON-RPC sender payload" }, { status: 400 });
  }
  if (senderValidation.senders.some((sender) => !isAddressEqual(sender, authSession.address))) {
    logAuthDebug("paymaster", "Rejected sender mismatch", {
      requestId,
      address: maskDebugAddress(authSession.address),
      senders: senderValidation.senders.map((sender) => maskDebugAddress(sender)),
      rpcMethods,
    });
    return NextResponse.json({ message: "Authenticated wallet does not match paymaster sender" }, { status: 403 });
  }

  logAuthDebug("paymaster", "Forwarding paymaster request upstream", {
    requestId,
    address: maskDebugAddress(authSession.address),
    rpcMethods,
    senderCount: senderValidation.senders.length,
  });

  const upstreamHeaders = new Headers();
  upstreamHeaders.set("content-type", request.headers.get("content-type") || "application/json");

  const bearerToken = process.env.CDP_PAYMASTER_BEARER_TOKEN?.trim();
  if (bearerToken) {
    upstreamHeaders.set(
      "authorization",
      bearerToken.startsWith("Bearer ") ? bearerToken : `Bearer ${bearerToken}`,
    );
  }

  const apiKey = process.env.CDP_PAYMASTER_API_KEY?.trim();
  if (apiKey) {
    upstreamHeaders.set("x-api-key", apiKey);
  }

  try {
    const upstream = await fetch(targetUrl, {
      method: "POST",
      headers: upstreamHeaders,
      body,
      cache: "no-store",
    });

    const responseBody = await upstream.text();
    logAuthDebug("paymaster", "Upstream paymaster response received", {
      requestId,
      address: maskDebugAddress(authSession.address),
      rpcMethods,
      status: upstream.status,
    });
    const response = new NextResponse(responseBody, {
      status: upstream.status,
      headers: {
        "content-type": upstream.headers.get("content-type") || "application/json",
        "cache-control": "no-store",
      },
    });

    if (cookieSession) {
      applyAuthSession(response, refreshAuthSession(cookieSession));
    }
    return response;
  } catch (error) {
    logAuthDebug("paymaster", "Upstream paymaster request failed", {
      requestId,
      address: maskDebugAddress(authSession.address),
      rpcMethods,
      error: error instanceof Error ? error.message : String(error),
    });
    console.warn("Paymaster proxy: upstream request failed", error);
    return NextResponse.json({ message: "Paymaster upstream request failed" }, { status: 502 });
  }
}
