import React from "react";
import { CmsContentPage } from "@/components/CmsContentPage";
import type { PublicContentSection } from "@/components/PublicContentPage";

export const dynamic = "force-dynamic";

const SECTIONS: PublicContentSection[] = [
  {
    heading: "Samaritans",
    paragraphs: [
      "Samaritans provides a confidential, non-judgmental space for anyone to share their worries, whatever they are getting to.",
      "www.samaritans.org",
      "You can call 116 123 from any phone, and the call is free and won't show up on your phone bill.",
    ],
  },
  {
    heading: "Muslim Youth Helpline",
    paragraphs: [
      "Culturally sensitive support & counselling for young Muslims, or anyone wanting that kind of support.",
      "www.myh.org.uk",
      "08088082008 Helpline is open from 4:00 PM – 10:00 PM, 365 days a year.",
    ],
  },
  {
    heading: "Mind",
    paragraphs: [
      "Advice, support and information for people experiencing mental health problems.",
      "www.mind.org.uk",
      "0330 123 3393",
    ],
  },
  {
    heading: "Police",
    paragraphs: [
      "If you believe someone’s life is in danger right now, you or someone else’s, call 999.",
      "If you need help urgently but it’s not life or death, there are alternatives: NHS 111 (with the option for mental health support)",
      "option for mental health support)",
      "Police are increasingly using what’s called the Right Care, Right Person approach: they try to make sure mental health or health professionals respond to calls when no crime is committed and no immediate risk exist.",
      "999",
    ],
  },
  {
    heading: "Women’s Aid",
    paragraphs: [
      "Women’s Aid is a UK charity that focuses on protecting women and children from domestic abuse.  Provides lifesaving support and safe spaces for women and children.",
      "www.womensaid.org.uk",
    ],
  },
];

export default function SafetyResourcesPage() {
  return (
    <CmsContentPage
      slug="safety-resources"
      title="Safety Resources"
      lead="Struggling with your thoughts or emotions? You don’t have to face it alone, support is available."
      sections={SECTIONS}
    />
  );
}
