import type { Metadata } from "next";
import { Inter, Source_Code_Pro } from "next/font/google";
import { appConfig } from "../app.config";
import { SafeArea } from "./components/SafeArea";
import { Providers } from "./providers";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const other = appConfig.baseAppId
    ? {
        "base:app_id": appConfig.baseAppId,
      }
    : undefined;

  return {
    title: appConfig.name,
    description: appConfig.description,
    other,
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
    <html lang="en">
      <body className={`${inter.variable} ${sourceCodePro.variable}`}>
        <Providers>
          <div style={{ fontFamily: 'Orbitron', visibility: 'hidden', position: 'absolute', pointerEvents: 'none' }}>.</div>
          <SafeArea>{children}</SafeArea>
        </Providers>
      </body>
    </html>
  );
}
