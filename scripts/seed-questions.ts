import { createClient } from "@supabase/supabase-js";
import { WORKBOOK_QUESTIONS } from "../lib/workbook-catalog";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY!;
const schema = process.env.NEXT_PUBLIC_SUPABASE_SCHEMA || "matrimony";

const sb = createClient(url, serviceKey, {
  db: { schema },
  auth: { persistSession: false, autoRefreshToken: false },
});

async function seedQuestions() {
  const { data: categories, error: catErr } = await sb
    .from("question_categories")
    .select("id, slug");

  if (catErr || !categories) {
    throw new Error(`Failed to fetch question_categories: ${catErr?.message}`);
  }

  const catMap = new Map(categories.map((c) => [c.slug, c.id]));

  for (const q of WORKBOOK_QUESTIONS) {
    const categoryId = catMap.get(q.categorySlug);
    if (!categoryId) {
      throw new Error(`Missing category for slug ${q.categorySlug}`);
    }

    const { data: savedQ, error: qErr } = await sb
      .from("profile_questions")
      .upsert(
        {
          category_id: categoryId,
          code: q.code,
          question_text: q.questionText,
          help_text: q.helpText || null,
          section_type: q.sectionType,
          answer_type: q.answerType,
          min_select: q.minSelect ?? 0,
          max_select: q.maxSelect ?? 1,
          max_length: q.maxLength ?? null,
          is_required: q.isRequired,
          is_private: q.isPrivate ?? false,
          supports_preference: q.supportsPreference ?? false,
          supports_dealbreaker: q.supportsDealbreaker ?? false,
          profile_column: q.profileColumn ?? q.code,
          conditional_on: q.conditionalOn ?? null,
          sort_order: q.sortOrder,
          is_active: true,
        },
        { onConflict: "code" },
      )
      .select("id")
      .single();

    if (qErr || !savedQ) {
      throw new Error(`Question upsert failed (${q.code}): ${qErr?.message}`);
    }

    if (q.options && q.options.length > 0) {
      await sb.from("question_options").delete().eq("question_id", savedQ.id);
      const optRows = q.options.map((opt, idx) => ({
        question_id: savedQ.id,
        value: opt.value,
        label: opt.label,
        group_name: opt.group || null,
        allows_custom_text: opt.allowsCustomText ?? false,
        is_exclusive: opt.isExclusive ?? false,
        sort_order: idx + 1,
      }));
      const { error: oErr } = await sb.from("question_options").insert(optRows);
      if (oErr) {
        throw new Error(`Options insert failed (${q.code}): ${oErr.message}`);
      }
    }
  }

  console.log(
    `Successfully seeded ${WORKBOOK_QUESTIONS.length} profile questions and their options into matrimony schema.`,
  );
}

seedQuestions().catch((err) => {
  console.error(err);
  process.exit(1);
});
