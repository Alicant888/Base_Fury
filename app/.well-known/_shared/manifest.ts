import { appConfig } from "../../../app.config";

const DEFAULT_ACCOUNT_ASSOCIATION = {
  header: "eyJmaWQiOjQ2NzE2MCwidHlwZSI6ImN1c3RvZHkiLCJrZXkiOiIweDIwZUEyMUI4QzcwMGM5MTg2RjRGOTEwZGIwQTM5NTc4RjEzMTU2RUEifQ",
  payload: "eyJkb21haW4iOiJiYXNlZnVyeS5hcHAifQ",
  signature: "uL4zJmWGMudhIdjsXOrsk0NZdKVVpCuhyMNdbw/bCEBm8DjzZ+fETudsTHtdfG6y6u3XYf/wdsOw+1kvPx/QDBw=",
} as const;

function trimTrailingSlash(value: string) {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

function getAbsoluteUrl(path: string) {
  return `${trimTrailingSlash(appConfig.url)}${path}`;
}

function getOptionalAccountAssociation() {
  const header = process.env.FARCASTER_ACCOUNT_ASSOCIATION_HEADER?.trim();
  const payload = process.env.FARCASTER_ACCOUNT_ASSOCIATION_PAYLOAD?.trim();
  const signature = process.env.FARCASTER_ACCOUNT_ASSOCIATION_SIGNATURE?.trim();

  if (!header || !payload || !signature) {
    return DEFAULT_ACCOUNT_ASSOCIATION;
  }

  return {
    header,
    payload,
    signature,
  };
}

function getOptionalBaseBuilder() {
  const ownerAddress = process.env.BASE_BUILDER_OWNER_ADDRESS?.trim();
  return ownerAddress ? { ownerAddress } : undefined;
}

export function getMiniAppManifest() {
  const homeUrl = trimTrailingSlash(appConfig.url);
  const iconUrl = getAbsoluteUrl("/icon.png");
  const heroImageUrl = getAbsoluteUrl("/hero.png");
  const screenshotUrls = [
    getAbsoluteUrl("/screenshot.png"),
    getAbsoluteUrl("/screenshot1.png"),
    getAbsoluteUrl("/screenshot2.png"),
  ];
  const sharedManifestFields = {
    version: "1",
    name: appConfig.name,
    homeUrl,
    iconUrl,
    imageUrl: heroImageUrl,
    splashImageUrl: iconUrl,
    splashBackgroundColor: "#000000",
    subtitle: "Arcade shooter on Base",
    description: appConfig.description,
    primaryCategory: "games",
    tags: ["games", "arcade", "base", "shooter"],
    screenshotUrls,
    buttonTitle: "Play now",
    tagline: "Fight, upgrade, and survive",
    ogTitle: appConfig.name,
    canonicalDomain: new URL(homeUrl).host,
    requiredChains: ["eip155:8453"],
  } as const;

  return {
    accountAssociation: getOptionalAccountAssociation(),
    miniapp: sharedManifestFields,
    frame: sharedManifestFields,
    baseBuilder: getOptionalBaseBuilder(),
  };
}