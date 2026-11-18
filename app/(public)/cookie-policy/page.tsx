import React from "react";
import { CmsContentPage } from "@/components/CmsContentPage";
import type { PublicContentSection } from "@/components/PublicContentPage";

export const dynamic = "force-dynamic";

const SECTIONS: PublicContentSection[] = [
  {
    heading: "What Are Cookies?",
    paragraphs: [
      "Cookies are small text files stored on your device (computer, tablet, or smartphone) when you visit a website or use an app. They help us recognise your device, remember your preferences, and improve your overall experience.",
    ],
  },
  {
    heading: "How We Use Cookies",
    paragraphs: [
      "We use cookies for various purposes, including:",
    ],
    items: [
      "Essential Cookies: These are necessary for the functioning of our app. Without these cookies, certain features cannot be provided.",
      "Performance Cookies: These help us understand how users interact with our app by collecting data on usage patterns. This information helps us improve our app’s functionality and performance.",
      "Functional Cookies: These allow us to remember your preferences and improve your experience. For example, they can keep you logged in or remember your language settings.",
      "Advertising Cookies: These cookies are used to deliver advertisements relevant to you and your interests. They also help us measure the effectiveness of our advertising campaigns.",
    ],
  },
  {
    heading: "Third-Party Cookies",
    paragraphs: [
      "We may also allow third parties to place cookies on your device for analytics and advertising purposes. These third parties may collect data about your online activities over time and across different sites or apps.",
    ],
  },
  {
    heading: "Your Choices Regarding Cookies",
    paragraphs: [
      "You can manage your cookie preferences through your device settings or the app’s settings. You have the right to refuse or delete cookies, but please note that this may affect your experience on our app.",
    ],
    items: [
      "Browser Settings: Most web browsers allow you to control cookies through their settings. You can usually find these settings in the “Options” or “Preferences” menu of your browser.",
      "App Settings: Within our app, you may find options to manage your cookie preferences directly.",
    ],
  },
  {
    heading: "Changes to This Cookie Policy",
    paragraphs: [
      "We may update this cookie policy from time to time to reflect changes in our practices or for other operational, legal, or regulatory reasons. We encourage you to review this policy periodically for any updates.",
    ],
  },
  {
    heading: "Contact Us",
    paragraphs: [
      "If you have any questions about our cookie policy, please contact us at [email protected].",
    ],
  },
];

export default function CookiePolicyPage() {
  return (
    <CmsContentPage
      slug="cookie-policy"
      title="Cookie Policy for Ma'aak"
      lastUpdated="Last updated: 1st November 2024"
      lead="At Ma'aak we use cookies and similar technologies to enhance your experience on our website, we may employ cookies and various tracking technologies, including pixel tags, web beacons, device IDs, or advertising IDs. You can decline the use of cookies by adjusting your browser settings. However, please be aware that this may limit your access to some features of our website. This cookie policy explains what cookies are, how we use them, and your choices regarding cookie settings."
      sections={SECTIONS}
    />
  );
}
