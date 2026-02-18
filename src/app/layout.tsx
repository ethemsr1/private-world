import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

// DEĞİŞİKLİK BURADA: preload: false ekledik
const inter = Inter({ 
  subsets: ["latin"],
  preload: false,      // Bu satır o sarı uyarıyı susturur
  display: 'swap'      // Bu da yazıların yüklenirken görünür kalmasını sağlar (iyi bir ayardır)
});

export const viewport: Viewport = {
  themeColor: "#faf8f9",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: "Amor",
  description: "Sadece ikimize özel gizli bir dünya.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Bizim Dünyamız",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr">
      <head>
        <link rel="apple-touch-icon" href="/icon-512x512.png" />
      </head>
      <body className={`${inter.className} bg-[#faf8f9] text-slate-800 antialiased selection:bg-pink-500 selection:text-white`}>
        {children}
      </body>
    </html>
  );
}