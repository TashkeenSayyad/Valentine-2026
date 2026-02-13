import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Anusha Constellation",
  description: "A cinematic constellation reveal Valentine microsite"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
