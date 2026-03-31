const getRootUrl = () => {
  if (process.env.NEXT_PUBLIC_URL) {
    return process.env.NEXT_PUBLIC_URL.trim();
  }

  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }

  return "http://localhost:3000";
};

export const appConfig = {
  name: process.env.NEXT_PUBLIC_PROJECT_NAME?.trim() || "Base Fury",
  description:
    "Fast-paced space shooter with 16 levels. Dodge asteroids, defeat enemies, collect power-ups and upgrades.",
  url: getRootUrl(),
  baseAppId: process.env.NEXT_PUBLIC_BASE_APP_ID?.trim() || "699daec54fa7a77f84aa001f",
} as const;