"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { BannerImage, BannerOverlay } from "@/services/banner-service";

type PublicBannerCarouselProps = {
  images: BannerImage[];
  autoPlay: boolean;
  intervalMs: number;
  overlay: BannerOverlay;
};

const FALLBACK_SLIDE: BannerImage = {
  imageUrl: "/images/mock1.png",
  alt: "Muslim matrimony banner",
  source: "fallback",
  query: "fallback",
};

const FALLBACK_OVERLAY: BannerOverlay = {
  show: true,
  eyebrow: "Halal Matrimony",
  title: "Find Your Perfect Match",
  subtitle: "A trusted matrimony community for Muslim single parents.",
  buttonText: "Create Your Profile",
  buttonHref: "/register",
};

export default function PublicBannerCarousel({
  images,
  autoPlay,
  intervalMs,
  overlay,
}: PublicBannerCarouselProps) {
  const slides = images.length > 0 ? images : [FALLBACK_SLIDE];
  const bannerOverlay = overlay || FALLBACK_OVERLAY;
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const duration = Math.max(1000, intervalMs);

  useEffect(() => {
    setActiveIndex(0);
  }, [slides.length]);

  useEffect(() => {
    if (!autoPlay || paused || slides.length < 2) return;

    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % slides.length);
    }, duration);

    return () => window.clearInterval(timer);
  }, [autoPlay, paused, duration, slides.length]);

  const goTo = (index: number) => {
    setActiveIndex((index + slides.length) % slides.length);
  };

  return (
    <section
      className="public-hero"
      aria-label="Matrimony banner carousel"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {slides.map((slide, index) => (
        <div
          key={`${slide.imageUrl}-${index}`}
          className={`public-hero-slide${index === activeIndex ? " is-active" : ""}`}
          aria-hidden={index !== activeIndex}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={slide.imageUrl}
            alt={slide.alt}
            loading={index === 0 ? "eager" : "lazy"}
          />
        </div>
      ))}

      <div className="public-hero-shade" aria-hidden="true" />

      {bannerOverlay.show && (
        <div className="public-hero-overlay">
          <div className="public-hero-overlay-content">
            <span className="public-hero-eyebrow">{bannerOverlay.eyebrow}</span>
            <h1>{bannerOverlay.title}</h1>
            <p>{bannerOverlay.subtitle}</p>
            <Link
              href={bannerOverlay.buttonHref || "/register"}
              className="public-btn public-btn-pill public-btn-theme public-hero-cta"
            >
              {bannerOverlay.buttonText}
            </Link>
          </div>
        </div>
      )}

      {slides.length > 1 && (
        <>
          <button
            type="button"
            className="public-hero-arrow public-hero-arrow-prev"
            onClick={() => goTo(activeIndex - 1)}
            aria-label="Previous banner"
          >
            &#8249;
          </button>
          <button
            type="button"
            className="public-hero-arrow public-hero-arrow-next"
            onClick={() => goTo(activeIndex + 1)}
            aria-label="Next banner"
          >
            &#8250;
          </button>

          <div className="public-hero-indicators" aria-hidden="true">
            {slides.map((slide, index) => (
              <button
                key={`${slide.imageUrl}-indicator`}
                type="button"
                tabIndex={-1}
                className={`public-hero-indicator${
                  index === activeIndex ? " is-active" : ""
                }`}
                onClick={() => goTo(index)}
                aria-label={`Show banner ${index + 1}`}
              />
            ))}
          </div>

          {autoPlay && (
            <div
              className={`public-hero-progress${paused ? " is-paused" : ""}`}
              aria-hidden="true"
            >
              <span
                key={`${activeIndex}-${duration}`}
                style={{ animationDuration: `${duration}ms` }}
              />
            </div>
          )}
        </>
      )}
    </section>
  );
}
