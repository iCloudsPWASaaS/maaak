-- ============================================================================
-- MAAAK – Premium Matrimony Platform
-- Migration 0001: Core Relational Schema (matrimony), Triggers, Indexes & RLS
-- ============================================================================

create extension if not exists pgcrypto;

create schema if not exists matrimony;

-- ----------------------------------------------------------------------------
-- 1. Helper Functions & Triggers
-- ----------------------------------------------------------------------------

create or replace function matrimony.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Helper to read custom JWT claims when accessed directly via PostgREST
create or replace function matrimony.current_user_id()
returns uuid
language sql
stable
as $$
  select nullif(
    coalesce(
      current_setting('request.jwt.claim.user_id', true),
      (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'user_id'),
      (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
    ),
    ''
  )::uuid;
$$;

create or replace function matrimony.current_user_role()
returns text
language sql
stable
as $$
  select coalesce(
    nullif(current_setting('request.jwt.claim.app_role', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'app_role'),
    'user'
  );
$$;

create or replace function matrimony.is_admin_or_mod()
returns boolean
language sql
stable
as $$
  select matrimony.current_user_role() in ('admin', 'super_admin', 'moderator');
$$;

-- ----------------------------------------------------------------------------
-- 2. Users & Authentication Tables (Custom Schema Auth - No Supabase Auth)
-- ----------------------------------------------------------------------------

create table if not exists matrimony.users (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  mobile_number text not null,
  username text not null,
  password_hash text not null,
  first_name text not null,
  last_name text not null,
  role text not null default 'user' check (role in ('user', 'moderator', 'admin', 'super_admin')),
  account_status text not null default 'active' check (
    account_status in ('pending_verification', 'active', 'paused', 'deactivated', 'suspended', 'pending_deletion', 'deleted')
  ),
  email_verified boolean not null default false,
  email_verified_at timestamptz,
  mobile_verified boolean not null default false,
  mobile_verified_at timestamptz,
  id_verified boolean not null default false,
  id_verified_at timestamptz,
  selected_initial_plan text not null default 'premium',
  terms_accepted boolean not null default true,
  subscription_terms_accepted_at timestamptz default now(),
  failed_login_attempts integer not null default 0,
  locked_until timestamptz,
  last_login_at timestamptz,
  last_seen_at timestamptz default now(),
  deletion_requested_at timestamptz,
  deletion_scheduled_for timestamptz,
  notification_preferences jsonb not null default '{"email": true, "push": true, "requests": true, "messages": true, "calls": true, "verification": true, "subscription": true}'::jsonb,
  privacy_settings jsonb not null default '{"show_online_status": true, "show_read_receipts": true, "watermark_photos": true}'::jsonb,
  push_subscriptions jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint users_username_format check (username ~ '^[A-Za-z0-9]{5,10}$')
);

create unique index if not exists users_email_unique_idx on matrimony.users (lower(email));
create unique index if not exists users_mobile_unique_idx on matrimony.users (mobile_number);
create unique index if not exists users_username_unique_idx on matrimony.users (lower(username));
create index if not exists users_status_idx on matrimony.users (account_status);
create index if not exists users_role_idx on matrimony.users (role);

create table if not exists matrimony.auth_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references matrimony.users(id) on delete cascade,
  refresh_token_hash text not null unique,
  device_type text not null default 'web',
  user_agent text,
  ip_address text,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists auth_sessions_user_idx on matrimony.auth_sessions (user_id);

create table if not exists matrimony.verification_codes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references matrimony.users(id) on delete cascade,
  type text not null check (type in ('email_verification', 'mobile_verification', 'password_reset')),
  target text not null,
  code text not null,
  attempts integer not null default 0,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists verification_codes_user_type_idx on matrimony.verification_codes (user_id, type);

-- ----------------------------------------------------------------------------
-- 3. User Profiles, Questions, Categories, Options, Answers & Photographs
-- ----------------------------------------------------------------------------

create table if not exists matrimony.user_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references matrimony.users(id) on delete cascade,
  gender text not null check (gender in ('Male', 'Female')),
  dob date not null,
  postcode text not null,
  postcode_area text not null,
  postcode_verified boolean not null default true,
  city text not null,
  region text,
  country text not null default 'United Kingdom',
  latitude numeric(9, 6),
  longitude numeric(9, 6),
  -- Sheet 2: Profile
  relationship_status text,
  previous_relationship_concluded text,
  height_cm integer,
  height_display text,
  education_level text,
  education_other text,
  job_title text,
  profession_category text,
  profession text,
  employment_status text,
  smoking text,
  alcohol text,
  dietary_preferences jsonb not null default '[]'::jsonb,
  activity_level text,
  religion text,
  religion_other text,
  religious_practice text,
  religious_denomination text,
  hijab_preference text,
  facial_hair text,
  ethnicity_group text,
  ethnicity text,
  ethnicity_other text,
  nationalities jsonb not null default '[]'::jsonb,
  languages_spoken jsonb not null default '[]'::jsonb,
  language_other text,
  hobbies_interests jsonb not null default '[]'::jsonb,
  short_bio text check (short_bio is null or char_length(short_bio) <= 300),
  voice_bio_url text,
  voice_bio_duration_sec integer check (voice_bio_duration_sec is null or voice_bio_duration_sec <= 30),
  -- Sheet 5: Compatibility-My Values
  my_top_values jsonb not null default '[]'::jsonb,
  partner_top_values jsonb not null default '[]'::jsonb,
  family_importance text,
  faith_importance text,
  life_outlook text,
  decision_making_style text,
  cultural_traditions_importance text,
  -- Sheet 6: Compatibility-Dating as a Parent
  expected_partner_child_involvement text,
  usual_availability text,
  ideal_meeting_frequency text,
  date_travel_comfort text,
  preferred_first_date_style text,
  comfortable_role_with_partner_children text,
  -- Sheet 7: Compatibility-Family & Future
  has_children boolean not null default false,
  children_count text,
  children_ages jsonb not null default '[]'::jsonb,
  wants_more_children text,
  parenting_arrangement text,
  current_living_arrangement text,
  blended_family_comfort text,
  step_parent_comfort text,
  extended_family_living text,
  extended_family_involvement text,
  work_family_balance text,
  financial_management text,
  household_responsibilities text,
  children_faith_upbringing text,
  future_employment_plans text,
  relocation_willingness text,
  long_distance_consideration text,
  ideal_living_environment text,
  ideal_future_lifestyle jsonb not null default '[]'::jsonb,
  -- Sheet 10: Compatibility-Personality
  personality_traits jsonb not null default '[]'::jsonb,
  perfect_weekend text,
  conflict_resolution_style text,
  planning_style text,
  communication_preference text,
  affection_styles jsonb not null default '[]'::jsonb,
  -- Sheet 11: Compat-Relationship Intention
  looking_for_intention text,
  marriage_timeline text,
  relationship_journey_stage text,
  introduce_partner_to_children text,
  discuss_marriage_early text,
  relationship_progression text,
  religious_ceremony_requirements text,
  -- Wizard & Moderation Status
  wizard_step integer not null default 1,
  completion_percentage integer not null default 0,
  is_published boolean not null default false,
  moderation_status text not null default 'approved' check (moderation_status in ('pending', 'approved', 'rejected', 'flagged')),
  moderation_notes text,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists user_profiles_gender_idx on matrimony.user_profiles (gender);
create index if not exists user_profiles_postcode_area_idx on matrimony.user_profiles (postcode_area);
create index if not exists user_profiles_city_idx on matrimony.user_profiles (city);
create index if not exists user_profiles_religion_idx on matrimony.user_profiles (religion);
create index if not exists user_profiles_published_idx on matrimony.user_profiles (is_published, moderation_status);

create table if not exists matrimony.question_categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  worksheet_name text not null,
  description text,
  step_number integer not null,
  compatibility_weight numeric(4, 2) not null default 0,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists matrimony.profile_questions (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references matrimony.question_categories(id) on delete cascade,
  code text not null unique,
  question_text text not null,
  help_text text,
  section_type text not null check (section_type in ('registration', 'me', 'preference', 'dealbreaker')),
  answer_type text not null check (answer_type in ('text', 'textarea', 'number', 'date', 'single_select', 'multi_select', 'range', 'boolean', 'audio', 'photos')),
  min_select integer not null default 0,
  max_select integer not null default 1,
  max_length integer,
  is_required boolean not null default false,
  is_private boolean not null default false,
  supports_preference boolean not null default false,
  supports_dealbreaker boolean not null default false,
  profile_column text,
  conditional_on jsonb,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists profile_questions_category_idx on matrimony.profile_questions (category_id, sort_order);

create table if not exists matrimony.question_options (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references matrimony.profile_questions(id) on delete cascade,
  value text not null,
  label text not null,
  group_name text,
  allows_custom_text boolean not null default false,
  is_exclusive boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists question_options_question_idx on matrimony.question_options (question_id, sort_order);

create table if not exists matrimony.profile_answers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references matrimony.users(id) on delete cascade,
  question_id uuid not null references matrimony.profile_questions(id) on delete cascade,
  question_code text not null,
  answer_value jsonb not null,
  custom_text text,
  updated_at timestamptz not null default now(),
  unique (user_id, question_id)
);

create index if not exists profile_answers_user_idx on matrimony.profile_answers (user_id);
create index if not exists profile_answers_code_idx on matrimony.profile_answers (question_code);

-- Profile Photographs (No hide-photo option allowed per business rules)
create table if not exists matrimony.profile_photographs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references matrimony.users(id) on delete cascade,
  storage_path text not null,
  url text not null,
  is_primary boolean not null default false,
  sort_order integer not null default 0,
  has_clear_face boolean not null default true,
  no_children_confirmed boolean not null default true,
  no_contact_details_confirmed boolean not null default true,
  moderation_status text not null default 'approved' check (moderation_status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now()
);

create index if not exists profile_photographs_user_idx on matrimony.profile_photographs (user_id, sort_order);

-- ----------------------------------------------------------------------------
-- 4. Preferences (WHAT I WANT) & Dealbreakers (WHAT I REQUIRE)
-- ----------------------------------------------------------------------------

create table if not exists matrimony.user_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references matrimony.users(id) on delete cascade,
  preferred_age_min integer default 18,
  preferred_age_max integer default 65,
  preferred_height_min_cm integer,
  preferred_height_max_cm integer,
  preferred_distance_miles text not null default 'No preference',
  preferred_locations jsonb not null default '[]'::jsonb,
  preferred_religions jsonb not null default '[]'::jsonb,
  religion_matching_importance text not null default 'No preference',
  preferred_religious_practice text not null default 'No preference',
  preferred_denominations jsonb not null default '[]'::jsonb,
  open_to_different_ethnicities text not null default 'No preference',
  preferred_ethnicities jsonb not null default '[]'::jsonb,
  open_to_different_nationalities text not null default 'No preference',
  preferred_nationalities jsonb not null default '[]'::jsonb,
  preferred_languages_choice text not null default 'No preference',
  preferred_languages jsonb not null default '[]'::jsonb,
  partner_has_children_pref text not null default 'No preference',
  preferred_children_count text not null default 'No preference',
  preferred_wants_more_children text not null default 'No preference',
  preferred_relationship_status jsonb not null default '[]'::jsonb,
  preferred_relationship_intention text not null default 'No preference',
  preferred_marriage_timeline jsonb not null default '[]'::jsonb,
  preferred_smoking text not null default 'No preference',
  preferred_education text not null default 'No preference',
  preferred_relocation jsonb not null default '[]'::jsonb,
  preferred_alcohol text not null default 'No preference',
  preferred_diet text not null default 'No preference',
  preferred_activity_level text not null default 'No preference',
  preferred_partner_employment jsonb not null default '[]'::jsonb,
  preferred_hijab jsonb not null default '[]'::jsonb,
  preferred_facial_hair jsonb not null default '[]'::jsonb,
  preferred_blended_family jsonb not null default '[]'::jsonb,
  preferred_long_distance jsonb not null default '[]'::jsonb,
  preferred_extended_family_living jsonb not null default '[]'::jsonb,
  preferred_extended_family_involvement jsonb not null default '[]'::jsonb,
  preferred_partner_parenting_arrangement jsonb not null default '[]'::jsonb,
  preferred_partner_child_involvement jsonb not null default '[]'::jsonb,
  preferred_previous_relationship_concluded jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists matrimony.user_dealbreakers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references matrimony.users(id) on delete cascade,
  dealbreaker_code text not null,
  dealbreaker_label text not null,
  required_value jsonb not null,
  created_at timestamptz not null default now(),
  unique (user_id, dealbreaker_code)
);

create index if not exists user_dealbreakers_user_idx on matrimony.user_dealbreakers (user_id);

-- Enforce maximum 5 dealbreakers at the PostgreSQL database level
create or replace function matrimony.enforce_max_five_dealbreakers()
returns trigger
language plpgsql
as $$
declare
  current_count integer;
begin
  select count(*) into current_count
  from matrimony.user_dealbreakers
  where user_id = new.user_id
    and (tg_op = 'INSERT' or id <> new.id);

  if current_count >= 5 then
    raise exception 'Maximum of 5 dealbreakers allowed per user.';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_enforce_max_five_dealbreakers on matrimony.user_dealbreakers;
create trigger trg_enforce_max_five_dealbreakers
before insert or update on matrimony.user_dealbreakers
for each row execute function matrimony.enforce_max_five_dealbreakers();

-- ----------------------------------------------------------------------------
-- 5. Matching Engine Tables (Compatibility Scores, Gale-Shapley Runs & Results)
-- ----------------------------------------------------------------------------

create table if not exists matrimony.matching_runs (
  id uuid primary key default gen_random_uuid(),
  run_type text not null default 'on-demand',
  triggered_by uuid references matrimony.users(id) on delete set null,
  status text not null default 'running' check (status in ('running', 'completed', 'failed')),
  total_users integer not null default 0,
  eligible_pairs_count integer not null default 0,
  stable_matches_count integer not null default 0,
  blocking_pairs_count integer not null default 0,
  weights_snapshot jsonb not null default '{}'::jsonb,
  execution_time_ms integer,
  error_message text,
  started_at timestamptz not null default now(),
  finished_at timestamptz
);

create table if not exists matrimony.compatibility_scores (
  id uuid primary key default gen_random_uuid(),
  user_a_id uuid not null references matrimony.users(id) on delete cascade,
  user_b_id uuid not null references matrimony.users(id) on delete cascade,
  is_mutually_eligible boolean not null default false,
  a_meets_b_dealbreakers boolean not null default false,
  b_meets_a_dealbreakers boolean not null default false,
  location_eligible boolean not null default true,
  exclusion_reason_code text,
  score_a_to_b numeric(5, 2) not null default 0,
  score_b_to_a numeric(5, 2) not null default 0,
  mutual_score numeric(5, 2) not null default 0,
  area_breakdown jsonb not null default '{}'::jsonb,
  match_reasons jsonb not null default '[]'::jsonb,
  calculated_at timestamptz not null default now(),
  unique (user_a_id, user_b_id)
);

create index if not exists compatibility_scores_a_idx on matrimony.compatibility_scores (user_a_id, is_mutually_eligible, mutual_score desc);
create index if not exists compatibility_scores_b_idx on matrimony.compatibility_scores (user_b_id, is_mutually_eligible, mutual_score desc);

create table if not exists matrimony.match_recommendations (
  id uuid primary key default gen_random_uuid(),
  run_id uuid references matrimony.matching_runs(id) on delete set null,
  user_id uuid not null references matrimony.users(id) on delete cascade,
  matched_user_id uuid not null references matrimony.users(id) on delete cascade,
  is_gale_shapley_optimal boolean not null default false,
  rank_position integer not null default 1,
  mutual_score numeric(5, 2) not null,
  score_user_to_match numeric(5, 2) not null,
  score_match_to_user numeric(5, 2) not null,
  area_breakdown jsonb not null default '{}'::jsonb,
  match_reasons jsonb not null default '[]'::jsonb,
  status text not null default 'active' check (status in ('active', 'archived')),
  created_at timestamptz not null default now(),
  unique (user_id, matched_user_id)
);

create index if not exists match_recommendations_user_idx on matrimony.match_recommendations (user_id, status, rank_position);

-- ----------------------------------------------------------------------------
-- 6. Discovery, Likes/Dislikes & Introduction Requests
-- ----------------------------------------------------------------------------

create table if not exists matrimony.likes_dislikes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references matrimony.users(id) on delete cascade,
  target_user_id uuid not null references matrimony.users(id) on delete cascade,
  action text not null check (action in ('like', 'dislike', 'thumbs_up', 'thumbs_down', 'bookmark')),
  created_at timestamptz not null default now(),
  unique (user_id, target_user_id)
);

create index if not exists likes_dislikes_user_idx on matrimony.likes_dislikes (user_id);
create index if not exists likes_dislikes_target_idx on matrimony.likes_dislikes (target_user_id);

create table if not exists matrimony.introduction_requests (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references matrimony.users(id) on delete cascade,
  receiver_id uuid not null references matrimony.users(id) on delete cascade,
  message text,
  compatibility_score numeric(5, 2),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'rejected', 'cancelled')),
  responded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (sender_id, receiver_id)
);

create index if not exists intro_requests_sender_idx on matrimony.introduction_requests (sender_id, status);
create index if not exists intro_requests_receiver_idx on matrimony.introduction_requests (receiver_id, status);

-- ----------------------------------------------------------------------------
-- 7. Messaging, Conversations, Active Chat Limit (Max 3) & Agora Calls
-- ----------------------------------------------------------------------------

create table if not exists matrimony.conversations (
  id uuid primary key default gen_random_uuid(),
  user_one_id uuid not null references matrimony.users(id) on delete cascade,
  user_two_id uuid not null references matrimony.users(id) on delete cascade,
  introduction_request_id uuid references matrimony.introduction_requests(id) on delete set null,
  status text not null default 'active' check (status in ('active', 'closed', 'blocked')),
  closed_by uuid references matrimony.users(id) on delete set null,
  closed_at timestamptz,
  last_message_at timestamptz default now(),
  last_message_preview text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists conversations_user_one_idx on matrimony.conversations (user_one_id, status);
create index if not exists conversations_user_two_idx on matrimony.conversations (user_two_id, status);

-- Database trigger enforcing maximum 3 active chats per user
create or replace function matrimony.enforce_max_three_active_chats()
returns trigger
language plpgsql
as $$
declare
  u1_active integer;
  u2_active integer;
begin
  if new.status = 'active' then
    select count(*) into u1_active
    from matrimony.conversations
    where status = 'active'
      and (user_one_id = new.user_one_id or user_two_id = new.user_one_id)
      and (tg_op = 'INSERT' or id <> new.id);

    if u1_active >= 3 then
      raise exception 'User already has the maximum of 3 active chats.';
    end if;

    select count(*) into u2_active
    from matrimony.conversations
    where status = 'active'
      and (user_one_id = new.user_two_id or user_two_id = new.user_two_id)
      and (tg_op = 'INSERT' or id <> new.id);

    if u2_active >= 3 then
      raise exception 'Recipient already has the maximum of 3 active chats.';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_enforce_max_three_active_chats on matrimony.conversations;
create trigger trg_enforce_max_three_active_chats
before insert or update on matrimony.conversations
for each row execute function matrimony.enforce_max_three_active_chats();

create table if not exists matrimony.conversation_participants (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references matrimony.conversations(id) on delete cascade,
  user_id uuid not null references matrimony.users(id) on delete cascade,
  unread_count integer not null default 0,
  last_read_at timestamptz,
  is_muted boolean not null default false,
  joined_at timestamptz not null default now(),
  unique (conversation_id, user_id)
);

create index if not exists conv_participants_user_idx on matrimony.conversation_participants (user_id);

create table if not exists matrimony.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references matrimony.conversations(id) on delete cascade,
  sender_id uuid not null references matrimony.users(id) on delete cascade,
  message_type text not null default 'text' check (message_type in ('text', 'voice_note', 'call_event', 'system')),
  content text not null,
  attachment_url text,
  is_read boolean not null default false,
  read_at timestamptz,
  is_deleted boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists messages_conversation_idx on matrimony.messages (conversation_id, created_at asc);

create table if not exists matrimony.read_receipts (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references matrimony.messages(id) on delete cascade,
  user_id uuid not null references matrimony.users(id) on delete cascade,
  read_at timestamptz not null default now(),
  unique (message_id, user_id)
);

create table if not exists matrimony.call_records (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references matrimony.conversations(id) on delete set null,
  caller_id uuid not null references matrimony.users(id) on delete cascade,
  callee_id uuid not null references matrimony.users(id) on delete cascade,
  call_type text not null check (call_type in ('audio', 'video')),
  channel_name text not null unique,
  status text not null default 'ringing' check (status in ('ringing', 'accepted', 'rejected', 'ended', 'missed', 'failed')),
  started_at timestamptz,
  ended_at timestamptz,
  duration_seconds integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists call_records_caller_idx on matrimony.call_records (caller_id, created_at desc);
create index if not exists call_records_callee_idx on matrimony.call_records (callee_id, created_at desc);

-- ----------------------------------------------------------------------------
-- 8. Identity Verification (Didit.me)
-- ----------------------------------------------------------------------------

create table if not exists matrimony.identity_verification_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references matrimony.users(id) on delete cascade,
  didit_session_id text unique,
  workflow_id text not null,
  verification_url text,
  status text not null default 'pending' check (
    status in ('pending', 'in_progress', 'approved', 'declined', 'expired', 'abandoned', 'review_needed')
  ),
  webhook_event_id text,
  webhook_payload_summary jsonb,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists id_verification_user_idx on matrimony.identity_verification_sessions (user_id, created_at desc);

-- ----------------------------------------------------------------------------
-- 9. Subscriptions & Stripe Billing
-- ----------------------------------------------------------------------------

create table if not exists matrimony.subscription_plans (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  tagline text,
  description text,
  price_monthly numeric(10, 2) not null default 0,
  currency text not null default 'GBP',
  billing_interval text not null default 'month',
  trial_days integer not null default 0,
  trial_disclosure_text text,
  stripe_product_id text,
  stripe_price_id text,
  max_introduction_requests integer,
  max_active_chats integer not null default 3,
  can_message boolean not null default false,
  can_audio_call boolean not null default false,
  can_video_call boolean not null default false,
  can_see_who_liked boolean not null default false,
  can_use_advanced_filters boolean not null default true,
  features jsonb not null default '[]'::jsonb,
  badge_text text,
  is_coming_soon boolean not null default false,
  is_active boolean not null default true,
  is_purchasable boolean not null default true,
  sort_order integer not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists matrimony.user_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references matrimony.users(id) on delete cascade,
  plan_id uuid not null references matrimony.subscription_plans(id),
  plan_slug text not null,
  status text not null default 'active' check (status in ('trialing', 'active', 'past_due', 'canceled', 'expired', 'incomplete')),
  stripe_customer_id text,
  stripe_subscription_id text unique,
  stripe_checkout_session_id text,
  is_trial boolean not null default false,
  trial_starts_at timestamptz,
  trial_ends_at timestamptz,
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  canceled_at timestamptz,
  introduction_requests_used integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists user_subscriptions_user_idx on matrimony.user_subscriptions (user_id, status);
create index if not exists user_subscriptions_customer_idx on matrimony.user_subscriptions (stripe_customer_id);

-- Enforce Free User 10 Introduction Request Limit at DB Level
create or replace function matrimony.enforce_intro_request_allowance()
returns trigger
language plpgsql
as $$
declare
  sub_record record;
  sent_count integer;
begin
  select us.plan_slug, sp.max_introduction_requests
  into sub_record
  from matrimony.user_subscriptions us
  join matrimony.subscription_plans sp on sp.id = us.plan_id
  where us.user_id = new.sender_id
    and us.status in ('trialing', 'active')
  order by us.created_at desc
  limit 1;

  select count(*) into sent_count
  from matrimony.introduction_requests
  where sender_id = new.sender_id;

  if sub_record is null then
    -- Default free plan limit: 10
    if sent_count >= 10 then
      raise exception 'Free membership limit reached: maximum 10 introduction requests allowed.';
    end if;
  elsif sub_record.max_introduction_requests is not null and sent_count >= sub_record.max_introduction_requests then
    raise exception 'Introduction request allowance reached for your current plan.';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_enforce_intro_request_allowance on matrimony.introduction_requests;
create trigger trg_enforce_intro_request_allowance
before insert on matrimony.introduction_requests
for each row execute function matrimony.enforce_intro_request_allowance();

create table if not exists matrimony.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references matrimony.users(id) on delete cascade,
  subscription_id uuid references matrimony.user_subscriptions(id) on delete set null,
  stripe_invoice_id text unique,
  stripe_payment_intent_id text,
  amount numeric(10, 2) not null,
  currency text not null default 'GBP',
  status text not null check (status in ('paid', 'open', 'failed', 'action_required', 'void', 'refunded')),
  invoice_pdf_url text,
  hosted_invoice_url text,
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists payments_user_idx on matrimony.payments (user_id, created_at desc);

create table if not exists matrimony.payment_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null default 'stripe',
  event_id text not null unique,
  event_type text not null,
  payload jsonb not null,
  processing_status text not null default 'processed',
  error_message text,
  processed_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- 10. Moderation, Reports, Blocking, Notifications, Feedback, CMS & Audit Logs
-- ----------------------------------------------------------------------------

create table if not exists matrimony.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references matrimony.users(id) on delete cascade,
  reported_user_id uuid not null references matrimony.users(id) on delete cascade,
  reported_message_id uuid references matrimony.messages(id) on delete set null,
  report_type text not null check (report_type in ('profile', 'message', 'photo', 'call', 'harassment', 'impersonation', 'other')),
  reason text not null,
  details text,
  status text not null default 'pending' check (status in ('pending', 'under_review', 'resolved', 'dismissed')),
  resolution_notes text,
  reviewed_by uuid references matrimony.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists reports_status_idx on matrimony.reports (status, created_at desc);

create table if not exists matrimony.blocked_users (
  id uuid primary key default gen_random_uuid(),
  blocker_id uuid not null references matrimony.users(id) on delete cascade,
  blocked_id uuid not null references matrimony.users(id) on delete cascade,
  reason text,
  created_at timestamptz not null default now(),
  unique (blocker_id, blocked_id)
);

create index if not exists blocked_users_blocker_idx on matrimony.blocked_users (blocker_id);
create index if not exists blocked_users_blocked_idx on matrimony.blocked_users (blocked_id);

create table if not exists matrimony.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references matrimony.users(id) on delete cascade,
  type text not null check (
    type in ('introduction_request', 'request_accepted', 'new_message', 'missed_call', 'incoming_call', 'verification_update', 'subscription_update', 'account_alert', 'system')
  ),
  title text not null,
  body text not null,
  action_url text,
  metadata jsonb not null default '{}'::jsonb,
  is_read boolean not null default false,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_idx on matrimony.notifications (user_id, is_read, created_at desc);

create table if not exists matrimony.feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references matrimony.users(id) on delete set null,
  name text,
  email text not null,
  category text not null check (category in ('general_feedback', 'suggestion', 'technical_problem', 'complaint')),
  subject text,
  message text not null,
  page_url text,
  recipient_email text not null default 'info@maaak.co.uk',
  status text not null default 'new' check (status in ('new', 'in_review', 'resolved', 'archived')),
  admin_notes text,
  responded_by uuid references matrimony.users(id) on delete set null,
  responded_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists matrimony.admin_roles (
  id uuid primary key default gen_random_uuid(),
  role_name text not null unique,
  permissions jsonb not null default '[]'::jsonb,
  description text,
  created_at timestamptz not null default now()
);

create table if not exists matrimony.cms_pages (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  subtitle text,
  page_type text not null default 'page' check (page_type in ('page', 'banner', 'announcement', 'email_template', 'notification_template')),
  content jsonb not null default '{}'::jsonb,
  meta_title text,
  meta_description text,
  is_published boolean not null default true,
  updated_by uuid references matrimony.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists matrimony.cms_settings (
  id uuid primary key default gen_random_uuid(),
  setting_key text not null unique,
  setting_group text not null default 'general',
  setting_value jsonb not null,
  description text,
  updated_by uuid references matrimony.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

create table if not exists matrimony.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references matrimony.users(id) on delete set null,
  actor_role text,
  target_user_id uuid references matrimony.users(id) on delete set null,
  event_category text not null check (
    event_category in ('admin', 'user', 'security', 'subscription', 'verification', 'matching', 'moderation', 'api_error')
  ),
  action text not null,
  resource_type text,
  resource_id text,
  details jsonb not null default '{}'::jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists audit_logs_category_idx on matrimony.audit_logs (event_category, created_at desc);
create index if not exists audit_logs_actor_idx on matrimony.audit_logs (actor_id, created_at desc);

-- ----------------------------------------------------------------------------
-- 11. Updated_at Triggers
-- ----------------------------------------------------------------------------

drop trigger if exists trg_users_updated_at on matrimony.users;
create trigger trg_users_updated_at before update on matrimony.users
for each row execute function matrimony.touch_updated_at();

drop trigger if exists trg_user_profiles_updated_at on matrimony.user_profiles;
create trigger trg_user_profiles_updated_at before update on matrimony.user_profiles
for each row execute function matrimony.touch_updated_at();

drop trigger if exists trg_user_preferences_updated_at on matrimony.user_preferences;
create trigger trg_user_preferences_updated_at before update on matrimony.user_preferences
for each row execute function matrimony.touch_updated_at();

drop trigger if exists trg_intro_requests_updated_at on matrimony.introduction_requests;
create trigger trg_intro_requests_updated_at before update on matrimony.introduction_requests
for each row execute function matrimony.touch_updated_at();

drop trigger if exists trg_conversations_updated_at on matrimony.conversations;
create trigger trg_conversations_updated_at before update on matrimony.conversations
for each row execute function matrimony.touch_updated_at();

drop trigger if exists trg_id_verifications_updated_at on matrimony.identity_verification_sessions;
create trigger trg_id_verifications_updated_at before update on matrimony.identity_verification_sessions
for each row execute function matrimony.touch_updated_at();

drop trigger if exists trg_user_subscriptions_updated_at on matrimony.user_subscriptions;
create trigger trg_user_subscriptions_updated_at before update on matrimony.user_subscriptions
for each row execute function matrimony.touch_updated_at();

drop trigger if exists trg_cms_pages_updated_at on matrimony.cms_pages;
create trigger trg_cms_pages_updated_at before update on matrimony.cms_pages
for each row execute function matrimony.touch_updated_at();

-- ----------------------------------------------------------------------------
-- 12. Row Level Security (RLS) on All Tables
-- ----------------------------------------------------------------------------

alter table matrimony.users enable row level security;
alter table matrimony.auth_sessions enable row level security;
alter table matrimony.verification_codes enable row level security;
alter table matrimony.user_profiles enable row level security;
alter table matrimony.question_categories enable row level security;
alter table matrimony.profile_questions enable row level security;
alter table matrimony.question_options enable row level security;
alter table matrimony.profile_answers enable row level security;
alter table matrimony.profile_photographs enable row level security;
alter table matrimony.user_preferences enable row level security;
alter table matrimony.user_dealbreakers enable row level security;
alter table matrimony.matching_runs enable row level security;
alter table matrimony.compatibility_scores enable row level security;
alter table matrimony.match_recommendations enable row level security;
alter table matrimony.likes_dislikes enable row level security;
alter table matrimony.introduction_requests enable row level security;
alter table matrimony.conversations enable row level security;
alter table matrimony.conversation_participants enable row level security;
alter table matrimony.messages enable row level security;
alter table matrimony.read_receipts enable row level security;
alter table matrimony.call_records enable row level security;
alter table matrimony.identity_verification_sessions enable row level security;
alter table matrimony.subscription_plans enable row level security;
alter table matrimony.user_subscriptions enable row level security;
alter table matrimony.payments enable row level security;
alter table matrimony.payment_events enable row level security;
alter table matrimony.reports enable row level security;
alter table matrimony.blocked_users enable row level security;
alter table matrimony.notifications enable row level security;
alter table matrimony.feedback enable row level security;
alter table matrimony.admin_roles enable row level security;
alter table matrimony.cms_pages enable row level security;
alter table matrimony.cms_settings enable row level security;
alter table matrimony.audit_logs enable row level security;

-- Public read policies for reference metadata & CMS
drop policy if exists "public read question_categories" on matrimony.question_categories;
create policy "public read question_categories" on matrimony.question_categories for select using (is_active = true);

drop policy if exists "public read profile_questions" on matrimony.profile_questions;
create policy "public read profile_questions" on matrimony.profile_questions for select using (is_active = true);

drop policy if exists "public read question_options" on matrimony.question_options;
create policy "public read question_options" on matrimony.question_options for select using (true);

drop policy if exists "public read subscription_plans" on matrimony.subscription_plans;
create policy "public read subscription_plans" on matrimony.subscription_plans for select using (is_active = true);

drop policy if exists "public read cms_pages" on matrimony.cms_pages;
create policy "public read cms_pages" on matrimony.cms_pages for select using (is_published = true);

-- User ownership policies
drop policy if exists "users read own" on matrimony.users;
create policy "users read own" on matrimony.users for select
  using (id = matrimony.current_user_id() or matrimony.is_admin_or_mod());

drop policy if exists "users update own" on matrimony.users;
create policy "users update own" on matrimony.users for update
  using (id = matrimony.current_user_id() or matrimony.is_admin_or_mod());

drop policy if exists "profiles read published or own" on matrimony.user_profiles;
create policy "profiles read published or own" on matrimony.user_profiles for select
  using (
    user_id = matrimony.current_user_id()
    or matrimony.is_admin_or_mod()
    or (is_published = true and moderation_status = 'approved')
  );

drop policy if exists "profiles write own" on matrimony.user_profiles;
create policy "profiles write own" on matrimony.user_profiles for all
  using (user_id = matrimony.current_user_id() or matrimony.is_admin_or_mod())
  with check (user_id = matrimony.current_user_id() or matrimony.is_admin_or_mod());

drop policy if exists "profile_answers own" on matrimony.profile_answers;
create policy "profile_answers own" on matrimony.profile_answers for all
  using (user_id = matrimony.current_user_id() or matrimony.is_admin_or_mod())
  with check (user_id = matrimony.current_user_id() or matrimony.is_admin_or_mod());

drop policy if exists "profile_photographs read" on matrimony.profile_photographs;
create policy "profile_photographs read" on matrimony.profile_photographs for select
  using (user_id = matrimony.current_user_id() or matrimony.is_admin_or_mod() or moderation_status = 'approved');

drop policy if exists "profile_photographs write own" on matrimony.profile_photographs;
create policy "profile_photographs write own" on matrimony.profile_photographs for all
  using (user_id = matrimony.current_user_id() or matrimony.is_admin_or_mod())
  with check (user_id = matrimony.current_user_id() or matrimony.is_admin_or_mod());

drop policy if exists "preferences own" on matrimony.user_preferences;
create policy "preferences own" on matrimony.user_preferences for all
  using (user_id = matrimony.current_user_id() or matrimony.is_admin_or_mod())
  with check (user_id = matrimony.current_user_id() or matrimony.is_admin_or_mod());

-- Dealbreakers are strictly private to the owner and admins
drop policy if exists "dealbreakers strictly own" on matrimony.user_dealbreakers;
create policy "dealbreakers strictly own" on matrimony.user_dealbreakers for all
  using (user_id = matrimony.current_user_id() or matrimony.is_admin_or_mod())
  with check (user_id = matrimony.current_user_id() or matrimony.is_admin_or_mod());

drop policy if exists "match_recommendations read own" on matrimony.match_recommendations;
create policy "match_recommendations read own" on matrimony.match_recommendations for select
  using (user_id = matrimony.current_user_id() or matrimony.is_admin_or_mod());

drop policy if exists "likes_dislikes own" on matrimony.likes_dislikes;
create policy "likes_dislikes own" on matrimony.likes_dislikes for all
  using (user_id = matrimony.current_user_id() or matrimony.is_admin_or_mod())
  with check (user_id = matrimony.current_user_id() or matrimony.is_admin_or_mod());

drop policy if exists "intro_requests participant" on matrimony.introduction_requests;
create policy "intro_requests participant" on matrimony.introduction_requests for select
  using (sender_id = matrimony.current_user_id() or receiver_id = matrimony.current_user_id() or matrimony.is_admin_or_mod());

drop policy if exists "conversations participant" on matrimony.conversations;
create policy "conversations participant" on matrimony.conversations for select
  using (user_one_id = matrimony.current_user_id() or user_two_id = matrimony.current_user_id() or matrimony.is_admin_or_mod());

drop policy if exists "messages participant" on matrimony.messages;
create policy "messages participant" on matrimony.messages for select
  using (
    exists (
      select 1 from matrimony.conversations c
      where c.id = conversation_id
        and (c.user_one_id = matrimony.current_user_id() or c.user_two_id = matrimony.current_user_id())
    )
    or matrimony.is_admin_or_mod()
  );

drop policy if exists "notifications own" on matrimony.notifications;
create policy "notifications own" on matrimony.notifications for all
  using (user_id = matrimony.current_user_id() or matrimony.is_admin_or_mod())
  with check (user_id = matrimony.current_user_id() or matrimony.is_admin_or_mod());

drop policy if exists "subscriptions own" on matrimony.user_subscriptions;
create policy "subscriptions own" on matrimony.user_subscriptions for select
  using (user_id = matrimony.current_user_id() or matrimony.is_admin_or_mod());

drop policy if exists "payments own" on matrimony.payments;
create policy "payments own" on matrimony.payments for select
  using (user_id = matrimony.current_user_id() or matrimony.is_admin_or_mod());

drop policy if exists "blocks own" on matrimony.blocked_users;
create policy "blocks own" on matrimony.blocked_users for all
  using (blocker_id = matrimony.current_user_id() or matrimony.is_admin_or_mod())
  with check (blocker_id = matrimony.current_user_id() or matrimony.is_admin_or_mod());

drop policy if exists "reports create" on matrimony.reports;
create policy "reports create" on matrimony.reports for insert
  with check (reporter_id = matrimony.current_user_id() or matrimony.is_admin_or_mod());

drop policy if exists "reports read own or mod" on matrimony.reports;
create policy "reports read own or mod" on matrimony.reports for select
  using (reporter_id = matrimony.current_user_id() or matrimony.is_admin_or_mod());

drop policy if exists "feedback insert public" on matrimony.feedback;
create policy "feedback insert public" on matrimony.feedback for insert
  with check (true);

drop policy if exists "feedback admin read" on matrimony.feedback;
create policy "feedback admin read" on matrimony.feedback for select
  using (user_id = matrimony.current_user_id() or matrimony.is_admin_or_mod());

-- ----------------------------------------------------------------------------
-- 13. Grants & Dynamic PostgREST Schema Exposure
-- ----------------------------------------------------------------------------

grant usage on schema matrimony to anon, authenticated, service_role;
grant all on all tables in schema matrimony to service_role;
grant select on matrimony.question_categories, matrimony.profile_questions, matrimony.question_options, matrimony.subscription_plans, matrimony.cms_pages to anon, authenticated;
grant all on all sequences in schema matrimony to anon, authenticated, service_role;
grant execute on all functions in schema matrimony to anon, authenticated, service_role;

alter default privileges in schema matrimony grant all on tables to service_role;
alter default privileges in schema matrimony grant all on sequences to service_role;
alter default privileges in schema matrimony grant execute on functions to anon, authenticated, service_role;

-- Safely append 'matrimony' to PostgREST exposed schemas without removing existing ones
do $$
declare
  existing_schemas text;
  updated_schemas text;
begin
  existing_schemas := coalesce(current_setting('pgrst.db_schemas', true), 'public, storage, graphql_public, luckydraw, justeat, cinewood');
  if position('matrimony' in existing_schemas) = 0 then
    updated_schemas := existing_schemas || ', matrimony';
  else
    updated_schemas := existing_schemas;
  end if;

  begin
    execute format('alter role authenticator set pgrst.db_schemas = %L', updated_schemas);
  exception when others then
    null;
  end;

  begin
    execute format('alter database postgres set pgrst.db_schemas = %L', updated_schemas);
  exception when others then
    null;
  end;
end;
$$;

notify pgrst, 'reload config';
notify pgrst, 'reload schema';
