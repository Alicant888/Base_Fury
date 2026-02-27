import { Errors, createClient } from "@farcaster/quick-auth";
import { NextRequest, NextResponse } from "next/server";

const quickAuthClient = createClient();

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

function isOriginAllowed(request: NextRequest): boolean {
  const allowedOrigins = getAllowedOrigins();
  const requireOrigin = process.env.PAYMASTER_REQUIRE_ORIGIN?.trim() === "true";
  if (allowedOrigins.length === 0 && !requireOrigin) return true;

  const requestOrigin = getRequestOrigin(request);
  if (!requestOrigin) return !requireOrigin;
  if (allowedOrigins.length === 0) return true;
  return allowedOrigins.includes(requestOrigin);
}

function getJwtDomain(request: NextRequest): string {
  const origin = request.headers.get("origin");
  if (origin) {
    try {
      return new URL(origin).host;
    } catch {
      // ignore
    }
  }

  const host = request.headers.get("host");
  if (host) return host;

  const configured = process.env.NEXT_PUBLIC_URL?.trim();
  if (configured) {
    try {
      return new URL(configured).host;
    } catch {
      // ignore
    }
  }
  return "localhost:3000";
}

async function verifyQuickAuth(request: NextRequest): Promise<{ ok: true; fid?: string } | {
  ok: false;
  status: number;
  message: string;
}> {
  const requireQuickAuth = process.env.PAYMASTER_REQUIRE_QUICK_AUTH?.trim() === "true";
  const authorization = request.headers.get("authorization");

  if (!authorization) {
    if (requireQuickAuth) {
      return { ok: false, status: 401, message: "Missing quick auth token" };
    }
    return { ok: true };
  }

  if (!authorization.startsWith("Bearer ")) {
    return { ok: false, status: 401, message: "Invalid authorization format" };
  }

  try {
    const payload = await quickAuthClient.verifyJwt({
      token: authorization.slice("Bearer ".length),
      domain: getJwtDomain(request),
    });
    return { ok: true, fid: String(payload.sub) };
  } catch (error) {
    if (error instanceof Errors.InvalidTokenError) {
      return { ok: false, status: 401, message: "Invalid quick auth token" };
    }
    if (error instanceof Error) {
      return { ok: false, status: 500, message: error.message };
    }
    return { ok: false, status: 500, message: "Quick auth verification failed" };
  }
}

function getNumberEnv(name: string, fallback: number): number {
  const raw = process.env[name]?.trim();
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return parsed;
}

function getRateLimitKey(request: NextRequest, fid?: string): string {
  if (fid) return `fid:${fid}`;
  const forwardedFor = request.headers.get("x-forwarded-for");
  const ip = forwardedFor?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
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

export async function POST(request: NextRequest) {
  const targetUrl = getConfiguredTargetUrl();
  if (!targetUrl) {
    return NextResponse.json({ message: "CDP_PAYMASTER_URL is not configured" }, { status: 500 });
  }

  if (!isOriginAllowed(request)) {
    return NextResponse.json({ message: "Origin is not allowed" }, { status: 403 });
  }

  const quickAuth = await verifyQuickAuth(request);
  if (!quickAuth.ok) {
    return NextResponse.json({ message: quickAuth.message }, { status: quickAuth.status });
  }

  const rateLimitKey = getRateLimitKey(request, quickAuth.fid);
  if (isRateLimited(rateLimitKey)) {
    return NextResponse.json({ message: "Too many requests" }, { status: 429 });
  }

  let body = "";
  try {
    body = await request.text();
  } catch (error) {
    console.warn("Paymaster proxy: failed to read request body", error);
    return NextResponse.json({ message: "Invalid request body" }, { status: 400 });
  }

  const maxBodyBytes = getNumberEnv("PAYMASTER_MAX_BODY_BYTES", 200_000);
  if (!body || body.length === 0) {
    return NextResponse.json({ message: "Empty request body" }, { status: 400 });
  }
  if (body.length > maxBodyBytes) {
    return NextResponse.json({ message: "Request body too large" }, { status: 413 });
  }

  let parsedPayload: unknown;
  try {
    parsedPayload = JSON.parse(body);
  } catch {
    return NextResponse.json({ message: "Request body must be valid JSON" }, { status: 400 });
  }

  const rpcMethods = extractRpcMethods(parsedPayload);
  if (!rpcMethods) {
    return NextResponse.json({ message: "Invalid JSON-RPC payload" }, { status: 400 });
  }
  if (!isRpcMethodAllowed(rpcMethods)) {
    return NextResponse.json({ message: "RPC method is not allowlisted" }, { status: 403 });
  }

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
    return new Response(responseBody, {
      status: upstream.status,
      headers: {
        "content-type": upstream.headers.get("content-type") || "application/json",
        "cache-control": "no-store",
      },
    });
  } catch (error) {
    console.warn("Paymaster proxy: upstream request failed", error);
    return NextResponse.json({ message: "Paymaster upstream request failed" }, { status: 502 });
  }
}
