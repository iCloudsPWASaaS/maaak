import type { Metadata } from "next";
import { Poppins } from "next/font/google";
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
    <html lang="en" className={poppins.variable}>
      <body className="min-h-screen bg-[#FAF6F0] text-black antialiased">
        <SecurityProtectionLayer>
          {children}
          <CookieConsent content={cookieConsent} />
        </SecurityProtectionLayer>
      </body>
    </html>
  );
}
