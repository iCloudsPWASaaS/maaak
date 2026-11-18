import React from "react";
import { PublicNavbar, DEFAULT_NAVBAR_CONTENT } from "@/components/PublicNavbar";
import { PublicFooter } from "@/components/PublicFooter";
import { getPublicContent } from "@/lib/public-content";
import "./public.css";

export const dynamic = "force-dynamic";

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const navbar = await getPublicContent("navbar", DEFAULT_NAVBAR_CONTENT);

  return (
    <div className="public-site">
      <PublicNavbar content={navbar} />
      <main className="public-main">{children}</main>
      <PublicFooter />
    </div>
  );
}
