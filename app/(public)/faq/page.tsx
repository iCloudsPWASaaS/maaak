import React from "react";
import { getList, getPublicContent } from "@/lib/public-content";

export const dynamic = "force-dynamic";

const SECTIONS = [
  {
    heading: "Respect Others' Boundaries",
    items: [
      "Honor personal boundaries and space.",
      "No pressure for personal info, meet-ups, or uncomfortable activities.",
      "If they're not interested or stop responding, let it go—no harassment or intimidation will be tolerated!",
    ],
  },
  {
    heading: "Be Honest and Authentic",
    items: [
      "Use recent and accurate photos of yourself.",
      "Be honest about your intentions—whether you're seeking a serious relationship, friendship, or something casual.",
      "Avoid misrepresenting your age, occupation, or other important details.",
    ],
  },
  {
    heading: "Communicate Clearly and Respectfully",
    items: [
      "Start conversations with polite and thoughtful messages, avoiding overly aggressive or explicit comments.",
      "Use appropriate language and avoid offensive, discriminatory, or derogatory remarks.",
      "Listen actively and respond thoughtfully to what the other person says.",
    ],
  },
  {
    heading: "Maintain Privacy and Security",
    items: [
      "Do not share personal information like your home address, financial details, or sensitive data too early.",
      "Be cautious about sharing social media handles until you feel comfortable.",
      "Report and block anyone who makes you feel unsafe or uncomfortable.",
    ],
  },
  {
    heading: "Consent is Key",
    items: [
      "Ensure that all interactions, including conversations, photos, and in-person meetings, are consensual.",
      "Never send unsolicited explicit messages or images.",
      "Respect the other person's right to say no or change their mind at any time.",
    ],
  },
  {
    heading: "Be Patient and Polite",
    items: [
      "Avoid spamming or sending multiple messages if someone doesn't respond right away.",
      "Be patient with responses, as people have different schedules and commitments.",
      "Handle rejection gracefully without taking it personally or retaliating.",
    ],
  },
  {
    heading: "Report Suspicious Behaviour",
    items: [
      "If you encounter fake profiles, scammers, or individuals violating the app’s guidelines, it’s important to report them to the app's support team.",
      "Trust your instincts; if something feels off, prioritise your safety and take the necessary steps to report the behavior.",
    ],
  },
  {
    heading: "Plan Safe Meetups",
    items: [
      "When meeting someone in person for the first time, choose a public place and inform a friend or family member of your plans.",
      "Avoid sharing too much about your routine, address, or personal life until you feel safe.",
      "Trust your instincts during the meetup; if you feel uncomfortable, it’s okay to leave.",
    ],
  },
  {
    heading: "Be Kind and Courteous",
    items: [
      "Extend kindness and respect to others, mirroring the treatment you wish to receive.",
      "Refrain from making judgments or assumptions based on superficial details.",
      "Express gratitude for people's time and honesty, regardless of the outcome.",
    ],
  },
  {
    heading: "Follow the Ma'aak’s Rules",
    items: [
      "Extend kindness and respect to others, mirroring the treatment you wish to receive.",
      "Refrain from making judgments or assumptions based on superficial details.",
      "Express gratitude for people's time and honesty, regardless of the outcome.",
    ],
  },
];

interface FaqSection {
  heading: string;
  items: string[];
}

const DEFAULT_FAQ_CONTENT = {
  title: "Ma'aak’s Behaviour & Community Guidelines",
  sections: SECTIONS,
};

export default async function FaqPage() {
  const content = await getPublicContent("faq", DEFAULT_FAQ_CONTENT);
  const sections = getList<FaqSection>(content.sections, SECTIONS);

  return (
    <section className="public-content-section">
      <div className="public-container-md">
        <div className="public-page-heading">
          <h1 className="public-text-primary">{content.title}</h1>
        </div>
        <div className="public-guideline-grid">
          {sections.map((section) => (
            <div className="public-guideline-box" key={section.heading}>
              <h3>{section.heading}</h3>
              <ul>
                {section.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
