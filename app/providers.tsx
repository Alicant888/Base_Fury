"use client";
import { ReactNode, useState } from "react";
import { base } from "wagmi/chains";
import { createConfig, http, WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { farcasterMiniApp } from "@farcaster/miniapp-wagmi-connector";
import { MiniAppProvider } from "./providers/MiniAppProvider";

const PAYMASTER_URL =
  "https://api.developer.coinbase.com/rpc/v1/base/Zvurg1GklICH1FkwKSQhwMZconclNmdN";

const config = createConfig({
  chains: [base],
  transports: { [base.id]: http(PAYMASTER_URL) },
  connectors: [farcasterMiniApp()],
});

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <MiniAppProvider>
      <WagmiProvider config={config}>
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      </WagmiProvider>
    </MiniAppProvider>
  );
}
