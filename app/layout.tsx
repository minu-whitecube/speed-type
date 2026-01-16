import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// iOS Safari 하단 여백 문제 해결을 위한 viewport 설정
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover", // iOS에서 화면을 꽉 채워 하단 여백 제거
};

export const metadata: Metadata = {
  title: "챌린저스 따라쓰기 챌린지",
  description: "성공하면 최대 1만 원을 드려요!",
  icons: {
    icon: '/favicon.png',
    apple: '/favicon.png',
  },
  openGraph: {
    title: "챌린저스 따라쓰기 챌린지",
    description: "성공하면 최대 1만 원을 드려요!",
    images: [
      {
        url: '/og_image.png',
        width: 1200,
        height: 630,
        alt: '챌린저스 따라쓰기 챌린지',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: "챌린저스 따라쓰기 챌린지",
    description: "성공하면 최대 1만 원을 드려요!",
    images: ['/og_image.png'],
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
        {children}
      </body>
    </html>
  );
}
