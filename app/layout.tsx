import type { Metadata } from "next";
import Script from "next/script";
import { Inter } from "next/font/google";
import { Providers } from "@/src/components/providers/Providers";

import "./globals.css";
import { ToastProvider } from "@/src/components/Toast";
import { RetryWatcher } from "@/src/components/RetryWatcher";
import { PendingTransactionsBanner } from "@/src/components/PendingTransactionsBanner";
import { FeatureFlagProvider } from "@/src/components/FeatureFlagProvider";
import { CapacitySheddingProvider } from "@/src/components/CapacitySheddingProvider";
import { CapacityIndicator } from "@/src/components/CapacityIndicator";
import { ScreenReaderAnnouncements } from "@/src/components/ScreenReaderAnnouncements";

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
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Apply the stored/system theme before first paint to avoid a flash
            of the wrong theme (issue #169). The ThemeProvider takes over
            after hydration. */}
        <Script src="/theme-init.js" strategy="beforeInteractive" />
      </head>
      <body
        className={`${inter.variable} antialiased`}
      >
        {/* Skip-to-content link for keyboard users */}
        <a href="#main-content" className="skip-to-content">
          Skip to main content
        </a>
        <Providers>
          <FeatureFlagProvider>
            <CapacitySheddingProvider>
              <ToastProvider>
                <ScreenReaderAnnouncements />
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
