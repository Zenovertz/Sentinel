import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "SENTINEL | Cyber Threat Intelligence",
  description: "AI-powered cyber threat intelligence and early warning platform",
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
