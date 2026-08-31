import type { Metadata } from "next";
import type { ReactNode } from "react";
import "@fontsource-variable/ibm-plex-sans";
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/500.css";
import "@fontsource/ibm-plex-mono/600.css";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "ReCall — Food recall information",
    template: "%s | ReCall",
  },
  description:
    "Clear, searchable U.S. FDA food enforcement recall information for consumers.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body>
        <a className="skip-link" href="#main-content">
          Skip to main content
        </a>
        <SiteHeader />
        <div id="main-content" className="page-body">
          {children}
        </div>
        <SiteFooter />
      </body>
    </html>
  );
}
