import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "XAFEARN — Ton statut, tes gains",
  description: "Réseau social de publicité rémunérée",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
