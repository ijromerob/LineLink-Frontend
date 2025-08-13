'use client';

import type { Metadata } from 'next';
import { Geist, Geist_Mono, Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from 'react-hot-toast';
import { Providers } from './providers';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const inter = Inter({ subsets: ["latin"] });

const metadata: Metadata = {
  title: {
    default: 'LineLink - Manufacturing Line Monitoring System',
    template: '%s | LineLink',
  },
  description: 'Real-time monitoring and analytics for manufacturing production lines. Track efficiency, detect issues, and optimize your manufacturing process with LineLink.',
  keywords: [
    'manufacturing',
    'production line monitoring',
    'real-time analytics',
    'industrial IoT',
    'factory automation',
    'OEE tracking',
    'production efficiency',
  ],
  authors: [{ name: 'LineLink Team' }],
  creator: 'LineLink',
  publisher: 'LineLink',
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: '/',
    title: 'LineLink - Manufacturing Line Monitoring System',
    description: 'Real-time monitoring and analytics for manufacturing production lines',
    siteName: 'LineLink',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'LineLink - Manufacturing Line Monitoring System',
    description: 'Real-time monitoring and analytics for manufacturing production lines',
    creator: '@linelink',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon-16x16.png',
    apple: '/apple-touch-icon.png',
  },
  manifest: '/site.webmanifest',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#1a1a1a' },
  ],
};

interface RootLayoutProps {
  children: React.ReactNode;
}

export default async function RootLayout({ children }: RootLayoutProps) {

  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>
          {children}
          <Toaster position="top-right" />
        </Providers>
      </body>
    </html>
  );
}
