import type { Metadata } from "next";
import { Inter, Playfair_Display, Poppins } from "next/font/google";
import "./globals.css";
import { SecurityProtectionLayer } from "@/components/SecurityProtectionLayer";
import {
  CookieConsent,
  DEFAULT_COOKIE_CONSENT_CONTENT,
} from "@/components/CookieConsent";
import { getPublicContent } from "@/lib/public-content";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-poppins",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
});

export const metadata: Metadata = {
  title: "Ma'aak – Premium Islamic & Single Parent Matrimony Platform",
  description:
    "A meaningful space for single parents and marriage-minded Muslims to find a compatible spouse. Powered by our ME → WHAT I WANT → WHAT I REQUIRE framework and Gale-Shapley stable matching.",
  icons: {
    icon: "/logo.png",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieConsent = await getPublicContent(
    "cookie-consent",
    DEFAULT_COOKIE_CONSENT_CONTENT,
  );

  return (
    <html
      lang="en"
      className={`${poppins.variable} ${inter.variable} ${playfair.variable}`}
    >
      <body className="min-h-screen bg-[#FBF7F2] text-black antialiased">
        <SecurityProtectionLayer>
          {children}
          <CookieConsent content={cookieConsent} />
        </SecurityProtectionLayer>
      </body>
    </html>
  );
}
