import type { Address } from "viem";
import { base } from "viem/chains";

export const AUTH_CHAIN_ID = base.id;
export const AUTH_STATEMENT = "Sign in to Base Fury.";
export const AUTH_SESSION_COOKIE_NAME = "base-fury-auth";
export const AUTH_NONCE_TTL_MS = 10 * 60 * 1000;
export const AUTH_SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export interface AuthSession {
  address: Address;
  chainId: number;
  issuedAt: string;
  expiresAt: string;
}