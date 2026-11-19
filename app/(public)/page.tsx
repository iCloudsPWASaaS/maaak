import React from "react";
import Link from "next/link";
import { Video } from "lucide-react";
import PublicBannerCarousel from "@/components/PublicBannerCarousel";
import { getDynamicBanner } from "@/services/banner-service";
import {
  getList,
  getPublicContent,
  getSection,
} from "@/lib/public-content";

export const dynamic = "force-dynamic";

type TextSection = {
  title?: string;
  subtitle?: string;
  body?: string;
  button?: string;
  href?: string;
};

type Step = {
  title: string;
  description: string;
  desktopDescription: string;
  icon: string;
};

type SafetyRule = {
  label: string;
  text: string;
};

type Feature = {
  text: string;
  icon: string;
};

const DEFAULT_GET_APP: TextSection = {
  title: "Get Our App",
  body: "Get our app on the Google Play Store or Apple App Store for a smooth on-the-go experience. Stay connected, stay informed, and access the best of our services right at your fingertips",
};

const DEFAULT_ABOUT: TextSection = {
  title: "Ma'aak",
  subtitle: "For Parents, By Parents",
  body: "Become a member and search for your own unique love story!",
};

const DEFAULT_ABOUT_COPY = {
  intro:
    "Ma'aak is a distinguished app designed for single Asian parents seeking meaningful connections. It offers a secure environment for individuals to engage with others who share similar experiences and values.",
  points: [
    "Connect with individuals who understand your journey.",
    "Experience a supportive community that honors your unique path.",
    "Easily find matches based on location, interests, and parenting style.",
  ],
  closing:
    "If you are not a parent, you are also welcome. Whether you are widowed, divorced, or single, we embrace all individuals and respect each person’s unique journey. Join us today and discover the possibilities!",
};

const DEFAULT_STEPS: Step[] = [
  {
    title: "Create",
    description: "Register for free and start searching.",
    desktopDescription: "Register for free and start\nsearching.",
    icon: "/images/icon-user-create.png",
  },
  {
    title: "Connect",
    description: "AI-BASED algorithm to connect profiles.",
    desktopDescription: "AI-BASED algorithm to connect\nprofiles.",
    icon: "/images/icon-user-connect.png",
  },
  {
    title: "Communicate",
    description: "Free messenger, videos and voice calling.",
    desktopDescription: "Free messenger, videos and\nvoice calling.",
    icon: "/images/icon-user-communication.png",
  },
];

const DEFAULT_SAFETY_RULES: SafetyRule[] = [
  {
    label: "No Nudity:",
    text: "Explicit or nude photos are strictly prohibited.",
  },
  {
    label: "No Screenshots:",
    text: "Screenshots are disabled to protect privacy.",
  },
  {
    label: "Limited Chats:",
    text: "Users can chat with a maximum of 3 people at a time.",
  },
  {
    label: "ID Verification:",
    text: "All users must complete identity verification.",
  },
  {
    label: "Location Restriction:",
    text: "Access is limited to users within the postcode provided.",
  },
];

const DEFAULT_VERIFIED: TextSection = {
  title: "Checked, Verified & Trusted",
  body: "Your Safety is important! All Ma'aak members are approved through our secure Passport or Driver's License checks.",
};

const DEFAULT_VISIBILITY: TextSection = {
  title: "Profile Visibility",
  body: "Crafting an exceptional online matrimonial profile involves showcasing your personality and partner preferences in a compelling way. By using our Preference Filters, you can fine-tune your search based on criteria like Ethnicity, Location, Education, Age, and more, which will enhance your chances of finding your ideal partner.",
};

const DEFAULT_CALLING: TextSection = {
  title: "Free Video",
  subtitle: "Calling",
  body: "Video calls offer a secure way to connect and get to know each other before meeting face-to-face.",
  button: "Visit our Safety Centre",
  href: "#community-guidline",
};

const DEFAULT_FEATURES: Feature[] = [
  {
    text: "Discover single parents\nin your area.",
    icon: "/images/icon-location.png",
  },
  {
    text: "Singles showcasing their authentic selves through comprehensive profiles.",
    icon: "/images/icon-ai-based.png",
  },
  {
    text: "AI-driven algorithm to match profiles based on user preferences.",
    icon: "/images/icon-profile-detailed.png",
  },
  {
    text: "Voice and Video\nCall",
    icon: "/images/icon-video-chat.png",
  },
];

const DEFAULT_GUIDELINES: TextSection = {
  title: "Ma'aak's Behaviour & Community Guidelines",
  href: "/faq",
};

const DEFAULT_FIND_SOMEONE: TextSection = {
  title: "Find your Special Someone",
};

const DEFAULT_SAFETY: TextSection = {
  title: "Safety Rules",
  button: "Visit our Safety Centre",
};

const DEFAULT_HOME_CONTENT = {
  getApp: DEFAULT_GET_APP,
  about: DEFAULT_ABOUT,
  aboutCopy: DEFAULT_ABOUT_COPY,
  steps: DEFAULT_STEPS,
  safetyRules: DEFAULT_SAFETY_RULES,
  verified: DEFAULT_VERIFIED,
  visibility: DEFAULT_VISIBILITY,
  calling: DEFAULT_CALLING,
  features: DEFAULT_FEATURES,
  guidelines: DEFAULT_GUIDELINES,
  findSomeone: DEFAULT_FIND_SOMEONE,
  safety: DEFAULT_SAFETY,
};

function renderLines(value: string) {
  return value.split("\n").map((line, index) => (
    <React.Fragment key={`${line}-${index}`}>
      {index > 0 && <br />}
      {line}
    </React.Fragment>
  ));
}

export default async function HomePage() {
  const content = await getPublicContent("home", DEFAULT_HOME_CONTENT);
  const banner = await getDynamicBanner(content);
  const getApp = getSection(content, "getApp", DEFAULT_GET_APP);
  const about = getSection(content, "about", DEFAULT_ABOUT);
  const aboutCopy = getSection(content, "aboutCopy", DEFAULT_ABOUT_COPY);
  const verified = getSection(content, "verified", DEFAULT_VERIFIED);
  const visibility = getSection(content, "visibility", DEFAULT_VISIBILITY);
  const calling = getSection(content, "calling", DEFAULT_CALLING);
  const guidelines = getSection(content, "guidelines", DEFAULT_GUIDELINES);
  const steps = getList<Step>(content.steps, DEFAULT_STEPS);
  const safetyRules = getList<SafetyRule>(
    content.safetyRules,
    DEFAULT_SAFETY_RULES,
  );
  const features = getList<Feature>(content.features, DEFAULT_FEATURES);
  const findSomeone = getSection(content, "findSomeone", DEFAULT_FIND_SOMEONE);
  const safety = getSection(content, "safety", DEFAULT_SAFETY);

  return (
    <>
      <PublicBannerCarousel
        images={banner.images}
        autoPlay={banner.autoPlay}
        intervalMs={banner.intervalMs}
        overlay={banner.overlay}
      />

      <section className="public-bg-light public-section-py">
        <div className="public-container">
          <h2 className="public-text-center public-text-capitalize d-md-none">
            {getApp.title}
          </h2>
          <div className="public-get-app-grid">
            <div className="public-get-app-image">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/images/get-our-app.png" alt="image" />
            </div>
            <div className="public-card-box">
              <h3 className="d-none d-md-block">{getApp.title}</h3>
              <p className="public-text-dark public-text-muted">
                {getApp.body}
              </p>
              <div className="public-store-row">
                <a href="/register" className="public-store-badge" aria-label="Appstore">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/images/app-store.png" alt="Appstore" width={150} />
                </a>
                <a href="/register" className="public-store-badge" aria-label="Playstore">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/images/play-store.png" alt="Playstore" width={150} />
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="public-bg-white public-section-py" id="about-maaak">
        <div className="public-container-md">
          <div className="public-text-center" style={{ padding: "0 12px", marginBottom: 32 }}>
            <h3 className="public-text-danger">{about.title}</h3>
            <h5 className="public-text-dark public-fs-5">{about.subtitle}</h5>
            <p>{about.body}</p>
          </div>
          <div className="public-about-grid">
            <div>
              <p>{aboutCopy.intro}</p>
              <ul className="public-list">
                {aboutCopy.points.map((point) => (
                  <li key={point}>{point}</li>
                ))}
              </ul>
              <p>{aboutCopy.closing}</p>
            </div>
            <div className="public-about-image">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/images/why-match-gold.png" alt="image" />
            </div>
          </div>
        </div>
      </section>

      <section className="public-find-someone">
        <picture className="public-find-someone-media">
          <source media="(min-width: 768px)" srcSet="/images/bg-special-someone.webp" />
          <img src="/images/bg-special-someone-mobile.webp" alt="image" />
        </picture>
        <div className="public-bg-overlay" />
        <div className="public-container-md public-find-someone-inner">
          <h3 className="public-text-center">{findSomeone.title}</h3>
          <div className="public-step-grid">
            {steps.map((step) => (
              <div className="public-step" key={step.title}>
                <div className="public-step-icon">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={step.icon} alt="" />
                </div>
                <h5>{step.title}</h5>
                <h6>{renderLines(step.desktopDescription)}</h6>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="public-bg-white public-section-py">
        <div className="public-container-md">
          <div className="public-safety-grid">
            <div className="public-safety-card">
              <h3>{safety.title}</h3>
              <ul className="public-list-unstyled public-small">
                {safetyRules.map((rule) => (
                  <li key={rule.label}>
                    <strong>{rule.label}</strong> {rule.text}
                  </li>
                ))}
              </ul>
              <p className="public-text-center" style={{ marginBottom: 0 }}>
                <Link href="#community-guidline" className="public-btn public-btn-pill public-btn-theme">
                  {safety.button}
                </Link>
              </p>
            </div>
            <div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/images/your-safety.webp" alt="image" className="public-safety-image" />
            </div>
          </div>
        </div>
      </section>

      <section className="public-bg-white public-section-py" id="safety">
        <div className="public-container-md">
          <div className="public-split-grid">
            <div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/verify-gold-logo.png"
                alt=""
                className="public-verified-image"
              />
            </div>
            <div>
              <div className="public-verified-copy">
                <h3 style={{ paddingTop: 12 }}>{verified.title}</h3>
                <p className="public-small">{verified.body}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="public-bg-white public-section-py">
        <div className="public-container-md" style={{ paddingTop: 24 }}>
          <div className="public-split-grid public-row-justify-center">
            <div className="public-visibility-copy">
              <h3>{visibility.title}</h3>
              <p className="public-text-dark public-small" style={{ marginTop: 12 }}>
                {visibility.body}
              </p>
            </div>
            <div>
              <div className="public-visibility-image">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/images/broad-visibility-gold.png" alt="" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="public-calling-section">
        <div className="public-bg-white public-section-py">
          <div className="public-container-md" style={{ paddingTop: 16 }}>
            <div className="public-calling-grid">
              <div className="public-calling-card public-shadow-lg public-rounded-4 public-bg-white">
                <div className="public-calling-icon">
                  <Video size={34} />
                </div>
                <h3 style={{ margin: "16px 0 12px" }}>{calling.title}</h3>
                <p style={{ marginBottom: 16 }}>
                  <button type="button" className="public-btn public-btn-pill public-btn-theme public-fs-6">
                    {calling.subtitle}
                  </button>
                </p>
                <h6 className="public-text-dark public-text-muted" style={{ marginTop: 24 }}>
                  {calling.body}
                </h6>
                <p style={{ marginTop: 24 }}>
                  <Link href={calling.href || "#community-guidline"} className="public-btn public-btn-theme">
                    {calling.button}
                  </Link>
                </p>
              </div>
              <div className="public-calling-image">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/images/video-call-image.webp" alt="" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="public-bg-white public-section-py">
        <div className="public-container-md" style={{ paddingTop: 48 }}>
          <div className="public-feature-grid">
            {features.map((feature) => (
              <div className="public-feature-card" key={feature.text}>
                <div className="public-feature-icon">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={feature.icon} alt="image" width={70} height={70} />
                </div>
                <h6>{renderLines(feature.text)}</h6>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="public-bg-light public-section-py">
        <div className="public-container">
          <h2 className="public-text-center public-text-capitalize d-md-none">
            {getApp.title}
          </h2>
          <div className="public-get-app-grid">
            <div className="public-get-app-image">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/images/get-our-app.png" alt="image" />
            </div>
            <div className="public-card-box">
              <h3 className="d-none d-md-block">{getApp.title}</h3>
              <p className="public-text-dark public-text-muted">
                {getApp.body}
              </p>
              <div className="public-store-row">
                <a href="/register" className="public-store-badge" aria-label="Appstore">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/images/app-store.png" alt="Appstore" width={150} />
                </a>
                <a href="/register" className="public-store-badge" aria-label="Playstore">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/images/play-store.png" alt="Playstore" width={150} />
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="public-guideline-section public-bg-light" id="community-guidline">
        <div className="public-container-md">
          <h2>
            <Link href={guidelines.href || "/faq"} className="public-text-decoration-underline">
              {guidelines.title}
            </Link>
          </h2>
        </div>
      </section>
    </>
  );
}
