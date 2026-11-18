insert into matrimony.cms_pages (slug, title, subtitle, page_type, content, is_published)
values
  (
    'footer',
    'Ma''aak Footer',
    'Public website footer content and navigation',
    'page',
    '{
      "blurb": "A dignified, verified Islamic matrimony platform for single parents and marriage-minded Muslims seeking a compatible life partner.",
      "columns": [
        {
          "title": "Company",
          "links": [
            {"label": "About us", "href": "/about"}
          ]
        },
        {
          "title": "Help & Support",
          "links": [
            {"label": "How It Works", "href": "/how-it-works"},
            {"label": "Safety & FAQ", "href": "/faq"},
            {"label": "Contact", "href": "/contact"}
          ]
        },
        {
          "title": "Legal",
          "links": [
            {"label": "Terms & Conditions", "href": "/terms"},
            {"label": "Privacy Policy", "href": "/privacy"}
          ]
        },
        {
          "title": "Product",
          "links": [
            {"label": "Register", "href": "/register"},
            {"label": "Log in", "href": "/login"},
            {"label": "Membership Plans", "href": "/plans"}
          ]
        }
      ]
    }'::jsonb,
    true
  )
on conflict (slug) do nothing;

update matrimony.cms_pages
set
  content = '{
    "getApp": {
      "eyebrow": "Get Our App",
      "title": "Get Our App",
      "body": "Register from your phone or tablet and continue your marriage search anywhere. The Ma''aak web app works seamlessly on all modern browsers.",
      "primaryCta": "Open Mobile Registration",
      "primaryHref": "/register"
    },
    "about": {
      "eyebrow": "MAAAK",
      "title": "For Parents, By Parents",
      "body": "Become a member and search for your own unique love story. Ma''aak is a distinguished matrimony platform for Muslim single parents and marriage-minded individuals who want a secure environment built around shared faith, values, and family experience."
    },
    "safety": {
      "eyebrow": "Your Safety",
      "title": "Safety Rules",
      "body": "Every rule below is enforced through product design and server-side controls."
    },
    "verified": {
      "eyebrow": "Trusted Members",
      "title": "Checked, Verified & Trusted",
      "body": "Your safety matters. Ma''aak members can complete secure government ID verification through Didit, with server-side webhook validation before a verified badge is displayed."
    },
    "visibility": {
      "eyebrow": "Profile Visibility",
      "title": "Be Seen For Who You Really Are",
      "body": "Craft a compelling, modest profile that shows your personality, values, family life, and partner preferences. Preference filters help you fine-tune searches by location, education, age, faith practice, and more."
    },
    "calling": {
      "eyebrow": "Free Video Calling",
      "title": "Speak Before You Meet",
      "body": "Secure voice and video calls help you build rapport and assess compatibility in a dignified way before meeting face-to-face.",
      "primaryCta": "Visit Safety Centre",
      "primaryHref": "/faq"
    },
    "features": [
      {"title": "Discover marriage-minded members in your area.", "description": "Location-aware discovery with postcode privacy."},
      {"title": "Authentic, comprehensive profiles.", "description": "No anonymous browsing or hidden-photo culture."},
      {"title": "Compatibility-led matching.", "description": "Six weighted areas and mutual dealbreaker gates."},
      {"title": "Voice and video calling.", "description": "Speak safely before sharing personal contact details."}
    ],
    "guidelines": {
      "eyebrow": "Community",
      "title": "Ma''aak''s Behaviour & Community Guidelines",
      "primaryCta": "Read the Guidelines",
      "primaryHref": "/faq"
    }
  }'::jsonb || coalesce(content, '{}'::jsonb),
  updated_at = now()
where slug = 'home';
