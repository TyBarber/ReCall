import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Archivo_Black, Atkinson_Hyperlegible } from "next/font/google";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

import "./globals.css";

const displayFont = Archivo_Black({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-display",
});

const bodyFont = Atkinson_Hyperlegible({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-body",
});

export const metadata: Metadata = {
  title: {
    default: "ReCall — Food recall information",
    template: "%s | ReCall",
  },
  description:
    "Clear, searchable U.S. FDA and USDA FSIS food safety information for consumers.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      className={`${displayFont.variable} ${bodyFont.variable}`}
      data-scroll-behavior="smooth"
    >
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
