import React from "react";
import { CmsContentPage } from "@/components/CmsContentPage";
import type { PublicContentSection } from "@/components/PublicContentPage";

export const dynamic = "force-dynamic";

const SECTIONS: PublicContentSection[] = [
  {
    heading: "1. Protect Your Personal and Financial Information",
    paragraphs: [
      "Never share your personal/financial information with anyone.  Use the in-app chat until you feel comfortable.  Should anyone request any financial information, let us know immediately by reporting them.",
    ],
  },
  {
    heading: "2. Think Before You Click",
    paragraphs: [
      "Some scammers may try to lure you into clicking unsafe links in messages or emails.  Ma'aak will never ask for your username or password through email.  If in doubt report it.",
    ],
  },
  {
    heading: "3. Watch Out For Red Flags",
    paragraphs: [
      "Trust your gut, sob stories or urgent requests for money are red flags.  If in doubt block and report it.",
    ],
  },
  {
    heading: "4. Don’t Rush",
    paragraphs: [
      "Don’t rush into a meeting.  Build trust through chat and calls first.  A phone or video call can be a useful tool before meeting.",
    ],
  },
  {
    heading: "5. Meet and Stay in Public",
    paragraphs: [
      "Never meet at any private location, your home, date’s home or any other secluded location.  Meet in public populated areas.  If you feel unsafe at any time end the date immediately.",
    ],
  },
  {
    heading: "6. Inform Trusted Friends and Family",
    paragraphs: [
      "Share the details of who you are meeting with someone you trust.  Your location, time and who you are meeting with. Keep your mobile on you.",
    ],
  },
  {
    heading: "7. Take Charge of Your Transportation",
    paragraphs: [
      "Make sure you control how you travel to and from your meeting, so you can leave whenever you feel the need.",
    ],
  },
  {
    heading: "8. Trust Your Instincts",
    paragraphs: [
      "If something feels off, it probably is.  Do not hesitate to cancel the meeting.",
    ],
  },
  {
    heading: "9. Set boundaries",
    paragraphs: [
      "Be clear about what you are comfortable with, and do not feel pressured into anything.  Respecting your own limits is key to staying safe and confident.",
    ],
  },
  {
    heading: "10. If In Doubt Report It",
    paragraphs: [
      "If the person acts inappropriately or makes you feel unsafe, report them to [email protected] immediately.  If you are in danger call 999.",
    ],
  },
];

export default function SafetyGuidelinePage() {
  return (
    <CmsContentPage
      slug="safety-guideline"
      title="Safety Guidelines Tips to Stay Safe"
      lead="Meeting new people is fun but stay cautious.  Trust your instincts, prioritise your safety, and take steps to protect yourself, whether chatting online or meeting in person."
      sections={SECTIONS}
    />
  );
}
