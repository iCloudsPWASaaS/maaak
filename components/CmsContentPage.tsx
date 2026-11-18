import React from "react";
import { getList, getPublicContent } from "@/lib/public-content";
import {
  PublicContentPage,
  type PublicContentSection,
} from "@/components/PublicContentPage";

interface CmsContentPageProps {
  slug: string;
  title: string;
  lastUpdated?: string;
  lead?: string;
  sections: PublicContentSection[];
}

export async function CmsContentPage({
  slug,
  title,
  lastUpdated,
  lead,
  sections,
}: CmsContentPageProps) {
  const content = await getPublicContent(slug, {
    title,
    lastUpdated,
    lead,
    sections,
  });

  return (
    <PublicContentPage
      title={content.title}
      lastUpdated={content.lastUpdated}
      lead={content.lead}
      sections={getList<PublicContentSection>(content.sections, sections)}
    />
  );
}
