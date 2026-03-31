import { appConfig } from "../../app.config";
import { base } from "wagmi/chains";
import { cookieStorage, createConfig, createStorage, http } from "wagmi";
import { baseAccount, injected } from "wagmi/connectors";

export const wagmiConfig = createConfig({
  chains: [base],
  multiInjectedProviderDiscovery: false,
  connectors: [
    baseAccount({
      appName: appConfig.name,
    }),
    injected(),
  ],
  storage: createStorage({
    storage: cookieStorage,
  }),
  ssr: true,
  transports: {
    [base.id]: http(),
  },
});

export function getConfig() {
  return wagmiConfig;
}

declare module "wagmi" {
  interface Register {
    config: typeof wagmiConfig;
  }
}