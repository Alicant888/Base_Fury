import { sendCallsWithOptionalPaymaster } from "./sendCalls";

export interface BuyPackWithEthParams {
  packId: number;
  valueEth: string;
}

export interface OnchainPackOwnership {
  packBase: boolean;
  packMedium: boolean;
  packBig: boolean;
  packMaxi: boolean;
  packXp: boolean;
}

function getPackShopContractAddress(): `0x${string}` | null {
  const raw = process.env.NEXT_PUBLIC_PACKS_CONTRACT_ADDRESS?.trim();
  if (!raw) return null;
  if (!raw.startsWith("0x") || raw.length !== 42) {
    console.warn("Invalid NEXT_PUBLIC_PACKS_CONTRACT_ADDRESS:", raw);
    return null;
  }
  return raw as `0x${string}`;
}

export function isPackShopOnchainEnabled(): boolean {
  return getPackShopContractAddress() !== null;
}

async function getWalletClients() {
  const [{ sdk }, viem, { base }] = await Promise.all([
    import("@farcaster/miniapp-sdk"),
    import("viem"),
    import("viem/chains"),
  ]);

  if (!(await sdk.isInMiniApp())) {
    return null;
  }

  const provider = await sdk.wallet.getEthereumProvider();
  if (!provider) {
    return null;
  }

  const transport = viem.custom(provider);
  const walletClient = viem.createWalletClient({ chain: base, transport });
  const publicClient = viem.createPublicClient({ chain: base, transport: viem.http() });
  return { viem, base, provider, walletClient, publicClient };
}

export async function getOnchainPackOwnership(): Promise<OnchainPackOwnership | null> {
  const contractAddress = getPackShopContractAddress();
  if (!contractAddress) return null;

  const clients = await getWalletClients();
  if (!clients) return null;

  const abi = [
    {
      type: "function",
      name: "hasPack",
      stateMutability: "view",
      inputs: [
        { name: "user", type: "address" },
        { name: "packId", type: "uint8" },
      ],
      outputs: [{ name: "", type: "bool" }],
    },
  ] as const;

  const { walletClient, publicClient } = clients;
  const existing = await walletClient.getAddresses();
  const [account] = existing.length ? existing : [];
  if (!account) return null;
  const owned = await Promise.all([
    publicClient.readContract({
      address: contractAddress,
      abi,
      functionName: "hasPack",
      args: [account, 0],
    }),
    publicClient.readContract({
      address: contractAddress,
      abi,
      functionName: "hasPack",
      args: [account, 1],
    }),
    publicClient.readContract({
      address: contractAddress,
      abi,
      functionName: "hasPack",
      args: [account, 2],
    }),
    publicClient.readContract({
      address: contractAddress,
      abi,
      functionName: "hasPack",
      args: [account, 3],
    }),
    publicClient.readContract({
      address: contractAddress,
      abi,
      functionName: "hasPack",
      args: [account, 4],
    }),
  ]);

  return {
    packBase: owned[0],
    packMedium: owned[1],
    packBig: owned[2],
    packMaxi: owned[3],
    packXp: owned[4],
  };
}

export async function buyPackWithEth({
  packId,
  valueEth,
}: BuyPackWithEthParams): Promise<`0x${string}`> {
  const contractAddress = getPackShopContractAddress();
  if (!contractAddress) {
    throw new Error("Pack shop contract is not configured");
  }

  const clients = await getWalletClients();
  if (!clients) {
    throw new Error("ETH purchases are available only inside Base App");
  }
  const { viem, base, provider, walletClient } = clients;
  const existing = await walletClient.getAddresses();
  const [account] = existing.length
    ? existing
    : await walletClient.requestAddresses();
  if (!account) throw new Error("No wallet account available");

  const abi = [
    {
      type: "function",
      name: "buyPack",
      stateMutability: "payable",
      inputs: [{ name: "packId", type: "uint8" }],
      outputs: [],
    },
  ] as const;

  const paymasterServiceUrl = process.env.NEXT_PUBLIC_PAYMASTER_PROXY_URL?.trim();
  const callData = viem.encodeFunctionData({
    abi,
    functionName: "buyPack",
    args: [packId],
  });

  if (paymasterServiceUrl) {
    return sendCallsWithOptionalPaymaster({
      provider: provider as { request(args: { method: string; params?: unknown[] }): Promise<unknown> },
      account,
      chainIdHex: viem.numberToHex(base.id),
      calls: [{
        to: contractAddress,
        value: viem.toHex(viem.parseEther(valueEth)),
        data: callData,
      }],
      paymasterServiceUrl,
    });
  }

  return walletClient.writeContract({
      address: contractAddress,
      abi,
      functionName: "buyPack",
      args: [packId],
      value: viem.parseEther(valueEth),
      account,
  });
}
