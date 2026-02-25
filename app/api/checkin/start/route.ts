import { Errors, createClient } from "@farcaster/quick-auth";
import { NextRequest, NextResponse } from "next/server";

const client = createClient();

type StartCheckInRecord = {
  lastDay: string;
  streak: number;
};

type StartCheckInStore = Map<number, StartCheckInRecord>;

const globalStore = globalThis as typeof globalThis & {
  __startCheckInStore?: StartCheckInStore;
};

if (!globalStore.__startCheckInStore) {
  globalStore.__startCheckInStore = new Map<number, StartCheckInRecord>();
}

const startCheckInStore = globalStore.__startCheckInStore;

function getUrlHost(request: NextRequest): string {
  const origin = request.headers.get("origin");
  if (origin) {
    try {
      const url = new URL(origin);
      return url.host;
    } catch (error) {
      console.warn("Invalid origin header:", origin, error);
    }
  }

  const host = request.headers.get("host");
  if (host) {
    return host;
  }

  if (process.env.VERCEL_ENV === "production") {
    const value = process.env.NEXT_PUBLIC_URL?.trim();
    if (value) {
      return new URL(value).host;
    }
  }

  if (process.env.VERCEL_URL) {
    return new URL(`https://${process.env.VERCEL_URL}`).host;
  }

  return "localhost:3000";
}

function getUtcDayStamp(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

function getPreviousUtcDayStamp(dayStamp: string): string {
  const date = new Date(`${dayStamp}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}

function parseFid(value: string | number): number | null {
  const fid = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(fid) || fid <= 0) {
    return null;
  }
  return fid;
}

export async function POST(request: NextRequest) {
  const authorization = request.headers.get("Authorization");
  if (!authorization || !authorization.startsWith("Bearer ")) {
    return NextResponse.json({ message: "Missing token" }, { status: 401 });
  }

  try {
    const payload = await client.verifyJwt({
      token: authorization.split(" ")[1] as string,
      domain: getUrlHost(request),
    });

    const fid = parseFid(payload.sub);
    if (!fid) {
      return NextResponse.json({ message: "Invalid fid" }, { status: 400 });
    }

    const today = getUtcDayStamp();
    const previous = startCheckInStore.get(fid);

    if (previous?.lastDay === today) {
      return NextResponse.json({
        success: true,
        alreadyCheckedIn: true,
        streak: previous.streak,
        checkedInDay: today,
      });
    }

    const streak =
      previous?.lastDay === getPreviousUtcDayStamp(today) ? previous.streak + 1 : 1;

    startCheckInStore.set(fid, { lastDay: today, streak });

    return NextResponse.json({
      success: true,
      alreadyCheckedIn: false,
      streak,
      checkedInDay: today,
    });
  } catch (error) {
    if (error instanceof Errors.InvalidTokenError) {
      return NextResponse.json({ message: "Invalid token" }, { status: 401 });
    }
    if (error instanceof Error) {
      return NextResponse.json({ message: error.message }, { status: 500 });
    }
    throw error;
  }
}
