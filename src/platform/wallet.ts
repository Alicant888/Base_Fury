import { connect, getConnections, getConnectors, reconnect, switchChain } from "@wagmi/core";
import { type Address } from "viem";
import { base } from "viem/chains";
import { wagmiConfig } from "./wagmi";

export interface WalletRpcProvider {
  request(args: { method: string; params?: unknown[] }): Promise<unknown>;
}

export interface GameWalletSession {
  account: Address;
  chainId: number;
  provider: WalletRpcProvider;
}

let reconnectAttempted = false;
let reconnectPromise: Promise<void> | null = null;

function getActiveConnection() {
  const [connection] = getConnections(wagmiConfig);
  return connection;
}

async function ensureReconnectAttempted() {
  if (reconnectAttempted) return;

  if (!reconnectPromise) {
    reconnectPromise = reconnect(wagmiConfig)
      .then(() => undefined)
      .catch(() => undefined)
      .finally(() => {
        reconnectAttempted = true;
        reconnectPromise = null;
      });
  }

  await reconnectPromise;
}

async function toWalletSession(): Promise<GameWalletSession | null> {
  const connection = getActiveConnection();
  if (!connection) return null;

  const provider = await connection.connector.getProvider() as WalletRpcProvider | null | undefined;
  if (!provider || typeof provider.request !== "function") return null;

  return {
    account: connection.accounts[0],
    chainId: connection.chainId,
    provider: provider as WalletRpcProvider,
  };
}

async function connectWithConfiguredConnectors() {
  const connectors = getConnectors(wagmiConfig);
  let lastError: unknown;

  for (const connector of connectors) {
    try {
      await connect(wagmiConfig, {
        chainId: base.id,
        connector,
      });

      const connection = getActiveConnection();
      if (connection) {
        return connection;
      }
    } catch (error) {
      lastError = error;
    }
  }

  if (lastError instanceof Error) throw lastError;
  throw new Error("Unable to connect a wallet");
}

export async function restoreGameWalletConnection() {
  await ensureReconnectAttempted();
}

export async function getConnectedWalletSession(): Promise<GameWalletSession | null> {
  await restoreGameWalletConnection();
  return toWalletSession();
}

export async function requestWalletSession(): Promise<GameWalletSession> {
  await restoreGameWalletConnection();

  let connection = getActiveConnection();
  if (!connection) {
    connection = await connectWithConfiguredConnectors();
  }

  if (connection.chainId !== base.id) {
    await switchChain(wagmiConfig, {
      chainId: base.id,
      connector: connection.connector,
    });
  }

  const session = await toWalletSession();
  if (!session) {
    throw new Error("Wallet provider is unavailable");
  }

  return session;
}

export async function getConnectedWalletAddress(): Promise<Address | null> {
  const session = await getConnectedWalletSession();
  return session?.account ?? null;
}

export function formatWalletAddress(address: Address, visibleChars = 4) {
  if (address.length <= visibleChars * 2 + 2) return address;
  return `${address.slice(0, visibleChars + 2)}...${address.slice(-visibleChars)}`;
}