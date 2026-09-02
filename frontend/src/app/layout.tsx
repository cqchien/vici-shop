import type { Metadata } from "next";
import { Be_Vietnam_Pro, Inter } from "next/font/google";
import "./globals.css";

const beVietnam = Be_Vietnam_Pro({
  variable: "--font-be-vietnam",
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700", "800"],
});

// Font số liệu (giá, KPI, mã đơn, SKU) — theo VICI Home DS, thay IBM Plex Mono.
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "VICI — Art Toys Saigon",
  description:
    "Săn secret, sưu tầm nghiêm túc. Blind box tỉ lệ minh bạch, drop giới hạn, pre-order cọc 30% — kiểm seal on-camera.",
};

// Áp theme trước khi hydrate để không chớp màu (theme lưu ở localStorage).
const themeInit = `try{var t=localStorage.getItem("vici_theme");if(t==="dark")document.documentElement.dataset.theme="dark"}catch(e){}`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="vi"
      className={`${beVietnam.variable} ${inter.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        {/* Material Symbols chưa có trong next/font — nạp trực tiếp theo DESIGN.md.
            display=block đúng cho icon font (tránh chớp chữ ligature); link đặt ở
            root layout nên áp dụng cho mọi trang (rule dưới là heuristic pages-router). */}
        {/* eslint-disable-next-line @next/next/google-font-display, @next/next/no-page-custom-font */}
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@20..48,300..600,0..1,0&display=block"
          rel="stylesheet"
        />
      </head>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
