import { appendDataSuffix, getBuilderCodeDataSuffix } from "./builderCode";

interface RpcProvider {
  request(args: { method: string; params?: unknown[] }): Promise<unknown>;
}

interface WalletSendCallsReceipt {
  transactionHash?: string;
}

interface WalletSendCallsStatus {
  status?: number;
  receipts?: WalletSendCallsReceipt[];
}

interface SendCallsParams {
  provider: RpcProvider;
  account: `0x${string}`;
  chainIdHex: `0x${string}`;
  calls: Array<{
    to: `0x${string}`;
    value: `0x${string}`;
    data?: `0x${string}`;
  }>;
  paymasterServiceUrl?: string | null;
}

type PaymasterSupport = "supported" | "unsupported" | "unknown";

function wait(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, errorMessage: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(errorMessage)), timeoutMs);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

function asCallsStatus(raw: unknown): WalletSendCallsStatus {
  if (!raw || typeof raw !== "object") return {};
  const maybeResult = (raw as { result?: unknown }).result;
  const source = maybeResult && typeof maybeResult === "object"
    ? (maybeResult as { status?: unknown; receipts?: unknown })
    : (raw as { status?: unknown; receipts?: unknown });

  const status = typeof source.status === "number" ? source.status : undefined;
  const receipts = Array.isArray(source.receipts) ? source.receipts as WalletSendCallsReceipt[] : undefined;
  return { status, receipts };
}

function extractCallsId(result: unknown): `0x${string}` | null {
  if (typeof result === "string" && result.startsWith("0x")) {
    return result as `0x${string}`;
  }
  if (!result || typeof result !== "object") return null;
  const maybeId =
    (result as { id?: unknown; callsId?: unknown; batchId?: unknown }).id
    ?? (result as { callsId?: unknown; batchId?: unknown }).callsId
    ?? (result as { batchId?: unknown }).batchId;
  if (typeof maybeId === "string" && maybeId.startsWith("0x")) {
    return maybeId as `0x${string}`;
  }
  return null;
}

function extractTxHash(status: WalletSendCallsStatus): `0x${string}` | null {
  const receipts = status.receipts;
  if (!receipts || receipts.length === 0) return null;
  for (const receipt of receipts) {
    if (typeof receipt?.transactionHash === "string" && receipt.transactionHash.startsWith("0x")) {
      return receipt.transactionHash as `0x${string}`;
    }
  }
  return null;
}

function isCapabilitySupported(value: unknown): boolean {
  if (value === true) return true;
  if (typeof value === "string") {
    return value.toLowerCase() === "supported";
  }
  return false;
}

function isVersionError(error: unknown): boolean {
  const message = String((error as { message?: unknown })?.message ?? error ?? "");
  return /version|invalid params|-32602/i.test(message);
}

async function supportsPaymaster(params: {
  provider: RpcProvider;
  account: `0x${string}`;
  chainIdHex: `0x${string}`;
}): Promise<PaymasterSupport> {
  const { provider, account, chainIdHex } = params;
  try {
    const capabilitiesRaw = await withTimeout(
      provider.request({
        method: "wallet_getCapabilities",
        params: [account],
      }),
      4000,
      "wallet_getCapabilities timed out",
    );
    const capabilities = capabilitiesRaw as Record<string, { paymasterService?: { supported?: unknown } }>;
    const chainIdDecimal = String(Number.parseInt(chainIdHex, 16));
    const paymasterCapability =
      capabilities?.[chainIdHex]?.paymasterService
      ?? capabilities?.[chainIdDecimal]?.paymasterService;
    return isCapabilitySupported(paymasterCapability?.supported) ? "supported" : "unsupported";
  } catch {
    return "unknown";
  }
}

function isPaymasterCapabilityError(error: unknown): boolean {
  const message = String((error as { message?: unknown })?.message ?? error ?? "");
  return /paymaster|5700|4100|capability required|not supported/i.test(message);
}

async function sendCallsWithVersion(params: {
  provider: RpcProvider;
  payload: Record<string, unknown>;
  version: "2.0.0" | "1.0";
}): Promise<unknown> {
  const { provider, payload, version } = params;
  const body: Record<string, unknown> = { ...payload, version };
  if (version === "1.0") {
    delete body.atomicRequired;
  }
  return withTimeout(
    provider.request({
      method: "wallet_sendCalls",
      params: [body],
    }),
    25000,
    "wallet_sendCalls timed out",
  );
}

async function waitForCallsFinalStatus(params: {
  provider: RpcProvider;
  callsId: `0x${string}`;
}): Promise<`0x${string}`> {
  const { provider, callsId } = params;
  const startedAt = Date.now();
  while (Date.now() - startedAt < 45000) {
    const rawStatus = await withTimeout(
      provider.request({
        method: "wallet_getCallsStatus",
        params: [callsId],
      }),
      5000,
      "wallet_getCallsStatus timed out",
    );
    const status = asCallsStatus(rawStatus);
    if (status.status === 100 || status.status === undefined) {
      await wait(900);
      continue;
    }
    if (status.status === 200 || status.status === 600) {
      return extractTxHash(status) ?? callsId;
    }
    throw new Error(`wallet_sendCalls failed with status ${status.status}`);
  }
  throw new Error("wallet_getCallsStatus timed out");
}

export async function sendCallsWithOptionalPaymaster(params: SendCallsParams): Promise<`0x${string}`> {
  const { provider, account, chainIdHex, calls, paymasterServiceUrl } = params;
  const dataSuffix = getBuilderCodeDataSuffix();

  // Append builder code suffix directly to each call's data so attribution
  // is present in calldata without depending on wallet-side capability support.
  const attributedCalls = calls.map((c) => ({
    ...c,
    data: appendDataSuffix(c.data as `0x${string}` | undefined, dataSuffix) ?? c.data,
  }));

  const payload: Record<string, unknown> = {
    from: account,
    chainId: chainIdHex,
    atomicRequired: true,
    calls: attributedCalls,
  };

  const trimmedUrl = paymasterServiceUrl?.trim();
  let shouldTryPaymaster = false;
  if (trimmedUrl) {
    const paymasterSupport = await supportsPaymaster({ provider, account, chainIdHex });
    shouldTryPaymaster = paymasterSupport !== "unsupported";
    if (shouldTryPaymaster) {
      payload.capabilities = {
        ...(typeof payload.capabilities === "object" && payload.capabilities ? payload.capabilities as Record<string, unknown> : {}),
        paymasterService: {
        url: trimmedUrl,
        },
      };
    }
  }

  let sendResult: unknown;
  try {
    sendResult = await sendCallsWithVersion({ provider, payload, version: "2.0.0" });
  } catch (error) {
    if (shouldTryPaymaster && isPaymasterCapabilityError(error)) {
      const fallbackPayload = { ...payload };
      delete fallbackPayload.capabilities;

      try {
        sendResult = await sendCallsWithVersion({ provider, payload: fallbackPayload, version: "2.0.0" });
      } catch (fallbackError) {
        if (!isVersionError(fallbackError)) throw fallbackError;
        sendResult = await sendCallsWithVersion({ provider, payload: fallbackPayload, version: "1.0" });
      }
    } else {
      if (!isVersionError(error)) throw error;
      sendResult = await sendCallsWithVersion({ provider, payload, version: "1.0" });
    }
  }

  const callsId = extractCallsId(sendResult);
  if (!callsId) {
    throw new Error("wallet_sendCalls returned no calls id");
  }

  try {
    return await waitForCallsFinalStatus({ provider, callsId });
  } catch (error) {
    const message = String((error as { message?: unknown })?.message ?? error ?? "");
    if (/wallet_getCallsStatus|4100|method not supported|Requested method not supported/i.test(message)) {
      return callsId;
    }
    throw error;
  }
}
