import React from "react";
import Link from "next/link";
import { Facebook, Instagram, Music2 } from "lucide-react";
import { getList, getPublicContent } from "@/lib/public-content";

interface FooterLink {
  label: string;
  href: string;
}

interface FooterColumn {
  title: string;
  links: FooterLink[];
}

const DEFAULT_COLUMNS: FooterColumn[] = [
  {
    title: "Company",
    links: [{ label: "About us", href: "/#about-maaak" }],
  },
  {
    title: "Help & Support",
    links: [
      { label: "Behaviour & Guidelines", href: "/faq" },
      { label: "Safety Guidelines", href: "/safety-guideline" },
      { label: "Safety Resources", href: "/safety-resources" },
      { label: "Contact", href: "/contact" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Terms & Conditions", href: "/terms" },
      { label: "Privacy Policy", href: "/privacy" },
      { label: "Children Privacy Policy", href: "/children-privacy-policy" },
      { label: "Account Deletion Policy", href: "/account-deletion-policy" },
      { label: "Cookies", href: "/cookie-policy" },
    ],
  },
  {
    title: "Product",
    links: [{ label: "Register", href: "/register" }],
  },
];

const DEFAULT_FOOTER_CONTENT = {
  columns: DEFAULT_COLUMNS,
  copyright: "© 2026 Ma'aak. All Rights Reserved.",
  poweredBy: "Powered by",
};

export async function PublicFooter() {
  const content = await getPublicContent("footer", DEFAULT_FOOTER_CONTENT);
  const columns = getList<FooterColumn>(content.columns, DEFAULT_COLUMNS);
  const visibleColumns =
    columns.length > 0
      ? columns.filter(
          (column) => column && Array.isArray(column.links) && column.title,
        )
      : DEFAULT_COLUMNS;

  return (
    <footer className="public-footer">
      <div className="public-container">
        <div className="public-footer-grid">
          <div className="public-footer-brand">
            <Link href="/">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.png" alt="" className="public-footer-logo" />
            </Link>
            <div className="public-socials">
              <a
                href="https://www.facebook.com/people/SingleAsian-Parents/pfbid0rymgtkpzL2Wq6ojN5a1ydZMM4EYAPbS62i5TFHyQhDaQ1AmQzUQTTeivXNLfQPDZl/?mibextid=wwXIfr&rdid=H0u92v7b25KgUcG1&share_url=https%3A%2F%2Fwww.facebook.com%2Fshare%2F1BYyKY6PLf%2F%3Fmibextid%3DwwXIfr"
                target="_blank"
                rel="noreferrer"
                aria-label="Facebook"
              >
                <Facebook />
              </a>
              <a
                href="https://www.instagram.com/singleasianparents/?igsh=MXZvYnloeWtxbXFnbw%3D%3D&utm_source=qr#"
                target="_blank"
                rel="noreferrer"
                aria-label="Instagram"
              >
                <Instagram />
              </a>
              <a
                href="https://www.tiktok.com/@singleasianparent?_t=ZN-8vvA5GMPSz8&_r=1"
                target="_blank"
                rel="noreferrer"
                aria-label="TikTok"
              >
                <Music2 />
              </a>
            </div>
          </div>

          <div className="public-footer-cols">
            {visibleColumns.map((column) => (
              <div className="public-footer-menu" key={column.title}>
                <h6>{column.title}</h6>
                <ul>
                  {column.links.map((link) => (
                    <li key={`${column.title}-${link.label}`}>
                      <Link href={link.href}>{link.label}</Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="public-footer-bottom">
          <p>
            {content.copyright ||
              "© 2026 Ma'aak. All Rights Reserved."}
          </p>
          <p className="public-footer-powered">
            {content.poweredBy || "Powered by"}
          </p>
        </div>
      </div>
    </footer>
  );
}
