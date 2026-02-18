import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ 
  subsets: ["latin"],
  preload: false,      // Font uyarısını engeller
  display: 'swap'      // Font yüklenene kadar yazının görünmesini sağlar
});

// Mobil görünüm ve renk ayarları
export const viewport: Viewport = {
  themeColor: "#faf8f9",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false, // Uygulama hissi için zoom'u kapattık
};

// Site kimliği ve ikon ayarları (EN ÖNEMLİ KISIM)
export const metadata: Metadata = {
  title: "Amor",
  description: "Sadece ikimize özel gizli bir dünya.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Amor",
  },
};
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr">
      {/* <head> etiketine gerek yok, metadata yukarıdan hallediyor */}
      <body className={`${inter.className} bg-[#faf8f9] text-slate-800 antialiased selection:bg-pink-500 selection:text-white`}>
        {children}
      </body>
    </html>
  );
}
