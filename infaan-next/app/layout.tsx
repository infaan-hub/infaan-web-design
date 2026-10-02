import type { Metadata, Viewport } from "next";
import "../frontend/styles.css";

export const metadata: Metadata = {
  title: "Infaan Web and Design",
  description:
    "Infaan Web and Design subscription platform for web services, branding, digital ads, and maintenance.",
  verification: { google: "google1508cf61bdce0ebd" },
  icons: { icon: "/favicon.jpg" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;700&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <script src="https://accounts.google.com/gsi/client" async defer />
        {children}
      </body>
    </html>
  );
}
