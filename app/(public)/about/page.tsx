import React from "react";
import { getPublicContent } from "@/lib/public-content";

export const dynamic = "force-dynamic";

const DEFAULT_ABOUT = {
  title: "Ma'aak",
  subtitle: "For Parents, By Parents",
  body: "Become a member and search for your own unique love story!",
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

export default async function AboutPage() {
  const values = await getPublicContent("about", DEFAULT_ABOUT);

  return (
    <section className="public-content-section">
      <div className="public-container-md">
        <div className="public-page-heading">
          <h3 className="public-text-danger">{values.title}</h3>
          <h1 className="public-fs-5">{values.subtitle}</h1>
          <p>{values.body}</p>
        </div>
        <div className="public-content-card">
          <p>{values.intro}</p>
          <ul className="public-list">
            {values.points.map((point) => (
              <li key={point}>{point}</li>
            ))}
          </ul>
          <p>{values.closing}</p>
        </div>
      </div>
    </section>
  );
}
