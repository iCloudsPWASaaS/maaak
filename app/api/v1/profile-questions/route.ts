import type { NextRequest } from "next/server";
import { apiOptionsResponse, apiSuccess } from "@/lib/api-response";
import {
  AFFECTION_STYLES_LIST,
  CORE_VALUES_LIST,
  COUNTRY_NATIONALITY_OPTIONS,
  EDUCATION_OPTIONS,
  ETHNICITY_GROUPS,
  HEIGHT_OPTIONS,
  HOBBIES_GROUPS,
  IDEAL_FUTURE_LIFESTYLE_LIST,
  LANGUAGE_OPTIONS,
  PERSONALITY_TRAITS_LIST,
  PROFESSION_GROUPS,
  RELIGION_OPTIONS,
  RELIGIOUS_DENOMINATIONS,
  SUPPORTED_DEALBREAKERS,
  UK_REGIONS_AND_CITIES,
  WORKBOOK_QUESTIONS,
} from "@/lib/workbook-catalog";
import { createAdminSupabaseClient } from "@/supabase/admin";

export async function OPTIONS() {
  return apiOptionsResponse();
}

export async function GET(req: NextRequest) {
  const categorySlug = req.nextUrl.searchParams.get("category");
  const sb = createAdminSupabaseClient();

  const [{ data: categories }, { data: dbQuestions }] = await Promise.all([
    sb
      .from("question_categories")
      .select("*")
      .eq("is_active", true)
      .order("sort_order", { ascending: true }),
    sb
      .from("profile_questions")
      .select("*, question_options(*)")
      .eq("is_active", true)
      .order("sort_order", { ascending: true }),
  ]);

  const questions =
    dbQuestions && dbQuestions.length > 0 ? dbQuestions : WORKBOOK_QUESTIONS;

  const filteredQuestions = categorySlug
    ? WORKBOOK_QUESTIONS.filter((q) => q.categorySlug === categorySlug)
    : WORKBOOK_QUESTIONS;

  return apiSuccess("Profile questions catalog retrieved successfully", {
    categories: categories || [],
    questions: filteredQuestions,
    dbQuestionsCount: questions.length,
    catalogs: {
      professions: PROFESSION_GROUPS,
      hobbies: HOBBIES_GROUPS,
      heights: HEIGHT_OPTIONS,
      ethnicities: ETHNICITY_GROUPS,
      religions: RELIGION_OPTIONS,
      denominations: RELIGIOUS_DENOMINATIONS,
      educations: EDUCATION_OPTIONS,
      languages: LANGUAGE_OPTIONS,
      nationalities: COUNTRY_NATIONALITY_OPTIONS,
      ukRegions: UK_REGIONS_AND_CITIES,
      coreValues: CORE_VALUES_LIST,
      idealFutureLifestyles: IDEAL_FUTURE_LIFESTYLE_LIST,
      personalityTraits: PERSONALITY_TRAITS_LIST,
      affectionStyles: AFFECTION_STYLES_LIST,
      supportedDealbreakers: SUPPORTED_DEALBREAKERS,
    },
  });
}
