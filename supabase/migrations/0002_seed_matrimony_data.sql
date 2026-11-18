-- ============================================================================
-- MAAAK – Premium Matrimony Platform
-- Migration 0002: Seed Roles, Subscription Plans, CMS Content, Settings & Questions
-- ============================================================================

-- 1. Seed Admin Roles
insert into matrimony.admin_roles (role_name, permissions, description)
values
  ('super_admin', '["*"]'::jsonb, 'Full platform administrative control including CMS, billing, matching weights, and role management.'),
  ('admin', '["users.manage", "profiles.moderate", "verifications.review", "matching.manage", "subscriptions.manage", "cms.manage", "reports.resolve", "feedback.manage", "audit.read"]'::jsonb, 'Standard administrator with access to CMS, user management, matching, and moderation.'),
  ('moderator', '["profiles.moderate", "verifications.review", "reports.resolve", "feedback.manage", "audit.read"]'::jsonb, 'Content and safety moderator for reviewing profiles, photos, ID checks, and user reports.')
on conflict (role_name) do update set
  permissions = excluded.permissions,
  description = excluded.description;

-- 2. Seed Subscription Plans (CMS-Managed: Free, Premium, Premium Plus)
insert into matrimony.subscription_plans (
  slug, name, tagline, description, price_monthly, currency, billing_interval,
  trial_days, trial_disclosure_text, max_introduction_requests, max_active_chats,
  can_message, can_audio_call, can_video_call, can_see_who_liked, can_use_advanced_filters,
  features, badge_text, is_coming_soon, is_active, is_purchasable, sort_order
)
values
  (
    'free',
    'Free Membership',
    'Begin your journey and explore compatible matches',
    'Create your full marriage profile, discover mutually eligible matches through our Gale-Shapley engine, and send up to 10 introduction requests.',
    0.00,
    'GBP',
    'month',
    0,
    'Free forever with a lifetime allowance of 10 introduction requests.',
    10,
    3,
    false,
    false,
    false,
    false,
    true,
    '["Create full compatibility profile", "Browse mutually eligible profiles", "Send up to 10 introduction requests", "View mutual compatibility breakdown", "Didit ID verification badge"]'::jsonb,
    'Available at Launch',
    false,
    true,
    true,
    1
  ),
  (
    'premium',
    'Premium Membership',
    'First month free — complete access to meaningful introductions & calling',
    'Unlock unlimited introduction requests, real-time encrypted messaging (up to 3 active conversations at a time), and secure Agora voice & video calling.',
    24.99,
    'GBP',
    'month',
    30,
    'Your first 30 days are 100% free under our introductory arrangement. No payment is taken during the first month. After your 30-day free trial ends, your subscription renews automatically at £24.99/month unless cancelled before the trial end date.',
    null,
    3,
    true,
    true,
    true,
    true,
    true,
    '["1st Month 100% Free (£0.00 today)", "Unlimited introduction requests", "Real-time messaging (up to 3 active chats)", "Secure in-app Voice & Video calling", "Priority Gale-Shapley match placement", "See who liked & bookmarked your profile", "Full compatibility & values alignment breakdown"]'::jsonb,
    '1st Month Free',
    false,
    true,
    true,
    2
  ),
  (
    'premium-plus',
    'Premium Plus',
    'Bespoke concierge introductions & enhanced family matchmaking',
    'Our upcoming concierge tier featuring dedicated matchmaking consultations, enhanced family introductions, and priority profile curation.',
    49.99,
    'GBP',
    'month',
    0,
    'Coming Soon — Administrators can activate this tier when launched.',
    null,
    3,
    true,
    true,
    true,
    true,
    true,
    '["Everything in Premium Membership", "Dedicated matrimonial advisor", "Curated family & wali introduction support", "Priority profile review & spotlight", "Exclusive community events access"]'::jsonb,
    'COMING SOON',
    true,
    true,
    false,
    3
  )
on conflict (slug) do update set
  name = excluded.name,
  tagline = excluded.tagline,
  description = excluded.description,
  price_monthly = excluded.price_monthly,
  trial_days = excluded.trial_days,
  trial_disclosure_text = excluded.trial_disclosure_text,
  max_introduction_requests = excluded.max_introduction_requests,
  can_message = excluded.can_message,
  can_audio_call = excluded.can_audio_call,
  can_video_call = excluded.can_video_call,
  features = excluded.features,
  badge_text = excluded.badge_text,
  is_coming_soon = excluded.is_coming_soon,
  is_purchasable = excluded.is_purchasable,
  sort_order = excluded.sort_order;

-- 3. Seed CMS Settings (Matching Weights from profile.xlsx NOTES, Location Restrictions, Security)
insert into matrimony.cms_settings (setting_key, setting_group, setting_value, description)
values
  (
    'matching_weights',
    'matching',
    '{
      "family_future": 0.25,
      "relationship_intention": 0.20,
      "my_values": 0.20,
      "dating_as_parent": 0.15,
      "personality": 0.10,
      "lifestyle_preferences": 0.10,
      "enforce_dealbreakers": true,
      "max_dealbreakers": 5,
      "proposer_gender": "Male",
      "receiver_gender": "Female"
    }'::jsonb,
    'Authoritative compatibility weighting from profile.xlsx (NOTES sheet). Must sum to 1.00 (100%). Dealbreakers are mandatory Pass/Fail gates outside the score.'
  ),
  (
    'location_restrictions',
    'location',
    '{
      "enabled": true,
      "require_verified_postcode": true,
      "country_restriction": "United Kingdom",
      "allowed_postcode_prefixes": [],
      "enforce_user_distance_preference": true,
      "hide_exact_postcode": true,
      "display_mode": "city_and_outward_code"
    }'::jsonb,
    'Postcode-based location eligibility rules. Precise postcodes are never exposed to other users.'
  ),
  (
    'security_deterrents',
    'security',
    '{
      "disable_text_selection": true,
      "disable_context_menu": true,
      "disable_image_drag": true,
      "detect_screenshot_shortcuts": true,
      "watermark_profile_photos": true,
      "log_suspicious_events": true,
      "max_active_chats": 3,
      "free_intro_request_limit": 10
    }'::jsonb,
    'Content protection, watermarking, and communication limits.'
  ),
  (
    'contact_settings',
    'general',
    '{
      "support_email": "info@maaak.co.uk",
      "feedback_email": "info@maaak.co.uk",
      "company_name": "MAAAK Matrimony Ltd",
      "headquarters": "London, United Kingdom",
      "tagline": "A meaningful space for single parents & Marriage-Minded Muslims to find a compatible partner."
    }'::jsonb,
    'Platform contact and support details.'
  )
on conflict (setting_key) do update set
  setting_value = excluded.setting_value,
  description = excluded.description;

-- 4. Seed CMS Pages (Public Website, Legal, Safety, Email & Notification Templates)
insert into matrimony.cms_pages (slug, title, subtitle, page_type, content, meta_title, meta_description, is_published)
values
  (
    'home',
    'Welcome to Ma''aak',
    'A meaningful space for single parents and marriage-minded individuals to find a truly compatible partner.',
    'page',
    '{
      "hero": {
        "badge": "Checked, Verified & Trusted Matrimony",
        "headline": "A Meaningful Space to Find a Compatible Partner for Marriage",
        "subheadline": "Built around mutual values, family life, and our signature ME → WHAT I WANT → WHAT I REQUIRE compatibility framework. Register today with your first month of Premium completely free.",
        "primaryCta": "Start Your Free Month",
        "secondaryCta": "How Ma''aak Works"
      },
      "steps": [
        {
          "title": "Create",
          "subtitle": "Complete your structured profile",
          "description": "Share who you are, your values, parenting life, and up to 5 non-negotiable dealbreakers."
        },
        {
          "title": "Connect",
          "subtitle": "Gale-Shapley Mutual Matching",
          "description": "Our deterministic stability engine verifies both sides'' dealbreakers before calculating compatibility."
        },
        {
          "title": "Communicate",
          "subtitle": "Focused, Dignified Conversations",
          "description": "Connect in up to 3 active chats at a time with secure voice and video calling."
        }
      ],
      "safetyRules": [
        {"title": "ID Verification", "description": "All members can verify their identity via Didit Passport or Driver''s Licence checks to earn the verified badge."},
        {"title": "Maximum 3 Active Chats", "description": "To foster sincere, Intentional courtship, users may hold at most 3 active conversations at any one time."},
        {"title": "Screenshot & Copy Deterrents", "description": "Dynamic user-identifying watermarks, signed media URLs, and copy/screenshot deterrents protect member dignity."},
        {"title": "Visible & Authentic Photos", "description": "Every published profile includes at least 2 clear photographs with no anonymous hidden-photo browsing."},
        {"title": "Postcode Privacy & Location Control", "description": "Your exact postcode remains private while enabling accurate local and regional matching."}
      ]
    }'::jsonb,
    'Ma''aak – Premium Islamic & Single Parent Matrimony Platform',
    'Find a mutually compatible spouse on Ma''aak. Powered by our ME → WHAT I WANT → WHAT I REQUIRE framework and Gale-Shapley stable matching.',
    true
  ),
  (
    'about',
    'About Ma''aak',
    'Designed with dignity, sincerity, and deep respect for family life.',
    'page',
    '{
      "mission": "Ma''aak (meaning \"With You\") was created to bring trust, depth, and mutual suitability back to marriage introductions. Whether you are a single parent honouring your children''s journey, divorced, widowed, or never married, Ma''aak provides a refined environment built for marriage.",
      "pillars": [
        {"title": "Serious Marriage Intentions", "body": "We are not a swipe-culture dating app. Every question in our profile wizard is crafted around family, faith, values, and long-term household harmony."},
        {"title": "Single-Parent & Blended Family Focused", "body": "We thoughtfully address parenting arrangements, step-parent comfort, children''s faith upbringing, and practical meeting availability."},
        {"title": "Privacy & Accountability", "body": "With Didit identity verification, compulsory clear photos, watermarks, and a 3-chat limit, every interaction is respectful and accountable."}
      ]
    }'::jsonb,
    'About Ma''aak – Our Mission & Values',
    'Learn how Ma''aak supports marriage-minded Muslims and single parents seeking a life partner.',
    true
  ),
  (
    'how-it-works',
    'How Ma''aak Works',
    'The ME → WHAT I WANT → WHAT I REQUIRE Compatibility Framework',
    'page',
    '{
      "framework": [
        {
          "step": "1. ME — My Profile",
          "description": "Tell us who you are across personal background, profession, faith & religious practice, family & parenting circumstances, core values, personality, and relationship intentions."
        },
        {
          "step": "2. WHAT I WANT — My Preferences",
          "description": "Indicate what you ideally prefer in a spouse. Preferences guide compatibility scoring and ranking without unfairly penalising unanswered fields."
        },
        {
          "step": "3. WHAT I REQUIRE — My 5 Dealbreakers",
          "description": "Select up to 5 mandatory non-negotiables. Our engine enforces both parties'' dealbreakers first: if either person''s dealbreaker is not met, they are never recommended—even if their other answers score 94%."
        },
        {
          "step": "4. Gale-Shapley Stable Matching",
          "description": "For all mutually eligible pairs, we compute weighted compatibility across 6 life dimensions and run the Gale-Shapley deferred acceptance algorithm to surface stable, high-conviction recommendations."
        }
      ],
      "weights": [
        {"area": "Family & Future", "weight": "25%"},
        {"area": "Relationship Intention", "weight": "20%"},
        {"area": "My Values", "weight": "20%"},
        {"area": "Dating as a Parent", "weight": "15%"},
        {"area": "Personality", "weight": "10%"},
        {"area": "Lifestyle & Preferences", "weight": "10%"}
      ]
    }'::jsonb,
    'How Ma''aak Works – Gale-Shapley & Dealbreaker Matching',
    'Understand how Ma''aak calculates mutual compatibility and enforces your 5 non-negotiable dealbreakers.',
    true
  ),
  (
    'faq',
    'Frequently Asked Questions',
    'Clear answers about matching, privacy, identity verification, and subscriptions.',
    'page',
    '{
      "items": [
        {
          "q": "How does the first month free Premium introductory offer work?",
          "a": "When you register and select our Premium Membership, your first 30 days are completely free (£0.00 charged today). Billing of £24.99/month only begins after your first month ends, and you may cancel at any time before your trial end date."
        },
        {
          "q": "What can I do on the Free plan?",
          "a": "Free members can create a complete profile, browse mutually eligible matches, and send up to 10 introduction requests in total. Upgrading to Premium unlocks unlimited requests, messaging, and voice/video calling."
        },
        {
          "q": "Why can I only have 3 active chats at a time?",
          "a": "Ma''aak is built for sincere, focused courtship. Limiting active conversations to 3 encourages meaningful dialogue rather than juggling dozens of superficial chats. Closing an ended conversation frees a slot immediately."
        },
        {
          "q": "Can I hide or blur my profile photos?",
          "a": "No. To maintain mutual transparency and trust across the community, all published profiles must display at least 2 clear photographs without a hide-photo option. We protect photos using signed URLs, copy restrictions, and dynamic user watermarks."
        },
        {
          "q": "How do dealbreakers differ from preferences?",
          "a": "Preferences influence your 0–100% compatibility score, whereas dealbreakers (maximum 5) are strict pass/fail eligibility filters. If a candidate does not satisfy your dealbreaker—or leaves that field unanswered—they are excluded from your recommendations."
        }
      ]
    }'::jsonb,
    'FAQ – Ma''aak Matrimony Platform',
    'Frequently asked questions about Ma''aak subscriptions, dealbreakers, verification, and safety.',
    true
  ),
  (
    'terms',
    'Terms and Conditions',
    'Membership terms, introductory trial disclosure, and community conduct.',
    'page',
    '{
      "lastUpdated": "November 2026",
      "sections": [
        {"heading": "1. Eligibility & Account Uniqueness", "body": "Members must be at least 18 years old and seeking a serious marriage relationship. Each member may hold only one account bound to one unique verified email address and one unique verified mobile number."},
        {"heading": "2. Profile Accuracy & Photographs", "body": "All information submitted must be truthful. Profiles require a minimum of two photographs, including at least one clear face photo, with no children in the primary photo and no contact details embedded in images."},
        {"heading": "3. Introductory Free Month & Subscriptions", "body": "New members selecting the Premium Membership receive a one-month (30-day) free introductory period. No subscription charge is taken during the first month. Unless cancelled prior to the disclosed trial end date, recurring monthly billing begins automatically after the first month via Stripe."},
        {"heading": "4. Community Safety & Screenshot Deterrents", "body": "Members must not copy, screenshot, record, or redistribute any profile text, voice bio, or photograph. Violations result in immediate permanent account termination."}
      ]
    }'::jsonb,
    'Terms & Conditions – Ma''aak',
    'Terms of service and subscription terms for Ma''aak Matrimony.',
    true
  ),
  (
    'privacy',
    'Privacy Policy',
    'How we protect your personal data, postcode, and identity verification.',
    'page',
    '{
      "lastUpdated": "November 2026",
      "sections": [
        {"heading": "1. Private Information Protection", "body": "Your surname, exact date of birth (only age is shown), email address, mobile number, and full postcode are kept strictly private and are never displayed on your public profile."},
        {"heading": "2. Identity Verification (Didit.me)", "body": "Identity verification is processed by Didit.me. Ma''aak stores only the verification session reference, status, and timestamp—never raw passport or driving licence images."},
        {"heading": "3. Dealbreaker Confidentiality", "body": "Your selected dealbreakers are used server-side to filter mutual matches and are never exposed on your public profile card."},
        {"heading": "4. Account Deletion & Data Retention", "body": "You may pause, deactivate, or request permanent account deletion at any time from Account Settings. Deletion requests purge personal profile data in accordance with UK GDPR."}
      ]
    }'::jsonb,
    'Privacy Policy – Ma''aak',
    'UK GDPR privacy policy and data protection standards at Ma''aak.',
    true
  ),
  (
    'contact',
    'Contact & Support',
    'We are here to assist you on your matrimonial journey.',
    'page',
    '{
      "email": "info@maaak.co.uk",
      "hours": "Monday – Friday, 9:00 AM – 6:00 PM GMT",
      "location": "London, United Kingdom",
      "responsePromise": "Our moderation and member care team aims to respond to all enquiries within 24 hours."
    }'::jsonb,
    'Contact Us – Ma''aak',
    'Get in touch with the Ma''aak support and safety team at info@maaak.co.uk.',
    true
  )
on conflict (slug) do update set
  title = excluded.title,
  subtitle = excluded.subtitle,
  content = excluded.content,
  meta_title = excluded.meta_title,
  meta_description = excluded.meta_description;

-- 5. Seed Question Categories (Directly mapped to profile.xlsx worksheets)
insert into matrimony.question_categories (slug, name, worksheet_name, description, step_number, compatibility_weight, sort_order)
values
  ('registration-basics', 'Account & Location Details', 'Registration', 'Core personal registration details, verified contact information, and UK postcode area.', 1, 0.00, 1),
  ('profile-about', 'About Me, Background & Faith', 'Profile', 'Relationship status, education, profession, religion, ethnicity, languages, hobbies, photos, and bio.', 2, 0.00, 2),
  ('profile-lifestyle', 'Lifestyle & Religious Practice', 'Profile', 'Employment, religious observance, hijab/beard, dietary preferences, smoking, alcohol, and activity level.', 3, 0.00, 3),
  ('compatibility-values', 'My Core Values', 'Compatibility-My Values', 'The values that matter most to you and in a partner, plus everyday faith, family, and decision-making.', 4, 0.20, 4),
  ('compatibility-family', 'Family, Children & Future Lifestyle', 'Compatibility-Family', 'Children, parenting arrangements, blended family comfort, extended family, finances, household roles, and relocation.', 5, 0.25, 5),
  ('compatibility-parenting', 'Dating as a Parent', 'Compatibility-Dating as a Paren', 'Partner involvement with children, meeting availability, frequency, travel comfort, and first-date style.', 6, 0.15, 6),
  ('compatibility-personality', 'Personality & Communication', 'Compatibility-Personality', 'Self-description traits, weekend style, conflict resolution, planning style, communication, and affection.', 7, 0.10, 7),
  ('compatibility-intention', 'Relationship & Marriage Intention', 'Compat-Relationship Intention', 'Marriage goals, timeline, relationship journey stage, introducing children, and ceremony requirements.', 8, 0.20, 8),
  ('compatibility-preferences', 'What I Want (Partner Preferences)', 'Compatibility-Preference', 'Ideal partner preferences across age, height, distance, religion, family, and lifestyle.', 9, 0.10, 9),
  ('compatibility-dealbreakers', 'What I Require (Up to 5 Dealbreakers)', 'Compatibility-Dealbreakers', 'Up to 5 mandatory non-negotiable requirements that must be satisfied for a match.', 10, 0.00, 10)
on conflict (slug) do update set
  name = excluded.name,
  worksheet_name = excluded.worksheet_name,
  description = excluded.description,
  step_number = excluded.step_number,
  compatibility_weight = excluded.compatibility_weight,
  sort_order = excluded.sort_order;
