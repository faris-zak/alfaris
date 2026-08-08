import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = { title: "AFM ATS CV Lab", description: "Private, evidence-grounded ATS CV tailoring workspace.", robots: { index: false, follow: false, nocache: true } };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body>{children}</body></html>; }
