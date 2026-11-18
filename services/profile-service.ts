import { HEIGHT_OPTIONS, SUPPORTED_DEALBREAKERS } from "@/lib/workbook-catalog";
import { calculateAgeFromDob, extractOutwardPostcode } from "@/services/auth-service";
import { recordAuditLog } from "@/services/audit-service";
import {
  executeBatchMatchingRun,
  validateDealbreakersInput,
} from "@/services/matching-service";
import { createAdminSupabaseClient } from "@/supabase/admin";
import type { UserDealbreakerRecord, UserPreferencesRecord, UserProfileRecord } from "@/types";

const REQUIRED_PROFILE_FIELDS: (keyof UserProfileRecord)[] = [
  "gender",
  "dob",
  "postcode",
  "city",
  "relationship_status",
  "previous_relationship_concluded",
  "height_cm",
  "education_level",
  "job_title",
  "profession",
  "religion",
  "ethnicity",
  "nationalities",
  "languages_spoken",
  "hobbies_interests",
  "short_bio",
  "employment_status",
  "smoking",
  "alcohol",
  "dietary_preferences",
  "activity_level",
  "my_top_values",
  "partner_top_values",
  "family_importance",
  "faith_importance",
  "life_outlook",
  "decision_making_style",
  "cultural_traditions_importance",
  "children_count",
  "wants_more_children",
  "parenting_arrangement",
  "current_living_arrangement",
  "blended_family_comfort",
  "step_parent_comfort",
  "extended_family_living",
  "extended_family_involvement",
  "work_family_balance",
  "financial_management",
  "household_responsibilities",
  "children_faith_upbringing",
  "future_employment_plans",
  "relocation_willingness",
  "long_distance_consideration",
  "ideal_living_environment",
  "ideal_future_lifestyle",
  "expected_partner_child_involvement",
  "usual_availability",
  "ideal_meeting_frequency",
  "date_travel_comfort",
  "preferred_first_date_style",
  "comfortable_role_with_partner_children",
  "personality_traits",
  "perfect_weekend",
  "conflict_resolution_style",
  "planning_style",
  "communication_preference",
  "affection_styles",
  "looking_for_intention",
  "marriage_timeline",
  "relationship_journey_stage",
  "introduce_partner_to_children",
  "discuss_marriage_early",
  "relationship_progression",
  "religious_ceremony_requirements",
];

export function calculateProfileCompletion(
  profile: Partial<UserProfileRecord> | null,
  photosCount: number,
): {
  percentage: number;
  missingFields: string[];
  hasMinimumPhotos: boolean;
  canPublish: boolean;
} {
  if (!profile) {
    return {
      percentage: 0,
      missingFields: REQUIRED_PROFILE_FIELDS as string[],
      hasMinimumPhotos: false,
      canPublish: false,
    };
  }

  const missingFields: string[] = [];
  let completedCount = 0;

  for (const field of REQUIRED_PROFILE_FIELDS) {
    const val = profile[field];
    const isFilled =
      val !== null &&
      val !== undefined &&
      (typeof val !== "string" || val.trim().length > 0) &&
      (!Array.isArray(val) || val.length > 0);

    if (isFilled) {
      completedCount += 1;
    } else {
      missingFields.push(String(field));
    }
  }

  // Photos count as 2 required checkpoints (min 2 photos per profile.xlsx)
  const photoPoints = Math.min(2, photosCount);
  const totalCheckpoints = REQUIRED_PROFILE_FIELDS.length + 2;
  const percentage = Math.round(
    ((completedCount + photoPoints) / totalCheckpoints) * 100,
  );
  const hasMinimumPhotos = photosCount >= 2;
  const canPublish = missingFields.length === 0 && hasMinimumPhotos;

  return {
    percentage: Math.min(100, percentage),
    missingFields,
    hasMinimumPhotos,
    canPublish,
  };
}

export async function getFullUserProfile(userId: string) {
  const sb = createAdminSupabaseClient();

  const [
    { data: user },
    { data: profile },
    { data: photos },
    { data: preferences },
    { data: dealbreakers },
    { data: answers },
  ] = await Promise.all([
    sb
      .from("users")
      .select(
        "id, email, mobile_number, username, first_name, last_name, role, account_status, email_verified, mobile_verified, id_verified, selected_initial_plan, notification_preferences, privacy_settings, created_at",
      )
      .eq("id", userId)
      .maybeSingle(),
    sb.from("user_profiles").select("*").eq("user_id", userId).maybeSingle(),
    sb
      .from("profile_photographs")
      .select("*")
      .eq("user_id", userId)
      .order("sort_order", { ascending: true }),
    sb.from("user_preferences").select("*").eq("user_id", userId).maybeSingle(),
    sb
      .from("user_dealbreakers")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: true }),
    sb.from("profile_answers").select("*").eq("user_id", userId),
  ]);

  if (!user) return null;

  const completion = calculateProfileCompletion(
    profile as UserProfileRecord | null,
    (photos || []).length,
  );

  return {
    user,
    profile: profile
      ? {
          ...profile,
          age: profile.dob ? calculateAgeFromDob(profile.dob) : null,
        }
      : null,
    photos: photos || [],
    preferences: preferences || null,
    dealbreakers: dealbreakers || [],
    answers: answers || [],
    completion,
  };
}

/**
 * Formats a public-safe view of another user's profile:
 * - Never exposes surname (last_name)
 * - Never exposes exact DOB (only calculated age)
 * - Never exposes full postcode (only outward postcode_area and city)
 * - Never exposes email or mobile_number
 * - Never exposes private dealbreakers
 * - Never hides profile photographs
 */
export function sanitizePublicProfile(bundle: {
  user: Record<string, unknown>;
  profile: UserProfileRecord;
  photos: Record<string, unknown>[];
  compatibility?: Record<string, unknown> | null;
  viewerWatermark?: string;
}) {
  const { user, profile, photos, compatibility, viewerWatermark } = bundle;
  return {
    id: user.id,
    first_name: user.first_name,
    username: user.username,
    id_verified: Boolean(user.id_verified),
    age: profile.dob ? calculateAgeFromDob(profile.dob) : null,
    gender: profile.gender,
    city: profile.city,
    region: profile.region,
    postcode_area: profile.postcode_area,
    country: profile.country,
    relationship_status: profile.relationship_status,
    previous_relationship_concluded: profile.previous_relationship_concluded,
    height_cm: profile.height_cm,
    height_display:
      profile.height_display ||
      HEIGHT_OPTIONS.find((h) => h.cm === Number(profile.height_cm))?.label ||
      null,
    education_level: profile.education_level,
    job_title: profile.job_title,
    profession_category: profile.profession_category,
    profession: profile.profession,
    employment_status: profile.employment_status,
    smoking: profile.smoking,
    alcohol: profile.alcohol,
    dietary_preferences: profile.dietary_preferences || [],
    activity_level: profile.activity_level,
    religion: profile.religion,
    religious_practice: profile.religious_practice,
    religious_denomination: profile.religious_denomination,
    hijab_preference: profile.hijab_preference,
    facial_hair: profile.facial_hair,
    ethnicity_group: profile.ethnicity_group,
    ethnicity: profile.ethnicity,
    nationalities: profile.nationalities || [],
    languages_spoken: profile.languages_spoken || [],
    hobbies_interests: profile.hobbies_interests || [],
    short_bio: profile.short_bio,
    voice_bio_url: profile.voice_bio_url,
    voice_bio_duration_sec: profile.voice_bio_duration_sec,
    has_children: profile.has_children,
    children_count: profile.children_count,
    children_ages: profile.children_ages || [],
    wants_more_children: profile.wants_more_children,
    parenting_arrangement: profile.parenting_arrangement,
    current_living_arrangement: profile.current_living_arrangement,
    blended_family_comfort: profile.blended_family_comfort,
    step_parent_comfort: profile.step_parent_comfort,
    extended_family_living: profile.extended_family_living,
    extended_family_involvement: profile.extended_family_involvement,
    work_family_balance: profile.work_family_balance,
    financial_management: profile.financial_management,
    household_responsibilities: profile.household_responsibilities,
    children_faith_upbringing: profile.children_faith_upbringing,
    future_employment_plans: profile.future_employment_plans,
    relocation_willingness: profile.relocation_willingness,
    long_distance_consideration: profile.long_distance_consideration,
    ideal_living_environment: profile.ideal_living_environment,
    ideal_future_lifestyle: profile.ideal_future_lifestyle || [],
    my_top_values: profile.my_top_values || [],
    partner_top_values: profile.partner_top_values || [],
    family_importance: profile.family_importance,
    faith_importance: profile.faith_importance,
    life_outlook: profile.life_outlook,
    decision_making_style: profile.decision_making_style,
    cultural_traditions_importance: profile.cultural_traditions_importance,
    expected_partner_child_involvement: profile.expected_partner_child_involvement,
    usual_availability: profile.usual_availability,
    ideal_meeting_frequency: profile.ideal_meeting_frequency,
    date_travel_comfort: profile.date_travel_comfort,
    preferred_first_date_style: profile.preferred_first_date_style,
    comfortable_role_with_partner_children:
      profile.comfortable_role_with_partner_children,
    personality_traits: profile.personality_traits || [],
    perfect_weekend: profile.perfect_weekend,
    conflict_resolution_style: profile.conflict_resolution_style,
    planning_style: profile.planning_style,
    communication_preference: profile.communication_preference,
    affection_styles: profile.affection_styles || [],
    looking_for_intention: profile.looking_for_intention,
    marriage_timeline: profile.marriage_timeline,
    relationship_journey_stage: profile.relationship_journey_stage,
    introduce_partner_to_children: profile.introduce_partner_to_children,
    discuss_marriage_early: profile.discuss_marriage_early,
    relationship_progression: profile.relationship_progression,
    religious_ceremony_requirements: profile.religious_ceremony_requirements,
    photos: photos.map((p) => ({
      id: p.id,
      url: p.url,
      is_primary: p.is_primary,
      watermark: viewerWatermark || "MAAAK PROTECTED",
    })),
    compatibility: compatibility || null,
  };
}

export async function updateUserProfileData(
  userId: string,
  updates: Record<string, unknown>,
  publishIfComplete = false,
) {
  const sb = createAdminSupabaseClient();

  // Validate workbook constraints
  if (
    typeof updates.short_bio === "string" &&
    updates.short_bio.length > 300
  ) {
    return {
      ok: false as const,
      field: "short_bio",
      message: "Short Bio cannot exceed 300 characters.",
    };
  }

  if (
    Array.isArray(updates.hobbies_interests) &&
    updates.hobbies_interests.length > 5
  ) {
    return {
      ok: false as const,
      field: "hobbies_interests",
      message: "You may select a maximum of 5 hobbies & interests.",
    };
  }

  if (
    Array.isArray(updates.my_top_values) &&
    updates.my_top_values.length > 5
  ) {
    return {
      ok: false as const,
      field: "my_top_values",
      message: "You may select a maximum of 5 personal values.",
    };
  }

  if (
    Array.isArray(updates.partner_top_values) &&
    updates.partner_top_values.length > 3
  ) {
    return {
      ok: false as const,
      field: "partner_top_values",
      message: "You may select a maximum of 3 most important values in a partner.",
    };
  }

  if (
    Array.isArray(updates.ideal_future_lifestyle) &&
    updates.ideal_future_lifestyle.length > 5
  ) {
    return {
      ok: false as const,
      field: "ideal_future_lifestyle",
      message: "You may select a maximum of 5 ideal future lifestyle options.",
    };
  }

  if (
    Array.isArray(updates.personality_traits) &&
    updates.personality_traits.length > 5
  ) {
    return {
      ok: false as const,
      field: "personality_traits",
      message: "You may select a maximum of 5 personality traits.",
    };
  }

  if (
    Array.isArray(updates.affection_styles) &&
    updates.affection_styles.length > 3
  ) {
    return {
      ok: false as const,
      field: "affection_styles",
      message: "You may select up to 3 ways of showing affection.",
    };
  }

  const { data: existingProfile } = await sb
    .from("user_profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  const { data: photos } = await sb
    .from("profile_photographs")
    .select("id")
    .eq("user_id", userId);

  const photosCount = (photos || []).length;

  const cleanUpdates: Record<string, unknown> = { ...updates };
  if (typeof cleanUpdates.postcode === "string" && cleanUpdates.postcode.trim()) {
    cleanUpdates.postcode = cleanUpdates.postcode.trim().toUpperCase();
    cleanUpdates.postcode_area = extractOutwardPostcode(
      cleanUpdates.postcode as string,
    );
  }

  if (cleanUpdates.height_cm !== undefined && cleanUpdates.height_cm !== null) {
    const cm = Number(cleanUpdates.height_cm);
    cleanUpdates.height_cm = cm;
    const found = HEIGHT_OPTIONS.find((h) => h.cm === cm);
    if (found) cleanUpdates.height_display = found.label;
  }

  if (cleanUpdates.children_count !== undefined) {
    cleanUpdates.has_children =
      cleanUpdates.children_count !== "None" &&
      cleanUpdates.children_count !== "0" &&
      Boolean(cleanUpdates.children_count);
  }

  // Prevent any attempt to set a hide_photo flag
  delete cleanUpdates.hide_photos;
  delete cleanUpdates.blur_photos;

  const mergedProfile = {
    ...(existingProfile || {}),
    ...cleanUpdates,
  } as Partial<UserProfileRecord>;

  const completion = calculateProfileCompletion(mergedProfile, photosCount);
  cleanUpdates.completion_percentage = completion.percentage;

  if (publishIfComplete) {
    if (!completion.hasMinimumPhotos) {
      return {
        ok: false as const,
        field: "photos",
        message:
          "A minimum of 2 clear profile photographs is required before publishing your profile.",
      };
    }
    cleanUpdates.is_published = true;
    cleanUpdates.published_at =
      existingProfile?.published_at || new Date().toISOString();
  }

  const { data: savedProfile, error } = await sb
    .from("user_profiles")
    .upsert(
      {
        ...(existingProfile || {}),
        ...cleanUpdates,
        user_id: userId,
      },
      { onConflict: "user_id" },
    )
    .select("*")
    .single();

  if (error) {
    return {
      ok: false as const,
      field: "general",
      message: error.message,
    };
  }

  // Trigger compatibility & Gale-Shapley recalculation after profile change
  await executeBatchMatchingRun("profile_updated", userId);

  return {
    ok: true as const,
    profile: savedProfile,
    completion,
  };
}

export async function updateUserPreferences(
  userId: string,
  prefsInput: Partial<UserPreferencesRecord>,
) {
  const sb = createAdminSupabaseClient();

  // Validate multi-select max caps from Compatibility-Preference sheet
  if (
    Array.isArray(prefsInput.preferred_locations) &&
    prefsInput.preferred_locations.length > 5
  ) {
    return {
      ok: false as const,
      field: "preferred_locations",
      message: "You may select up to 5 preferred areas/cities/regions.",
    };
  }

  if (
    Array.isArray(prefsInput.preferred_partner_employment) &&
    prefsInput.preferred_partner_employment.length > 3
  ) {
    return {
      ok: false as const,
      field: "preferred_partner_employment",
      message: "You may select up to 3 partner employment preferences.",
    };
  }

  const { data: saved, error } = await sb
    .from("user_preferences")
    .upsert(
      {
        ...prefsInput,
        user_id: userId,
      },
      { onConflict: "user_id" },
    )
    .select("*")
    .single();

  if (error) {
    return { ok: false as const, field: "general", message: error.message };
  }

  // Trigger recalculation
  await executeBatchMatchingRun("profile_updated", userId);

  return { ok: true as const, preferences: saved };
}

export async function updateUserDealbreakers(
  userId: string,
  dealbreakers: { dealbreaker_code: string; required_value: unknown }[],
) {
  const validation = validateDealbreakersInput(dealbreakers);
  if (!validation.valid) {
    return {
      ok: false as const,
      errors: validation.errors,
    };
  }

  const sb = createAdminSupabaseClient();
  const labelMap = new Map(SUPPORTED_DEALBREAKERS.map((d) => [d.code, d.label]));

  await sb.from("user_dealbreakers").delete().eq("user_id", userId);

  if (dealbreakers.length > 0) {
    const rows = dealbreakers.map((d) => ({
      user_id: userId,
      dealbreaker_code: d.dealbreaker_code.trim(),
      dealbreaker_label:
        labelMap.get(d.dealbreaker_code.trim()) || d.dealbreaker_code.trim(),
      required_value: d.required_value,
    }));

    const { error } = await sb.from("user_dealbreakers").insert(rows);
    if (error) {
      return {
        ok: false as const,
        errors: [{ field: "dealbreakers", message: error.message }],
      };
    }
  }

  const { data: updated } = await sb
    .from("user_dealbreakers")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  await recordAuditLog({
    actorId: userId,
    category: "user",
    action: "dealbreakers.updated",
    details: { count: dealbreakers.length, codes: dealbreakers.map((d) => d.dealbreaker_code) },
  });

  // Recalculate mutual eligibility & Gale-Shapley matches immediately
  await executeBatchMatchingRun("profile_updated", userId);

  return {
    ok: true as const,
    dealbreakers: (updated || []) as UserDealbreakerRecord[],
  };
}
