import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "mimi. — the 3D agent workspace for notion",
  description:
    "a cozy 3D room where humans and chibi animal agents share notion as canonical state. tiger watches github, otter watches email, bunny watches calendar. mimi. is the dog.",
  icons: { icon: "/icon.png" },
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
