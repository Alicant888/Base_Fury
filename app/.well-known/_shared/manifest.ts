import { appConfig } from "../../../app.config";

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
    return undefined;
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
  return {
    accountAssociation: getOptionalAccountAssociation(),
    miniapp: {
      version: "1",
      name: appConfig.name,
      homeUrl: trimTrailingSlash(appConfig.url),
      iconUrl: getAbsoluteUrl("/icon.png"),
      imageUrl: getAbsoluteUrl("/hero.png"),
      splashImageUrl: getAbsoluteUrl("/icon.png"),
      splashBackgroundColor: "#000000",
      subtitle: "Arcade shooter on Base",
      description: appConfig.description,
      primaryCategory: "games",
      tags: ["games", "arcade", "base", "shooter"],
      screenshotUrls: [
        getAbsoluteUrl("/screenshot.png"),
        getAbsoluteUrl("/screenshot1.png"),
        getAbsoluteUrl("/screenshot2.png"),
      ],
      buttonTitle: "Play now",
      tagline: "Fight, upgrade, and survive",
      ogTitle: appConfig.name,
    },
    baseBuilder: getOptionalBaseBuilder(),
  };
}