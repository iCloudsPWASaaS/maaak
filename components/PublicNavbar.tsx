"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Download, Menu, X } from "lucide-react";

export const DEFAULT_NAVBAR_CONTENT = {
  download: "Download",
  register: "Register",
  login: "Sign In",
  signIn: "Sign In",
  modalTitle: "Get Our App",
  modalBody:
    "Get our app on the Google Play Store or Apple App Store for a smooth on-the-go experience. Stay connected, stay informed, and access the best of our services right at your fingertips",
};

interface NavbarContent {
  download?: string;
  register?: string;
  login?: string;
  signIn?: string;
  modalTitle?: string;
  modalBody?: string;
}

export function PublicNavbar({
  content = DEFAULT_NAVBAR_CONTENT,
}: {
  content?: NavbarContent;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [downloadOpen, setDownloadOpen] = useState(false);

  const downloadButton = (
    <button
      type="button"
      className="public-btn public-btn-sm public-btn-theme download-button"
      onClick={() => setDownloadOpen(true)}
    >
      <Download size={14} />
      <span>{content.download || DEFAULT_NAVBAR_CONTENT.download}</span>
    </button>
  );

  return (
    <header className="public-header">
      <div className="public-container public-header-inner">
        <Link href="/" className="public-logo-link" aria-label="Ma'aak home">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="" className="public-logo" />
        </Link>

        <div className="public-header-actions">
          {downloadButton}
          <Link
            href="/register"
            className="public-btn public-btn-sm public-btn-rounded4 public-btn-theme"
          >
            {content.register || DEFAULT_NAVBAR_CONTENT.register}
          </Link>
          <Link
            href="/login"
            className="public-btn public-btn-sm public-btn-rounded4 public-btn-outline-theme"
          >
            {content.login || DEFAULT_NAVBAR_CONTENT.login}
          </Link>
          <button
            type="button"
            className="public-btn public-btn-sm public-mobile-toggle"
            aria-label="Toggle menu"
            onClick={() => setMobileOpen((open) => !open)}
          >
            {mobileOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="public-mobile-menu">
          <Link href="/register" className="public-btn public-btn-theme" onClick={() => setMobileOpen(false)}>
            {content.register || DEFAULT_NAVBAR_CONTENT.register}
          </Link>
          <Link href="/login" className="public-btn public-btn-outline-theme" onClick={() => setMobileOpen(false)}>
            {content.signIn || DEFAULT_NAVBAR_CONTENT.signIn}
          </Link>
        </div>
      )}

      {downloadOpen && (
        <div
          className="public-modal-backdrop"
          role="presentation"
          onClick={() => setDownloadOpen(false)}
        >
          <div
            className="public-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Get Our App"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="public-modal-head">
              <h3>{content.modalTitle || DEFAULT_NAVBAR_CONTENT.modalTitle}</h3>
              <button
                type="button"
                className="public-modal-close"
                aria-label="Close"
                onClick={() => setDownloadOpen(false)}
              >
                <X size={20} />
              </button>
            </div>
            <div className="public-modal-body">
              <div className="public-modal-row">
                <div className="public-get-app-image" style={{ height: 220 }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/images/get-our-app.png" alt="image" />
                </div>
                <div className="public-modal-copy">
                  <p style={{ marginBottom: 48 }}>
                    {content.modalBody || DEFAULT_NAVBAR_CONTENT.modalBody}
                  </p>
                  <div className="public-store-row">
                    <a href="/register" className="public-store-badge" onClick={() => setDownloadOpen(false)}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src="/images/app-store.png" alt="Appstore" width={150} />
                    </a>
                    <a href="/register" className="public-store-badge" onClick={() => setDownloadOpen(false)}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src="/images/play-store.png" alt="Playstore" width={150} />
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
