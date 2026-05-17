import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Agents — Framer Portfolio Template",
  description:
    "A bold portfolio template crafted for creators, agencies, and studios."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
