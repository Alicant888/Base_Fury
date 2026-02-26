import type { Metadata } from "next";
import { Inter, Source_Code_Pro } from "next/font/google";
import { SafeArea } from "./components/SafeArea";
import { farcasterConfig } from "../farcaster.config";
import { Providers } from "./providers";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: farcasterConfig.miniapp.name,
    description: farcasterConfig.miniapp.description,
    other: {
      "fc:frame": JSON.stringify({
        version: farcasterConfig.miniapp.version,
        imageUrl: farcasterConfig.miniapp.heroImageUrl,
        button: {
          title: `${farcasterConfig.miniapp.name}`,
          action: {
            name: `Launch ${farcasterConfig.miniapp.name}`,
            type: "launch_frame",
          },
        },
      }),
      "base:app_id": "699daec54fa7a77f84aa001f",
    },
  };
}

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const sourceCodePro = Source_Code_Pro({
  variable: "--font-source-code-pro",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <Providers>
      <html lang="en">
        <body className={`${inter.variable} ${sourceCodePro.variable}`}>
          <div style={{ fontFamily: 'Orbitron', visibility: 'hidden', position: 'absolute', pointerEvents: 'none' }}>.</div>
          <SafeArea>{children}</SafeArea>
        </body>
      </html>
    </Providers>
  );
}
