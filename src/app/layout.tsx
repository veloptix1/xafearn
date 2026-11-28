import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import UserNotices from "@/components/UserNotices";
import ErrorReporter from "@/components/ErrorReporter";

const inter = Inter({ subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: "Xafearn - Messagerie",
  description: "Discutez avec la communauté",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" className={inter.className}>
      <body className="antialiased text-slate-900 bg-slate-50"><UserNotices />
        <ErrorReporter />
        {children}
      </body>
    </html>
  );
}
