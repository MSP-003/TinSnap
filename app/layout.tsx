import "./globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { AppHeader } from "@/components/layout/app-header";
import { BottomNav } from "@/components/layout/bottom-nav";
import { StoreProvider } from "@/lib/store-provider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "TinSnap - Claim Helper",
  description:
    "Batch scan QR codes from Zintin photos and process ZYN Rewards claim links quickly.",
  manifest: "/manifest.json",
  themeColor: "#0d9488",
};


export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
        <meta name="theme-color" content="#0d9488" />
        <link rel="apple-touch-icon" href="/icon.svg" />
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
      </head>
      <body className={inter.className}>
        <StoreProvider>
          <div className="flex min-h-screen flex-col">
            <AppHeader />
            <main className="mx-auto w-full max-w-2xl flex-1 px-4 pb-20 pt-6 sm:pb-8">
              {children}
            </main>
            <BottomNav />
          </div>
        </StoreProvider>
      </body>
    </html>
  );
}
