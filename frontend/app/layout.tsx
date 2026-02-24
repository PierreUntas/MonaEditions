import PrivyProvider from "@/app/PrivyProvider";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Layout from "../components/shared/Layout";
import { ThemeProvider } from "./context/ThemeContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Kigen - Certification d'Art sur Blockchain",
  description: "Kigen est une plateforme de certification d'œuvres d'art sur la blockchain, garantissant l'authenticité et la provenance de chaque création artistique.",
  keywords: ["blockchain", "art", "certification", "NFT", "artiste", "collectionneur", "authenticité", "provenance", "Web3"],
  authors: [{ name: "Kigen" }],
  openGraph: {
    title: "Kigen - Certification d'Art sur Blockchain",
    description: "Certification décentralisée d'œuvres d'art avec provenance vérifiable",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider>
          <PrivyProvider>
            <Layout>
              {children}
            </Layout>
          </PrivyProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
