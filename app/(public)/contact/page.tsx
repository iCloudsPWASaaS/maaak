import React from "react";
import {
  ContactForm,
  DEFAULT_CONTACT_CONTENT,
} from "@/components/ContactForm";
import { getPublicContent } from "@/lib/public-content";

export const dynamic = "force-dynamic";

export default async function ContactPage() {
  const content = await getPublicContent("contact", DEFAULT_CONTACT_CONTENT);

  return <ContactForm content={content} />;
}
