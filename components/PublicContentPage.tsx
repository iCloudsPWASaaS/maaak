import React from "react";

export interface PublicContentSection {
  heading: string;
  paragraphs?: string[];
  items?: string[];
  ordered?: boolean;
}

interface PublicContentPageProps {
  title: string;
  lastUpdated?: string;
  lead?: string;
  sections: PublicContentSection[];
}

export function PublicContentPage({
  title,
  lastUpdated,
  lead,
  sections,
}: PublicContentPageProps) {
  return (
    <section className="public-content-section">
      <div className="public-container-md">
        <div className="public-page-heading">
          <h1>{title}</h1>
          {lastUpdated && <p className="public-small public-text-muted">{lastUpdated}</p>}
          {lead && <p style={{ marginTop: 16 }}>{lead}</p>}
        </div>
        <div className="public-content-card public-legal-body">
          {sections.map((section) => (
            <div key={section.heading}>
              <h2>{section.heading}</h2>
              {(section.paragraphs || []).map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
              {section.items && section.items.length > 0 && (
                section.ordered ? (
                  <ol>
                    {section.items.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ol>
                ) : (
                  <ul>
                    {section.items.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                )
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
