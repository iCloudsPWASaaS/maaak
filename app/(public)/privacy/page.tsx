import React from "react";
import { CmsContentPage } from "@/components/CmsContentPage";
import type { PublicContentSection } from "@/components/PublicContentPage";

export const dynamic = "force-dynamic";

const SECTIONS: PublicContentSection[] = [
  {
    heading: "1. Introduction",
    paragraphs: [
      "Ma'aak Ltd (“Ma'aak”, “we”, “our”, or “us”) is committed to protecting and respecting your privacy.",
      "This Privacy Policy explains how we collect, use, and share your personal data when you use our app, in accordance with UK data protection laws, including the General Data Protection Regulation (GDPR) and the Data Protection Act 2018.",
      "By using Ma'aak, you agree to the collection and use of information in accordance with this policy. If you do not agree with this policy, please do not use our app.  We encourage you to read this document carefully to understand your rights and how we safeguard your data.",
      "We are registered as a data controller with the UK Information Commissioner’s Office (ICO), our registration number is ZB686919.",
      "Our data protection officer can be contacted at [email protected].",
      "By providing us with your data, you acknowledge that you have read and agree to the terms outlined in this legal document, which governs the use of your information.",
    ],
  },
  {
    heading: "1.0 Information We Collect",
    paragraphs: [
      "This processing is essential for fulfilling our contract with you.  We collect the following types of personal data when you use our app:",
    ],
  },
  {
    heading: "1.1 Information You Provide",
    paragraphs: [
      "To create meaningful connections, it is essential for you to share some basic information about yourself, including your profile details and the types of people you are interested in meeting. Additionally, using our service will generate data, such as your login times and how you interact with the platform.",
    ],
  },
  {
    heading: "1.1.1 Account Information",
    paragraphs: [
      "When you sign up, we collect your name, email address, phone number, gender, date of birth, and profile photos.",
    ],
  },
  {
    heading: "1.1.2 Profile Information",
    paragraphs: [
      "When you complete your profile, you share additional details about you, such as your gender, interests, preferences, job, education, approximate location, and other personal details to enhance your profile. The personal information you provide, such as religion, race, ethnicity, and biometric data - facial image, used for identification, along with any other information you choose to share while using our Services (such as your political views, health, and sexual orientation), will be classified as special category personal data. This type of data is subject to additional protections under data protection law.",
    ],
  },
  {
    heading: "1.1.3 Content Photos and Media",
    paragraphs: [
      "When you use our service, you may post photos, videos, audio, text to your profile, we collect and store them.",
    ],
  },
  {
    heading: "1.1.4 Messages and Interactions",
    paragraphs: [
      "We collect the content of your messages and interactions with other users within the app.",
    ],
  },
  {
    heading: "1.1.5 Purchase Data",
    paragraphs: [
      "When you make a purchase, we store information about the transaction, such as the items purchased, the date, and the price. The exact details we collect vary based on your payment method. If you pay directly with us rather than through a platform like iOS or Android, you'll need to provide your debit or credit card number or other financial details.  These details will be processed by Stripe payment gateway.",
    ],
  },
  {
    heading: "1.1.6 Customer Support Data",
    paragraphs: [
      "When you reach out to us, you share information that may be essential for us to assist with your enquiry. Additionally, others may submit questions or reports that involve you.",
    ],
  },
  {
    heading: "1.1.7 Research Data",
    paragraphs: [
      "We will occasionally conduct:",
    ],
    items: [
      "(i) surveys, focus groups, or market studies for research and",
      "(ii) promotions, events, or contests for marketing.",
    ],
  },
  {
    heading: "1.1.8 Biometric Data",
    paragraphs: [
      "This is provided for identification purposes.  To ensure you are a real person and to protect against fraud and abuse.  Our third-party verification provider will use facial recognition technology against your Passport or Driving License.  Once you have been successfully verified a Blue Tick will appear against your profile.",
    ],
  },
  {
    heading: "1.1.9",
    paragraphs: [
      "Ma'aak will have access to the results of the verification process.  We may use this process and the related information to confirm your identity and safeguard against fraud and misrepresentation.   We will not utilise, share, or store your biometric information for any other commercial purposes.  Verification Provider processes this information on our behalf strictly in accordance with our contractual agreements.  For further information regarding Verification privacy please see www.veriff.com/privacy-notice.",
    ],
  },
  {
    heading: "2. Information Collected Automatically",
    paragraphs: [
      "Usage Data: We collect information on how you use the app, such as your interactions with other users, profile views, and matches.",
      "Device Information: We collect information about the device you use to access the app, such as:",
    ],
    items: [
      "Your IP address",
      "Device type",
      "Operating system",
      "Browser plug-in types and version",
      "App crashes",
      "Internet service provider",
      "Your login information",
      "Time zone setting",
      "Preferred language and unique device identifiers.",
    ],
  },
  {
    heading: "Location Data and Consent",
    paragraphs: [
      "Location Data: With your consent, we collect and process location data to enhance your experience by suggesting matches near you.",
      "Consent (if legally required). When consent is not mandated by law, we rely on our legitimate interests to analyse how users interact with our Services and to develop and promote our business.",
    ],
  },
  {
    heading: "3. Information from Third Parties",
    paragraphs: [
      "We may receive personal data about you from third-party services that you use to sign in, such as social media accounts (e.g., Facebook, Google).",
      "We may engage third-party service providers to assist with the operation of our platform, including hosting, analytics, and customer support. These third parties may process your data on our behalf but are bound by contractual obligations to protect your information and use it only for the purposes for which it was provided.",
    ],
  },
  {
    heading: "4. How We Use Your Information",
    paragraphs: [
      "We use your personal data to:",
    ],
    items: [
      "Provide and improve the app’s services, such as recommending potential matches and facilitating messaging.",
      "onalise your user experience, including content and match suggestions based on your preferences and location.",
      "Communicate with you about your account, updates, and promotions (if you have opted-in).",
      "Monitor, detect, and prevent fraud, abuse, or other harmful activities.",
      "Comply with legal obligations and enforce our terms of use.",
      "Processing payments to enable your purchases on our services.",
      "We collect data to conduct advertising and marketing campaigns to promote our service and to show ads to our users which are tailored to their interested.",
      "To improve our services and develop new ones, we will analyse and review how users use our service, how they interact with our support team to improve service quality.",
      "To keep users safe on our service we will create and enhance tools to prevent, identify, and combat violations of our Terms & Conditions.",
    ],
  },
  {
    heading: "5. Sharing Your Information",
    paragraphs: [
      "We do not sell your personal data to third parties. However, we may share your information with:",
    ],
    items: [
      "Other Users: Information on your profile (e.g., name, photos, bio) will be visible to other users of the app.",
      "Service Providers: We use trusted third-party service providers to perform tasks on our behalf (e.g., hosting, analytics, customer support, ID verification) who are bound by data protection agreements.",
      "Legal and Regulatory Authorities: We may disclose your data to law enforcement or regulators if required by law or to protect our legal rights.",
    ],
  },
  {
    heading: "6. International Data Transfers",
    paragraphs: [
      "Ma'aak operates primarily within the UK but may need to transfer or store personal data outside the UK and the European Economic Area (EEA) for the purposes of providing our services and improving user experiences.",
      "Your personal data may be transferred to and processed in countries outside of the UK, including countries that may not have equivalent data protection laws. When we transfer data internationally, we ensure that appropriate safeguards are in place to protect your data, such as standard contractual clauses approved by the European Commission.",
    ],
  },
  {
    heading: "7. Data Retention",
    paragraphs: [
      "Data Retention",
      "If you choose to discontinue using our service, you can close your account at any time, and your profile will be hidden from other members, after which your personal data will be deleted or anonymised, except for data that we are required to retain by law or for legitimate business purposes.",
      "We will retain all data if there is an ongoing issue, claim, or dispute that necessitates keeping the relevant information until it is fully resolved.",
      "We are required to retain certain data as proof of our compliance with relevant laws.",
    ],
  },
  {
    heading: "8. Your Rights",
    paragraphs: [
      "Under the GDPR and UK data protection law, you have the following rights:",
    ],
    items: [
      "Right to Access: You have the right to request access to the personal data we hold about you.  This is commonly known as a \"Subject Access Request\" (SAR).",
      "Right to Rectification: You have the right to request correction of inaccurate or incomplete data.",
      "Right to Erasure: You can request that we delete your personal data under certain conditions, such as:",
      "If the data is no longer necessary for the purposes it was collected for",
      "If you withdraw consent (where consent was the basis for processing)",
      "If the data has been unlawfully processed",
      "If the data must be erased to comply with a legal obligation",
      "However, this right is not absolute and is subject to certain exceptions.",
      "Right to Restrict Processing: You can request that we limit how we process your data.",
      "Right to Data Portability: You can request that your personal data be provided to you in a structured, commonly used, and machine-readable format (e.g., CSV). You also have the right to transfer that data to another service provider, provided that the processing is based on consent or a contract and carried out by automated means.",
      "Right to Object: You can object to certain types of data processing, such as direct marketing.",
      "Right to Withdraw Consent: Where processing is based on your consent, you can withdraw your consent at any time.",
    ],
  },
  {
    heading: "9. Security",
    paragraphs: [
      "To exercise any of these rights, please contact us at [email protected].",
      "We store your personal information securely on our servers for the duration necessary to provide our services and to comply with legal and regulatory requirements.  We implement a range of security measures to protect your personal information from unauthorised access, alteration, or disclosure. While we take reasonable steps to safeguard your data, no system is completely secure, and we cannot guarantee the absolute security of your information.  We recommend that you keep your account information confidential and notify us immediately of any unauthorised use.",
    ],
  },
  {
    heading: "10. Cookies & Tracking Technologies",
    paragraphs: [
      "We may use cookies, beacons, and similar technologies to improve our service and customise your experience. You can manage cookies through your device settings or your browser’s settings.  Please refer to our Cookie Policy.",
    ],
  },
  {
    heading: "11 Children’s Privacy - Age Restriction",
    paragraphs: [
      "Our app is not intended for individuals under the age of 18.  We do not knowingly collect or solicit personal information from children under 18.  If we become aware that we have collected data from someone under the age of 18, we will delete that information.",
      "If you suspect that a member is under the age of 18 report this immediately to [email protected]",
    ],
  },
  {
    heading: "12. Changes to This Policy",
    paragraphs: [
      "We may update this Privacy Policy periodically to reflect changes in our practices or legal requirements. We will notify you of any significant changes and update the “Last Updated” date at the top of this page.  Continued use of our services after changes to this Privacy Policy constitutes acceptance of those changes.",
    ],
  },
  {
    heading: "13. Contact Us",
    paragraphs: [
      "If you have any questions about this Privacy Policy or our data practices, please contact us at:",
      "Email: [email protected]",
      "Address: Ma'aak LTD, Clyde Offices, 2nd Floor, 48 West George Street, Glasgow, G2 1BP, United Kingdom",
      "Last Updated: 28th March 2025",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <CmsContentPage
      slug="privacy"
      title="Privacy Policy"
      lastUpdated="Last updated: 28th March 2025"
      sections={SECTIONS}
    />
  );
}
