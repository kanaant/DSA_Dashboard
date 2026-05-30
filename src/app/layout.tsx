import type { Metadata } from "next";

import { AGENT_DASHBOARD_DESCRIPTION, AGENT_DASHBOARD_TITLE } from "@/lib/brand";

import "./globals.css";

export const metadata: Metadata = {
  applicationName: AGENT_DASHBOARD_TITLE,
  title: {
    default: AGENT_DASHBOARD_TITLE,
    template: `%s · ${AGENT_DASHBOARD_TITLE}`,
  },
  description: AGENT_DASHBOARD_DESCRIPTION,
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-screen bg-background text-foreground">
        {children}
      </body>
    </html>
  );
}
