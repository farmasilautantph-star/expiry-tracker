import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "900"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Expiry Tracker",
  description: "Outlet inventory expiry tracking system",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Expiry Tracker",
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#1d4ed8",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
      </head>
      <body className={`${inter.variable} font-sans`}>
        {children}
        <script
          dangerouslySetInnerHTML={{
            __html: `if('serviceWorker' in navigator){window.addEventListener('load',function(){navigator.serviceWorker.register('/sw.js')})}`,
          }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
document.addEventListener('touchmove',function(e){if(e.touches.length>1){e.preventDefault();}},{passive:false});
var _lte=0;document.addEventListener('touchend',function(e){var n=Date.now();if(n-_lte<=300){e.preventDefault();}_lte=n;},{passive:false});
document.addEventListener('wheel',function(e){if(e.ctrlKey){e.preventDefault();}},{passive:false});
`,
          }}
        />
      </body>
    </html>
  );
}
