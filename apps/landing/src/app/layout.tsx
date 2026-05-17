import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "mimi. — the 3D agent workspace for notion",
  description:
    "a cozy 3D room where humans and chibi animal agents share notion as canonical state. tiger watches github, otter watches email, bunny watches calendar. mimi. is the dog.",
  icons: { icon: "/favicon.png", apple: "/favicon.png" },
  themeColor: "#302F2C",
  openGraph: {
    title: "mimi. — the 3D agent workspace for notion",
    description: "chibi animals watching your tools. one cozy room. notion is the ground truth.",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "mimi. room" }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "mimi.",
    description: "chibi animals watching your tools. one cozy room. notion is the ground truth.",
    images: ["/og.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
