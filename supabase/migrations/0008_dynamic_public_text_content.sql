insert into matrimony.cms_pages (slug, title, subtitle, page_type, content, is_published)
values
  ('about', 'About', null, 'page', '{}'::jsonb, true),
  ('faq', 'Behaviour & Community Guidelines', null, 'page', '{}'::jsonb, true),
  ('how-it-works', 'How It Works', null, 'page', '{}'::jsonb, true),
  ('plans', 'Membership Plans', null, 'page', '{}'::jsonb, true),
  ('contact', 'Contact', null, 'page', '{}'::jsonb, true),
  ('terms', 'Terms and Conditions', null, 'page', '{}'::jsonb, true),
  ('privacy', 'Privacy Policy', null, 'page', '{}'::jsonb, true),
  ('cookie-policy', 'Cookie Policy', null, 'page', '{}'::jsonb, true),
  ('children-privacy-policy', 'Children Privacy Policy', null, 'page', '{}'::jsonb, true),
  ('account-deletion-policy', 'Account Deletion Policy', null, 'page', '{}'::jsonb, true),
  ('safety-guideline', 'Safety Guidelines', null, 'page', '{}'::jsonb, true),
  ('safety-resources', 'Safety Resources', null, 'page', '{}'::jsonb, true),
  ('navbar', 'Navigation', null, 'page', '{}'::jsonb, true),
  ('cookie-consent', 'Cookie Consent', null, 'page', '{}'::jsonb, true)
on conflict (slug) do nothing;
