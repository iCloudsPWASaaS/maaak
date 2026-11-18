import React from "react";
import { getList, getPublicContent } from "@/lib/public-content";

export const dynamic = "force-dynamic";

const DEFAULT_STEPS = [
  {
    title: "Create",
    description: "Register for free and start searching.",
    icon: "/images/icon-user-create.png",
  },
  {
    title: "Connect",
    description: "AI-BASED algorithm to connect profiles.",
    icon: "/images/icon-user-connect.png",
  },
  {
    title: "Communicate",
    description: "Free messenger, videos and voice calling.",
    icon: "/images/icon-user-communication.png",
  },
];

interface Step {
  title: string;
  description: string;
  icon: string;
}

const DEFAULT_HOW_IT_WORKS_CONTENT = {
  title: "Find your Special Someone",
  steps: DEFAULT_STEPS,
};

export default async function HowItWorksPage() {
  const content = await getPublicContent(
    "how-it-works",
    DEFAULT_HOW_IT_WORKS_CONTENT,
  );
  const steps = getList<Step>(content.steps, DEFAULT_STEPS);

  return (
    <section className="public-content-section">
      <div className="public-container-md">
        <div className="public-page-heading">
          <h1 className="public-text-primary">{content.title}</h1>
        </div>
        <div className="public-step-grid" style={{ marginTop: 0 }}>
          {steps.map((step) => (
            <div className="public-guideline-box public-text-center" key={step.title}>
              <div className="public-step-icon">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={step.icon} alt="" />
              </div>
              <h3>{step.title}</h3>
              <p style={{ marginBottom: 0 }}>{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
