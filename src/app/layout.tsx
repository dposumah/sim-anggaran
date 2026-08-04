import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { YearProvider } from "@/contexts/YearContext";
import ClientLayoutWrapper from "@/components/ClientLayoutWrapper";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SIM-Anggaran Dikbud",
  description: "Aplikasi Monitoring Anggaran Dinas Pendidikan dan Kebudayaan Daerah Kota Tomohon",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <YearProvider>
          <ClientLayoutWrapper>
            {children}
          </ClientLayoutWrapper>
        </YearProvider>
      </body>
    </html>
  );
}
