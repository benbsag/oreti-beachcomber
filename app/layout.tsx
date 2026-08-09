import type { Metadata } from "next";
import { Rubik, Bungee_Inline } from "next/font/google";
import "./globals.css";

// Body: Rubik — a rounded geometric sans that's highly readable and sits well
// next to the chunky display face without competing with it.
const rubik = Rubik({
  variable: "--font-rubik",
  subsets: ["latin"],
});

// Header: Bungee Inline — a bold nautical/signage display face (single weight).
const bungeeInline = Bungee_Inline({
  weight: "400",
  variable: "--font-bungee",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Oreti Beachcombing",
  description:
    "Daily driftwood & flotsam beachcombing conditions for Oreti Beach, Southland, New Zealand.",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#6b0626",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${rubik.variable} ${bungeeInline.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
