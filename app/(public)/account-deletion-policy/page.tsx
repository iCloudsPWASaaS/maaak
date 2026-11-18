import React from "react";
import { CmsContentPage } from "@/components/CmsContentPage";
import type { PublicContentSection } from "@/components/PublicContentPage";

export const dynamic = "force-dynamic";

const SECTIONS: PublicContentSection[] = [
  {
    heading: "1. Introduction",
    paragraphs: [
      "Ma'aak Ltd (“Ma'aak”, “we”, “our”, or “us”) respects your right to control your personal data. This Account Deletion Policy explains how you can delete your account, what happens to your data when you do, and how long we retain certain information to meet legal and security obligations.",
    ],
  },
  {
    heading: "2. How to Delete Your Account",
    paragraphs: [
      "Self-service (recommended): If you are logged in, you can delete your account anytime from your settings page: maaak.co.uk/profile/settings.",
      "Follow the on-screen instructions to confirm deletion. For your security, we may ask you to re-authenticate.",
      "Unable to log in? If you cannot access your account, contact us at [email protected] from the email address associated with your account. We may request additional information to verify your identity.",
    ],
  },
  {
    heading: "3. What Deletion Means",
    items: [
      "Immediate effects: Your profile becomes hidden and inaccessible to other users as soon as you confirm deletion.",
      "Permanent removal: We schedule your account and profile content (e.g., photos, bio, preferences, matches, and in-app messages) for deletion from active systems within 30 days.",
      "Backups & logs: Residual copies may remain in backups and security logs for up to 90 days after deletion, after which they are overwritten in the normal course of business.",
    ],
    paragraphs: [
      "Deletion is irreversible. Once completed, your account and content cannot be restored.",
    ],
  },
  {
    heading: "4. Data We May Retain",
    paragraphs: [
      "We retain limited information where necessary to comply with law, enforce our terms, maintain security, and prevent fraud and abuse. Examples include:",
    ],
    items: [
      "Payment records and related transaction metadata (kept as required by tax, accounting, and financial regulations).",
      "Safety and fraud prevention data (e.g., device identifiers, risk flags, and enforcement records) where we have a legitimate interest to protect users and our service.",
      "Legal holds where we are required to preserve information in connection with an investigation, dispute, or legal request.",
    ],
  },
  {
    heading: "5. Messages and Interactions",
    paragraphs: [
      "Deleting your account removes your messages from your view. However, messages and interactions you had with other users may remain visible to those users (similar to how emails remain in a recipient’s inbox) until they delete them.",
    ],
  },
  {
    heading: "6. Third-Party Processors",
    paragraphs: [
      "We use trusted partners to operate parts of our service. For example:",
    ],
    items: [
      "Payments: If you made purchases, payment details are processed by our payment provider (e.g., Stripe). We do not store full card numbers. Some payment data must be retained for compliance.",
      "Identity verification: If you completed verification, that process may be handled by a verification provider (e.g., Veriff) in accordance with their privacy notice. We do not use biometric data for any purpose other than verification and fraud prevention.",
    ],
  },
  {
    heading: "7. Re-registration",
    paragraphs: [
      "You may create a new account after deletion, subject to our Terms & Conditions and any safety restrictions that may apply.",
    ],
  },
  {
    heading: "8. Exercising Your Legal Rights",
    paragraphs: [
      "In addition to self-service deletion, under UK data protection law (UK GDPR and the Data Protection Act 2018) and, where applicable, EU GDPR, you may request:",
    ],
    items: [
      "Erasure of your personal data;",
      "Access to the data we hold about you;",
      "Restriction or objection to certain processing; and",
      "Data portability for information you provided to us.",
    ],
  },
  {
    heading: "9. Appeals & Safety Exceptions",
    paragraphs: [
      "If your account was deleted due to safety violations or fraud prevention, we may retain information necessary to protect our community and prevent repeat abuse. You may contact us to appeal an enforcement action; however, we are not obligated to restore accounts that violated our policies.",
    ],
  },
  {
    heading: "10. Contact Us",
    paragraphs: [
      "Email: [email protected]",
    ],
  },
  {
    heading: "11. Changes to This Policy",
    paragraphs: [
      "We may update this Account Deletion Policy to reflect changes in our practices or legal requirements. We will revise the “Last updated” date above and, where appropriate, provide additional notice.",
      "If you need help before deleting your account, please visit your settings or contact support.",
    ],
  },
];

export default function AccountDeletionPolicyPage() {
  return (
    <CmsContentPage
      slug="account-deletion-policy"
      title="Account Deletion Policy"
      lastUpdated="Last updated: 5th October 2025"
      sections={SECTIONS}
    />
  );
}
