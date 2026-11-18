export type UserRole = "user" | "moderator" | "admin" | "super_admin";

export type AccountStatus =
  | "pending_verification"
  | "active"
  | "paused"
  | "deactivated"
  | "suspended"
  | "pending_deletion"
  | "deleted";

export interface ApiErrorItem {
  field: string;
  message: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  meta?: PaginationMeta | Record<string, unknown> | null;
  errors?: ApiErrorItem[];
}

export interface AuthUser {
  id: string;
  email: string;
  mobile_number: string;
  username: string;
  first_name: string;
  last_name?: string;
  role: UserRole;
  account_status: AccountStatus;
  email_verified: boolean;
  mobile_verified: boolean;
  id_verified: boolean;
  selected_initial_plan: string;
  notification_preferences: Record<string, boolean>;
  privacy_settings: Record<string, boolean>;
  created_at: string;
}

export interface UserProfileRecord {
  id: string;
  user_id: string;
  gender: "Male" | "Female";
  dob: string;
  postcode: string;
  postcode_area: string;
  postcode_verified: boolean;
  city: string;
  region?: string | null;
  country: string;
  latitude?: number | null;
  longitude?: number | null;
  relationship_status?: string | null;
  previous_relationship_concluded?: string | null;
  height_cm?: number | null;
  height_display?: string | null;
  education_level?: string | null;
  education_other?: string | null;
  job_title?: string | null;
  profession_category?: string | null;
  profession?: string | null;
  employment_status?: string | null;
  smoking?: string | null;
  alcohol?: string | null;
  dietary_preferences: string[];
  activity_level?: string | null;
  religion?: string | null;
  religion_other?: string | null;
  religious_practice?: string | null;
  religious_denomination?: string | null;
  hijab_preference?: string | null;
  facial_hair?: string | null;
  ethnicity_group?: string | null;
  ethnicity?: string | null;
  ethnicity_other?: string | null;
  nationalities: string[];
  languages_spoken: string[];
  language_other?: string | null;
  hobbies_interests: string[];
  short_bio?: string | null;
  voice_bio_url?: string | null;
  voice_bio_duration_sec?: number | null;
  my_top_values: string[];
  partner_top_values: string[];
  family_importance?: string | null;
  faith_importance?: string | null;
  life_outlook?: string | null;
  decision_making_style?: string | null;
  cultural_traditions_importance?: string | null;
  expected_partner_child_involvement?: string | null;
  usual_availability?: string | null;
  ideal_meeting_frequency?: string | null;
  date_travel_comfort?: string | null;
  preferred_first_date_style?: string | null;
  comfortable_role_with_partner_children?: string | null;
  has_children: boolean;
  children_count?: string | null;
  children_ages: string[];
  wants_more_children?: string | null;
  parenting_arrangement?: string | null;
  current_living_arrangement?: string | null;
  blended_family_comfort?: string | null;
  step_parent_comfort?: string | null;
  extended_family_living?: string | null;
  extended_family_involvement?: string | null;
  work_family_balance?: string | null;
  financial_management?: string | null;
  household_responsibilities?: string | null;
  children_faith_upbringing?: string | null;
  future_employment_plans?: string | null;
  relocation_willingness?: string | null;
  long_distance_consideration?: string | null;
  ideal_living_environment?: string | null;
  ideal_future_lifestyle: string[];
  personality_traits: string[];
  perfect_weekend?: string | null;
  conflict_resolution_style?: string | null;
  planning_style?: string | null;
  communication_preference?: string | null;
  affection_styles: string[];
  looking_for_intention?: string | null;
  marriage_timeline?: string | null;
  relationship_journey_stage?: string | null;
  introduce_partner_to_children?: string | null;
  discuss_marriage_early?: string | null;
  relationship_progression?: string | null;
  religious_ceremony_requirements?: string | null;
  wizard_step: number;
  completion_percentage: number;
  is_published: boolean;
  moderation_status: "pending" | "approved" | "rejected" | "flagged";
  moderation_notes?: string | null;
  published_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserPreferencesRecord {
  id?: string;
  user_id: string;
  preferred_age_min?: number | null;
  preferred_age_max?: number | null;
  preferred_height_min_cm?: number | null;
  preferred_height_max_cm?: number | null;
  preferred_distance_miles: string;
  preferred_locations: string[];
  preferred_religions: string[];
  religion_matching_importance: string;
  preferred_religious_practice: string;
  preferred_denominations: string[];
  open_to_different_ethnicities: string;
  preferred_ethnicities: string[];
  open_to_different_nationalities: string;
  preferred_nationalities: string[];
  preferred_languages_choice: string;
  preferred_languages: string[];
  partner_has_children_pref: string;
  preferred_children_count: string;
  preferred_wants_more_children: string;
  preferred_relationship_status: string[];
  preferred_relationship_intention: string;
  preferred_marriage_timeline: string[];
  preferred_smoking: string;
  preferred_education: string;
  preferred_relocation: string[];
  preferred_alcohol: string;
  preferred_diet: string;
  preferred_activity_level: string;
  preferred_partner_employment: string[];
  preferred_hijab: string[];
  preferred_facial_hair: string[];
  preferred_blended_family: string[];
  preferred_long_distance: string[];
  preferred_extended_family_living: string[];
  preferred_extended_family_involvement: string[];
  preferred_partner_parenting_arrangement: string[];
  preferred_partner_child_involvement: string[];
  preferred_previous_relationship_concluded: string[];
}

export interface UserDealbreakerRecord {
  id?: string;
  user_id: string;
  dealbreaker_code: string;
  dealbreaker_label: string;
  required_value: unknown;
}

export interface CompatibilityAreaBreakdown {
  family_future: number;
  relationship_intention: number;
  my_values: number;
  dating_as_parent: number;
  personality: number;
  lifestyle_preferences: number;
}

export interface CompatibilityEvaluation {
  userAId: string;
  userBId: string;
  isMutuallyEligible: boolean;
  aMeetsBDealbreakers: boolean;
  bMeetsADealbreakers: boolean;
  locationEligible: boolean;
  exclusionReasonCode?: string | null;
  scoreAToB: number;
  scoreBToA: number;
  mutualScore: number;
  areaBreakdown: CompatibilityAreaBreakdown;
  matchReasons: string[];
}
