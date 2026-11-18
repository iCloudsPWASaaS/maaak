import React from "react";
import { CmsContentPage } from "@/components/CmsContentPage";
import type { PublicContentSection } from "@/components/PublicContentPage";

export const dynamic = "force-dynamic";

const SECTIONS: PublicContentSection[] = [
  {
    heading: "1. Who the App Is Intended For",
    paragraphs: [
      "Content: Ma'aak’s app is strictly intended for individuals aged 18 and over.",
      "Policy Statement: The app does not knowingly collect or solicit personal data from children under 18. If such data is discovered, Ma'aak commits to deleting it immediately.",
      "Implications: This ensures compliance with child protection standards and privacy regulations.",
    ],
  },
  {
    heading: "2. Reporting Minors",
    paragraphs: [
      "Content: If someone suspects a member is under the age of 18, they are encouraged to report this immediately to the designated email.",
      "Contact Point: Reports should be sent to [email protected] (the general contact in the privacy policy).",
      "Implications: This opens a clear channel for community members or third parties to raise concerns, enabling the platform to take timely action.",
    ],
  },
  {
    heading: "3. Verification & Identity Assurance",
    paragraphs: [
      "Content: While the policy doesn’t mention age verification mechanisms in the children’s privacy section itself, elsewhere (e.g., on the main site and Terms & Conditions), it is stated that:",
      "ID Verification: Passport or Driver’s License is required.",
      "Biometric Verification: A biometric verification process confirms identity, producing a “Blue Tick” on verified profiles.",
      "Implications: These steps not only guard against underage registrations but also enhance overall trust and safety by ensuring users are real and adult.",
    ],
  },
  {
    heading: "4. Zero-Tolerance for CSAE / Safety Commitments",
    paragraphs: [
      "Content: While there is no explicit section titled “Child Sexual Abuse and Exploitation (CSAE) Policy,” the combined measures reveal the company's broader stance:",
      "Age Restriction: The app is not for under-18 users.",
      "Conduct Rules: Explicit or suggestive content is not allowed; nudity and privacy breaches are prohibited.",
      "Law Enforcement Cooperation: The company works with relevant authorities when required.",
      "Implications: These policies, though not labeled CSAE-specific, contribute to a safer environment by preventing interactions with minors and disallowing sexually inappropriate content.",
    ],
  },
  {
    heading: "5. User Education & Awareness",
    paragraphs: [
      "Content: Ma'aak promotes safe online interactions by encouraging users to be mindful of what they share and who they engage with on the platform.",
      "Safety Guidance: Members are advised to avoid sharing sensitive personal information and to use in-app reporting tools to flag inappropriate behavior.",
      "Implications: By educating members on responsible use, the platform reduces risks of exploitation and fosters a culture of awareness and accountability.",
    ],
  },
  {
    heading: "6. Monitoring & Enforcement",
    paragraphs: [
      "Content: Ma'aak actively monitors accounts, profiles, and reported content to ensure compliance with its Terms of Use and Privacy Policy.",
      "Enforcement Actions: Violations, including attempts at underage use or sharing harmful content, may result in warnings, suspensions, or permanent bans.",
      "Lawful Cooperation: In cases involving suspected exploitation or abuse, Ma'aak cooperates with law enforcement agencies to take appropriate action.",
      "Implications: Continuous monitoring and strict enforcement maintain platform integrity, protect vulnerable individuals, and deter harmful activity.",
    ],
  },
  {
    heading: "7. Contact us",
    paragraphs: [
      "If you have any questions about this Privacy Policy or our data practices, please contact us at:",
      "Email: [email protected]",
      "Address: Ma'aak LTD, Clyde Offices, 2nd Floor, 48 West George Street, Glasgow, G2 1BP, United Kingdom.",
      "Last updated: 30th August 2025",
    ],
  },
];

export default function ChildrenPrivacyPolicyPage() {
  return (
    <CmsContentPage
      slug="children-privacy-policy"
      title="Children Privacy Policy"
      lastUpdated="Last updated: 30th August 2025"
      sections={SECTIONS}
    />
  );
}
