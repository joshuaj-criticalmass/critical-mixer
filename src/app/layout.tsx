import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Critical Mixer",
  description: "Three days. One office. A few more reasons to say hello.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}