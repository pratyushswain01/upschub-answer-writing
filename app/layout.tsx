import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "UPSChub - Answer Writing Practice",
  description: "Professional UPSC Answer Writing Tool by UPSChub",
  icons: {
    icon: "/upschub-logo.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-zinc-950 text-white min-h-screen flex flex-col`}>
        <Header />
        <main className="flex-1 pb-12">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}