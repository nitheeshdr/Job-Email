import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import LockGate from "@/components/LockGate";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "JobMail AI - Job Application Email Automation",
  description: "Automate personalized job application emails for frontend developer roles.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-[#ffffff] text-[#171717] min-h-screen selection:bg-[#006bff]/10 flex flex-col`}
      >
        <LockGate>
          <Navbar />
          <main className="flex-1 w-full max-w-7xl mx-auto px-4 pt-6 pb-20 sm:px-6 lg:px-8 md:pb-8">
            {children}
          </main>
        </LockGate>
      </body>
    </html>
  );
}
