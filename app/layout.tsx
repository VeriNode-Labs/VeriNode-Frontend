import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Providers } from "@/src/components/providers/Providers";
import { PwaProvider } from "@/src/components/providers/PwaProvider";
import "./globals.css";
import { ToastProvider } from "@/src/components/Toast";
import { RetryWatcher } from "@/src/components/RetryWatcher";
import { PendingTransactionsBanner } from "@/src/components/PendingTransactionsBanner";
import { FeatureFlagProvider } from "@/src/components/FeatureFlagProvider";
import { CapacitySheddingProvider } from "@/src/components/CapacitySheddingProvider";
import { CapacityIndicator } from "@/src/components/CapacityIndicator";

// next/font self-hosts Inter and emits <link rel="preload"> automatically.
const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "VeriNode - Inspection Dashboard",
  description: "Physical node inspection and audit management for infrastructure operators",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} antialiased`}
      >
        <Providers>
          <FeatureFlagProvider>
            <CapacitySheddingProvider>
              <ToastProvider>
                <CapacityIndicator />
                <PendingTransactionsBanner />
                <RetryWatcher />
                {children}
              </ToastProvider>
            </CapacitySheddingProvider>
          </FeatureFlagProvider>
        </Providers>
      </body>
    </html>
  );
}
