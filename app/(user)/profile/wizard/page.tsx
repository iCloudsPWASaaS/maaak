"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Bookmark,
  Briefcase,
  CalendarDays,
  Camera,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Compass,
  Heart,
  Home,
  Languages,
  Loader2,
  MapPin,
  Mic,
  Play,
  Sparkles,
  Square,
  Trash2,
  Upload,
  User,
  Users,
  Wallet,
} from "lucide-react";
import {
  WizardChips,
  WizardFieldShell,
  WizardInput,
  WizardSearchableChips,
  WizardSection,
  WizardSelect,
  WizardTextarea,
  type WizardOption,
} from "@/components/profile/WizardFields";
import {
  COUNTRY_NATIONALITY_OPTIONS,
  CORE_VALUES_LIST,
  EDUCATION_OPTIONS,
  ETHNICITY_GROUPS,
  HEIGHT_OPTIONS,
  HOBBIES_GROUPS,
  IDEAL_FUTURE_LIFESTYLE_LIST,
  LANGUAGE_OPTIONS,
  PROFESSION_GROUPS,
  RELIGION_OPTIONS,
  RELIGIOUS_DENOMINATIONS,
} from "@/lib/workbook-catalog";

type StepMeta = {
  step: number;
  slug: string;
  title: string;
  subtitle: string;
  navLabel: string;
};

type WizardField =
  | {
      type: "select";
      col: string;
      label: string;
      options: WizardOption[];
      hint?: string;
      required?: boolean;
      full?: boolean;
      placeholder?: string;
      onChange?: (value: string) => void;
    }
  | {
      type: "input";
      col: string;
      label: string;
      hint?: string;
      required?: boolean;
      full?: boolean;
      placeholder?: string;
      maxLength?: number;
    }
  | {
      type: "textarea";
      col: string;
      label: string;
      hint?: string;
      required?: boolean;
      maxLength?: number;
    }
  | {
      type: "chips";
      col: string;
      label: string;
      options: WizardOption[];
      max: number;
      hint?: string;
      required?: boolean;
      asString?: boolean;
    }
  | {
      type: "search";
      col: string;
      label: string;
      options: WizardOption[];
      max: number;
      hint?: string;
      required?: boolean;
    }
  | {
      type: "voice";
      col: string;
      label: string;
      hint?: string;
    };

type WizardSectionDef = {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  fields: WizardField[];
};

const WIZARD_STEPS: StepMeta[] = [
  {
    step: 1,
    slug: "profile-about",
    title: "About Me, Background & Faith",
    subtitle: "Tell members about yourself, your background and what matters to you.",
    navLabel: "About Me, & Faith",
  },
  {
    step: 2,
    slug: "profile-lifestyle",
    title: "Lifestyle & Religious Practice",
    subtitle:
      "Tell us about your lifestyle, religious practice and the values that guide your everyday life.",
    navLabel: "Lifestyle & Religious Practice",
  },
  {
    step: 3,
    slug: "profile-family",
    title: "Family, Children & Future",
    subtitle: "Tell us about your family, children and your plans for the future.",
    navLabel: "Family, Children & Future",
  },
  {
    step: 4,
    slug: "profile-wellbeing",
    title: "Wellbeing & Future",
    subtitle:
      "Tell us about your future lifestyle, daily rhythm and relationship intentions.",
    navLabel: "Living & Wellbeing",
  },
  {
    step: 5,
    slug: "profile-photos",
    title: "Photos",
    subtitle: "Add clear, recent photos to help potential matches get to know you.",
    navLabel: "Photos",
  },
];

function makeOptions(values: string[]): WizardOption[] {
  return values.map((value) => ({ value, label: value }));
}

function groupedOptions(
  groups: { group: string; items: string[] }[],
): WizardOption[] {
  return groups.flatMap((group) =>
    group.items.map((item) => ({
      value: item,
      label: item,
      group: group.group,
    })),
  );
}

function asStringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((item) => String(item));
  if (typeof value === "string" && value.trim()) {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

const relationshipStatusOptions = makeOptions([
  "Single",
  "Divorced",
  "Widowed",
  "Separated",
  "Never Married",
]);

const concludedOptions = makeOptions([
  "Yes",
  "No",
  "In Process",
  "Not Applicable",
]);

const heightOptions = HEIGHT_OPTIONS.map((item) => ({
  value: String(item.cm),
  label: item.label,
}));

const weightOptions: WizardOption[] = [
  { value: "Prefer not to say", label: "Prefer not to say" },
  ...Array.from({ length: 121 }, (_, index) => 40 + index).map((kg) => ({
    value: `${kg} kg`,
    label: `${kg} kg / ${Math.round(kg * 2.20462)} lbs`,
  })),
];

const educationOptions = makeOptions(EDUCATION_OPTIONS);
const industryOptions = PROFESSION_GROUPS.map((group) => ({
  value: group.group,
  label: group.group,
}));
const professionOptions = groupedOptions(PROFESSION_GROUPS);
const ethnicityOptions = groupedOptions(ETHNICITY_GROUPS);
const nationalityOptions = makeOptions(COUNTRY_NATIONALITY_OPTIONS);
const languageOptions = makeOptions(LANGUAGE_OPTIONS);
const hobbyOptions = groupedOptions(HOBBIES_GROUPS);

const religionOptions: WizardOption[] = RELIGION_OPTIONS.map((option) => ({
  value: option,
  label: option
    .replace("/Islam", "")
    .replace("/Hinduism", "")
    .replace("/Sikhism", "")
    .replace("/Judaism", "")
    .replace("/Buddhism", ""),
}));

const religiousPracticeOptions = makeOptions([
  "Very practising",
  "Practising",
  "Moderately practising",
  "Occasionally practising",
  "Not practising",
  "Not religious",
  "Prefer not to say",
]);

const faithImportanceOptions = makeOptions([
  "Central",
  "Very important",
  "Important",
  "Somewhat important",
  "Not important",
]);

const familyImportanceOptions = makeOptions([
  "Central to my life",
  "Very important",
  "Important",
  "Moderately important",
  "Not a major priority",
]);

const hijabOptions = makeOptions([
  "Hijab always in public",
  "Most of the time",
  "Occasionally",
  "No, considering it",
  "No",
  "Niqab",
  "Other",
  "Prefer not to say",
]);

const facialHairOptions = makeOptions([
  "Full beard",
  "Short or trimmed beard",
  "Stubble",
  "Clean-shaven",
  "Varies",
  "Prefer not to say",
]);

const smokingOptions = makeOptions([
  "Never",
  "Occasionally",
  "Regularly",
  "Social",
  "Trying to quit",
  "Prefer not to say",
]);

const alcoholOptions = makeOptions([
  "Never",
  "Occasionally",
  "Regularly",
  "Social",
  "Prefer not to say",
]);

const dietaryOptions = makeOptions([
  "No dietary restrictions",
  "Halal",
  "Kosher",
  "Vegetarian",
  "Vegan",
  "Pescatarian",
  "Jain diet",
  "Gluten-free",
  "Dairy-free",
  "Other - please specify",
  "Prefer not to say",
]);

const activityOptions = makeOptions([
  "Minimal physical activity",
  "Light walking or occasional exercise",
  "Regular walking or exercise",
  "Frequent exercise or sports",
  "Intensive physical activity or training",
  "Prefer not to say",
]);

const valuesOptions = makeOptions(CORE_VALUES_LIST);

const lifeOutlookOptions = makeOptions([
  "Traditional",
  "Mostly traditional",
  "Balance of traditional & modern",
  "Mostly modern",
  "Modern",
]);

const decisionOptions = makeOptions([
  "Partner and I decide together",
  "Family input is important",
  "I value advice but decide independently",
  "Depends on the decision",
]);

const culturalOptions = makeOptions([
  "Very important",
  "Somewhat important",
  "Flexible",
  "Not important",
  "Prefer not to say",
]);

const childrenCountOptions = makeOptions([
  "None",
  "1",
  "2",
  "3",
  "4",
  "5+",
]);

const childrenAgeOptions = makeOptions([
  "Under 2",
  "2-4",
  "5-7",
  "8-11",
  "12-15",
  "16-17",
  "18+",
]);

const wantsMoreChildrenOptions = makeOptions([
  "Definitely",
  "Open to it",
  "Unsure",
  "Probably not",
  "Definitely not",
]);

const parentingOptions = makeOptions([
  "Children live with me full-time",
  "Children live with me most of the time",
  "Shared parenting",
  "Children stay with me regularly",
  "Children primarily live with their other parent",
  "Adult children / living independently",
  "Prefer not to say",
]);

const blendedOptions = makeOptions([
  "Very comfortable",
  "Open to it",
  "Depends",
  "Unsure",
  "Not for me",
]);

const stepParentOptions = makeOptions([
  "Very comfortable",
  "Comfortable",
  "Open to it",
  "Depends on the circumstances",
  "Unsure",
  "Not for me",
]);

const livingArrangementOptions = makeOptions([
  "Own home",
  "Renting",
  "Living with family",
  "Shared accommodation",
  "Other",
]);

const relocationOptions = makeOptions([
  "Yes",
  "Possibly",
  "Locally",
  "Within my region",
  "Within the UK",
  "Internationally",
  "No, I need to remain where I am",
]);

const longDistanceOptions = makeOptions(["Yes", "Maybe", "No"]);

const idealLocationOptions = makeOptions([
  "City",
  "Suburbs",
  "Small town",
  "Countryside",
  "Abroad",
]);

const workFamilyOptions = makeOptions([
  "Family comes first",
  "Career comes first",
  "A balanced approach to work and family",
  "Flexible depending on circumstances",
  "Prefer not to say",
]);

const financialOptions = makeOptions([
  "Shared equally",
  "Shared proportionately based on income",
  "One partner is the main financial provider",
  "Financially independent from each other",
  "Flexible depending on circumstances",
  "Open to discussing with my partner",
  "Prefer not to say",
]);

const householdOptions = makeOptions([
  "Shared equally",
  "Shared based on availability and ability",
  "Traditional household roles",
  "One partner takes primary responsibility",
  "Flexible depending on circumstances",
  "Open to discussing with my partner",
  "Prefer not to say",
]);

const childrenFaithOptions = makeOptions([
  "Essential",
  "Very important",
  "Somewhat important",
  "Not very important",
  "Not important",
  "Open to an interfaith upbringing",
  "Prefer children to choose their own beliefs",
  "Not applicable - I do not follow a religion",
  "Prefer not to say",
]);

const futureEmploymentOptions = makeOptions([
  "Work full-time",
  "Work part-time",
  "Be self-employed or run a business",
  "Focus on family and household responsibilities",
  "Pursue further education or training",
  "Return to employment in the future",
  "Retire or remain retired",
  "Flexible depending on family circumstances",
  "Undecided",
  "Prefer not to say",
]);

const lifestyleOptions = makeOptions(IDEAL_FUTURE_LIFESTYLE_LIST);

const availabilityOptions = makeOptions([
  "Every day after 5pm",
  "Some weekday evenings",
  "Weekends only",
  "Occasionally on weekdays",
  "Limited availability",
]);

const meetingFrequencyOptions = makeOptions([
  "Once a week",
  "A few times a month",
  "Once a month",
  "Whenever our schedules allow",
]);

const travelOptions = makeOptions([
  "Within my city",
  "Within my region",
  "Anywhere in the UK",
  "Internationally",
]);

const firstDateOptions = makeOptions([
  "Coffee or tea",
  "A meal",
  "A walk",
  "A cultural or faith-compatible activity",
  "A video call first",
]);

const intentionOptions = makeOptions([
  "Marriage",
  "Long-term relationship",
  "Still exploring",
]);

const marriageTimelineOptions = makeOptions([
  "Within 6 months",
  "6-12 months",
  "1-2 years",
  "More than 2 years",
  "Open to discussion",
]);

const journeyStageOptions = makeOptions([
  "Never married",
  "Divorced",
  "Widowed",
]);

export default function ProfileWizardPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [profile, setProfile] = useState<Record<string, unknown>>({});
  const [photos, setPhotos] = useState<
    { id: string; url: string; is_primary: boolean; sort_order?: number }[]
  >([]);
  const [completion, setCompletion] = useState<{
    percentage: number;
    hasMinimumPhotos: boolean;
    canPublish: boolean;
    missingFields: string[];
  }>({
    percentage: 0,
    hasMinimumPhotos: false,
    canPublish: false,
    missingFields: [],
  });
  const [saving, setSaving] = useState(false);
  const [voiceBusy, setVoiceBusy] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const secondsRef = useRef(0);

  const getString = useCallback(
    (col: string) => String(profile[col] ?? ""),
    [profile],
  );

  const setField = useCallback((col: string, value: unknown) => {
    setProfile((previous) => ({ ...previous, [col]: value }));
  }, []);

  const setMultiValue = useCallback(
    (col: string, values: string[], asString = false) => {
      setField(col, asString ? values.join(", ") : values);
    },
    [setField],
  );

  const loadMyProfile = useCallback(async () => {
    const response = await fetch("/api/v1/profiles/me");
    if (!response.ok) return;
    const json = await response.json();
    setProfile(json.data?.profile || {});
    setPhotos(json.data?.photos || []);
    if (json.data?.completion) setCompletion(json.data.completion);
    const step = Number(json.data?.profile?.wizard_step || 1);
    if (step >= 1 && step <= WIZARD_STEPS.length) setCurrentStep(step);
  }, []);

  useEffect(() => {
    void loadMyProfile();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, [loadMyProfile]);

  useEffect(() => {
    if (!message && !error) return;
    const timeout = setTimeout(() => {
      setMessage(null);
      setError(null);
    }, 5000);
    return () => clearTimeout(timeout);
  }, [message, error]);

  const denominationOptions = useMemo(() => {
    const religion = getString("religion");
    const values = religion.includes("Muslim")
      ? [
          "Sunni",
          "Shia",
          "Ibadi",
          "Ahmadiyya",
          "Non-denominational Muslim",
          "Prefer not to say",
        ]
      : RELIGIOUS_DENOMINATIONS[religion] || RELIGIOUS_DENOMINATIONS.Default;
    return makeOptions(values);
  }, [getString]);

  const sections = useMemo<Record<number, WizardSectionDef[]>>(
    () => ({
      1: [
        {
          icon: User,
          title: "The Basics",
          description: "Key details you want members to know.",
          fields: [
            {
              type: "select",
              col: "relationship_status",
              label: "Relationship Status",
              options: relationshipStatusOptions,
              required: true,
              full: true,
            },
            {
              type: "select",
              col: "previous_relationship_concluded",
              label: "Past Relationship Legally Concluded?",
              options: concludedOptions,
              required: true,
              full: true,
            },
            {
              type: "select",
              col: "height_cm",
              label: "Height",
              options: heightOptions,
              placeholder: "Select height",
              full: true,
            },
            {
              type: "select",
              col: "weight_display",
              label: "Weight",
              options: weightOptions,
              placeholder: "Select weight",
              hint: "Prefer not to say is available.",
              full: true,
            },
          ],
        },
        {
          icon: Briefcase,
          title: "Career & Education",
          description: "Your education and working life.",
          fields: [
            {
              type: "select",
              col: "education_level",
              label: "Education Level",
              options: educationOptions,
              required: true,
              full: true,
            },
            {
              type: "input",
              col: "job_title",
              label: "Job Title",
              placeholder: "Enter your job title",
              full: true,
            },
            {
              type: "select",
              col: "profession_category",
              label: "Industry",
              options: industryOptions,
              placeholder: "Select an industry",
              full: true,
            },
            {
              type: "select",
              col: "profession",
              label: "Profession",
              options: professionOptions,
              placeholder: "Select your profession",
              full: true,
              onChange: (value) => {
                setField("profession", value);
                const group = PROFESSION_GROUPS.find((item) =>
                  item.items.includes(value),
                );
                setField("profession_category", group?.group || "Other");
              },
            },
            {
              type: "select",
              col: "employment_status",
              label: "Employment Status",
              options: makeOptions([
                "Employed",
                "Self-employed",
                "Student",
                "Not currently working",
                "Retired",
                "Prefer not to say",
              ]),
              full: true,
            },
          ],
        },
        {
          icon: BookOpen,
          title: "Background & Faith",
          description: "Your cultural, ethnic and religious background.",
          fields: [
            {
              type: "select",
              col: "religion",
              label: "Religion",
              options: religionOptions,
              required: true,
              full: true,
            },
            {
              type: "select",
              col: "ethnicity",
              label: "Ethnicity",
              options: ethnicityOptions,
              required: true,
              full: true,
            },
            {
              type: "search",
              col: "nationalities",
              label: "Nationality",
              options: nationalityOptions,
              max: 10,
              hint: "Searchable multi-select. Choose up to 10.",
              full: true,
            },
          ],
        },
        {
          icon: Languages,
          title: "Language & Interests",
          description: "How you communicate and what you enjoy.",
          fields: [
            {
              type: "search",
              col: "languages_spoken",
              label: "Languages Spoken",
              options: languageOptions,
              max: 10,
              hint: "Choose up to 10 languages.",
              full: true,
            },
            {
              type: "search",
              col: "hobbies_interests",
              label: "Hobbies & Interests",
              options: hobbyOptions,
              max: 10,
              hint: "Choose up to 10 interests.",
              full: true,
            },
          ],
        },
        {
          icon: Sparkles,
          title: "Add a Personal Touch",
          description: "Optional - introduce yourself in your own words.",
          fields: [
            {
              type: "textarea",
              col: "short_bio",
              label: "Short Bio",
              hint: "Write a few sentences about yourself.",
              maxLength: 300,
            },
            {
              type: "voice",
              col: "voice_bio_url",
              label: "Voice Note Bio",
              hint: "Record a voice note up to 120 seconds.",
            },
          ],
        },
      ],
      2: [
        {
          icon: BookOpen,
          title: "Faith & Religious Practice",
          description: "Your religious practice and how faith fits into daily life.",
          fields: [
            {
              type: "select",
              col: "religious_practice",
              label: "Religious Practice",
              options: religiousPracticeOptions,
              required: true,
              full: true,
            },
            {
              type: "chips",
              col: "religious_denomination",
              label: "Religious Denomination or Tradition",
              options: denominationOptions,
              max: 3,
              hint: "Multi-select up to 3 where relevant.",
              full: true,
              asString: true,
            },
            {
              type: "select",
              col: "faith_importance",
              label: "How Important is Faith in Everyday Life?",
              options: faithImportanceOptions,
              full: true,
            },
            {
              type: "select",
              col: "family_importance",
              label: "How Important is Family in Your Everyday Life?",
              options: familyImportanceOptions,
              full: true,
            },
          ],
        },
        {
          icon: User,
          title: "Personal Appearance",
          description: "Options are shown only where relevant to your gender.",
          fields: [
            ...(getString("gender") === "Female"
              ? [
                  {
                    type: "select" as const,
                    col: "hijab_preference",
                    label: "Hijab / Head Covering",
                    options: hijabOptions,
                    hint: "Shown to female members only.",
                    full: true,
                  },
                ]
              : []),
            ...(getString("gender") === "Male"
              ? [
                  {
                    type: "select" as const,
                    col: "facial_hair",
                    label: "Facial Hair",
                    options: facialHairOptions,
                    hint: "Shown to male members only.",
                    full: true,
                  },
                ]
              : []),
          ],
        },
        {
          icon: Activity,
          title: "Lifestyle & Daily Habits",
          description: "Your day-to-day lifestyle choices and habits.",
          fields: [
            {
              type: "select",
              col: "smoking",
              label: "Smoking",
              options: smokingOptions,
              required: true,
              full: true,
            },
            {
              type: "select",
              col: "alcohol",
              label: "Alcohol Consumption",
              options: alcoholOptions,
              required: true,
              full: true,
            },
            {
              type: "chips",
              col: "dietary_preferences",
              label: "Dietary Preferences",
              options: dietaryOptions,
              max: 3,
              hint: "Multi-select up to 3.",
              full: true,
            },
            {
              type: "select",
              col: "activity_level",
              label: "Activity Level",
              options: activityOptions,
              full: true,
            },
          ],
        },
        {
          icon: Heart,
          title: "Personal Values",
          description: "The core values and outlook that guide you.",
          fields: [
            {
              type: "chips",
              col: "my_top_values",
              label: "Which 5 Values Matter Most to You?",
              options: valuesOptions,
              max: 5,
              required: true,
              full: true,
            },
            {
              type: "select",
              col: "life_outlook",
              label: "How Would You Describe Your Outlook on Life?",
              options: lifeOutlookOptions,
              full: true,
            },
            {
              type: "select",
              col: "decision_making_style",
              label: "When Making Major Life Decisions, What Matters Most?",
              options: decisionOptions,
              full: true,
            },
            {
              type: "select",
              col: "cultural_traditions_importance",
              label:
                "How Important Are Cultural Traditions and Customs in Your Future Household?",
              options: culturalOptions,
              full: true,
            },
          ],
        },
      ],
      3: [
        {
          icon: Users,
          title: "Children & Parenthood",
          description: "Your children and plans for growing your family.",
          fields: [
            {
              type: "select",
              col: "children_count",
              label: "How Many Children Do You Have?",
              options: childrenCountOptions,
              required: true,
              full: true,
            },
            {
              type: "chips",
              col: "children_ages",
              label: "Age of Children",
              options: childrenAgeOptions,
              max: 10,
              full: true,
            },
            {
              type: "select",
              col: "wants_more_children",
              label: "Would You Like More Children?",
              options: wantsMoreChildrenOptions,
              full: true,
            },
            {
              type: "select",
              col: "parenting_arrangement",
              label: "Parenting Arrangement",
              options: parentingOptions,
              full: true,
            },
          ],
        },
        {
          icon: Users,
          title: "Blended Family",
          description: "Your views on building a blended family.",
          fields: [
            {
              type: "select",
              col: "blended_family_comfort",
              label: "How Do You Feel About Building a Blended Family?",
              options: blendedOptions,
              full: true,
            },
            {
              type: "select",
              col: "step_parent_comfort",
              label: "How Do You Feel About Becoming a Step-Parent?",
              options: stepParentOptions,
              full: true,
            },
          ],
        },
        {
          icon: Home,
          title: "Home & Extended Family",
          description: "Your current situation and views on family involvement.",
          fields: [
            {
              type: "select",
              col: "current_living_arrangement",
              label: "What Is Your Current Living Arrangement?",
              options: livingArrangementOptions,
              full: true,
            },
            {
              type: "select",
              col: "extended_family_living",
              label: "How Close Would You Like to Live to Your Family?",
              options: relocationOptions,
              full: true,
            },
            {
              type: "select",
              col: "extended_family_involvement",
              label: "How Involved Would You Like Your Family to Be?",
              options: makeOptions([
                "Minimal involvement",
                "Some involvement (input and advice)",
                "Very involved",
                "Depends on the relationship",
                "Prefer not to say",
              ]),
              full: true,
            },
          ],
        },
        {
          icon: MapPin,
          title: "Location & Future",
          description: "Your flexibility and future location plans.",
          fields: [
            {
              type: "select",
              col: "relocation_willingness",
              label: "Would You Relocate for the Right Relationship?",
              options: relocationOptions,
              full: true,
            },
            {
              type: "select",
              col: "long_distance_consideration",
              label: "Would You Consider a Long-Distance Relationship Initially?",
              options: longDistanceOptions,
              full: true,
            },
            {
              type: "select",
              col: "ideal_living_environment",
              label: "Where Would You Ideally Live?",
              options: idealLocationOptions,
              full: true,
            },
          ],
        },
        {
          icon: Wallet,
          title: "Shared Responsibilities",
          description:
            "Your approach to work, finances, household and raising children.",
          fields: [
            {
              type: "select",
              col: "work_family_balance",
              label: "How Do You Manage Work and Family Life?",
              options: workFamilyOptions,
              full: true,
            },
            {
              type: "select",
              col: "financial_management",
              label: "How Do You View Financial Responsibilities in a Relationship?",
              options: financialOptions,
              full: true,
            },
            {
              type: "select",
              col: "household_responsibilities",
              label: "How Do You Prefer Household Responsibilities to Be Managed?",
              options: householdOptions,
              full: true,
            },
            {
              type: "select",
              col: "children_faith_upbringing",
              label: "How Important Is It That Children Are Raised in Line With Your Faith?",
              options: childrenFaithOptions,
              full: true,
            },
          ],
        },
      ],
      4: [
        {
          icon: CalendarDays,
          title: "Wellbeing & Daily Rhythm",
          description: "The rhythm of your week and how you like to meet.",
          fields: [
            {
              type: "select",
              col: "usual_availability",
              label: "When Are You Usually Available?",
              options: availabilityOptions,
              full: true,
            },
            {
              type: "select",
              col: "ideal_meeting_frequency",
              label: "How Often Would You Like to Meet?",
              options: meetingFrequencyOptions,
              full: true,
            },
            {
              type: "select",
              col: "date_travel_comfort",
              label: "How Far Would You Travel for a First Meeting?",
              options: travelOptions,
              full: true,
            },
            {
              type: "select",
              col: "preferred_first_date_style",
              label: "What Is Your Preferred First Date Style?",
              options: firstDateOptions,
              full: true,
            },
          ],
        },
        {
          icon: Compass,
          title: "Future & Lifestyle",
          description: "The life you hope to build together.",
          fields: [
            {
              type: "select",
              col: "future_employment_plans",
              label: "What Are Your Plans Regarding Employment in the Future?",
              options: futureEmploymentOptions,
              full: true,
            },
            {
              type: "chips",
              col: "ideal_future_lifestyle",
              label: "Select Up to 5 Lifestyle Aspirations",
              options: lifestyleOptions,
              max: 5,
              required: true,
              full: true,
            },
          ],
        },
        {
          icon: Heart,
          title: "Relationship Intention",
          description: "What you are looking for and how you approach marriage.",
          fields: [
            {
              type: "select",
              col: "looking_for_intention",
              label: "What Are You Looking For?",
              options: intentionOptions,
              required: true,
              full: true,
            },
            {
              type: "select",
              col: "marriage_timeline",
              label: "Ideal Marriage Timeline",
              options: marriageTimelineOptions,
              full: true,
            },
            {
              type: "select",
              col: "relationship_journey_stage",
              label: "Relationship Journey Stage",
              options: journeyStageOptions,
              full: true,
            },
          ],
        },
      ],
    }),
    [denominationOptions, getString, setField],
  );

  const activeStep = WIZARD_STEPS[currentStep - 1];
  const fallbackCompletion = [12, 32, 55, 75, 100][currentStep - 1] || 0;
  const displayCompletion =
    completion.percentage > 0 ? completion.percentage : fallbackCompletion;

  async function handleSaveStep(publish = false): Promise<boolean> {
    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      const profileUpdates: Record<string, unknown> = { ...profile };
      delete profileUpdates.weight_display;
      const response = await fetch("/api/v1/profiles/me/answers", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profileUpdates,
          wizard_step: currentStep,
          publish,
        }),
      });
      const json = await response.json();
      if (!response.ok || !json.success) {
        setError(
          json.errors?.[0]?.message || json.message || "Could not save profile.",
        );
        return false;
      }
      setProfile(json.data.profile);
      setCompletion(json.data.completion);
      setMessage(
        publish
          ? "Your profile is published and your matches have been refreshed."
          : "Your progress has been saved.",
      );
      return true;
    } catch {
      setError("Network error while saving profile.");
      return false;
    } finally {
      setSaving(false);
    }
  }

  function validateStep(): string | null {
    for (const section of sections[currentStep] || []) {
      for (const field of section.fields) {
        if (!("required" in field) || !field.required) continue;
        const value = profile[field.col];
        const filled = Array.isArray(value)
          ? value.length > 0
          : typeof value === "string"
            ? value.trim().length > 0
            : value !== null && value !== undefined;
        if (!filled) return `${field.label} is required.`;
      }
    }
    return null;
  }

  async function handleNext() {
    const validationError = validateStep();
    if (validationError) {
      setError(validationError);
      return;
    }
    const saved = await handleSaveStep(false);
    if (saved) setCurrentStep((step) => Math.min(WIZARD_STEPS.length, step + 1));
  }

  async function handleComplete() {
    if (photos.length < 2) {
      setError("Upload at least 2 photographs before completing your profile.");
      return;
    }
    await handleSaveStep(true);
  }

  async function uploadVoiceBio(blob: Blob, durationSec: number) {
    setVoiceBusy(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", blob, `voice-bio-${Date.now()}.webm`);
      formData.append("mediaType", "voice_bio");
      formData.append("durationSec", String(Math.max(1, Math.min(120, durationSec))));
      const response = await fetch("/api/v1/profiles/photos", {
        method: "POST",
        body: formData,
      });
      const json = await response.json();
      if (!response.ok) {
        setError(json.message || "Voice note upload failed.");
        return;
      }
      setField("voice_bio_url", json.data.voice_bio_url);
      setField("voice_bio_duration_sec", json.data.voice_bio_duration_sec);
      setMessage("Voice note saved.");
    } catch {
      setError("Voice note upload failed.");
    } finally {
      setVoiceBusy(false);
    }
  }

  async function startRecording() {
    if (
      typeof MediaRecorder === "undefined" ||
      !navigator.mediaDevices?.getUserMedia
    ) {
      setError("Voice recording is not supported in this browser.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      streamRef.current = stream;
      recorderRef.current = recorder;
      chunksRef.current = [];
      secondsRef.current = 0;
      setRecordingSeconds(0);
      setRecording(true);

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        if (timerRef.current) clearInterval(timerRef.current);
        stream.getTracks().forEach((track) => track.stop());
        setRecording(false);
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        });
        if (blob.size > 0) void uploadVoiceBio(blob, secondsRef.current);
      };

      recorder.start();
      timerRef.current = setInterval(() => {
        secondsRef.current += 1;
        setRecordingSeconds(secondsRef.current);
        if (secondsRef.current >= 120 && recorderRef.current?.state === "recording") {
          recorderRef.current.stop();
        }
      }, 1000);
    } catch {
      setError("Microphone access was denied.");
    }
  }

  function stopRecording() {
    if (timerRef.current) clearInterval(timerRef.current);
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
    setRecording(false);
  }

  async function uploadPhoto(file: File, index: number) {
    setError(null);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("mediaType", "photo");
    formData.append("isPrimary", String(index === 0 && photos.length === 0));
    const response = await fetch("/api/v1/profiles/photos", {
      method: "POST",
      body: formData,
    });
    const json = await response.json();
    if (!response.ok) {
      setError(json.message || "Photo upload failed.");
      return;
    }
    await loadMyProfile();
    setMessage("Photograph added to your profile.");
  }

  async function replacePhoto(id: string, file: File, makePrimary: boolean) {
    setError(null);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("isPrimary", String(makePrimary));
    const response = await fetch(`/api/v1/profiles/photos/${id}`, {
      method: "PATCH",
      body: formData,
    });
    const json = await response.json();
    if (!response.ok) {
      setError(json.message || "Photo replacement failed.");
      return;
    }
    await loadMyProfile();
    setMessage("Photograph replaced.");
  }

  async function patchPhoto(id: string, payload: Record<string, unknown>) {
    setError(null);
    const response = await fetch(`/api/v1/profiles/photos/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = await response.json();
    if (!response.ok) {
      setError(json.message || "Photo update failed.");
      return;
    }
    await loadMyProfile();
  }

  async function deletePhoto(id: string) {
    setError(null);
    const response = await fetch(`/api/v1/profiles/photos/${id}`, {
      method: "DELETE",
    });
    if (!response.ok) {
      setError("Photograph could not be removed.");
      return;
    }
    await loadMyProfile();
    setMessage("Photograph removed.");
  }

  function movePhoto(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= photos.length) return;
    void patchPhoto(photos[index].id, { sortOrder: target + 1 });
  }

  function renderField(field: WizardField) {
    const raw = profile[field.col];

    if (field.type === "select") {
      return (
        <WizardSelect
          key={field.col}
          label={field.label}
          value={getString(field.col)}
          options={field.options}
          hint={field.hint}
          required={field.required}
          full={field.full ?? true}
          placeholder={field.placeholder}
          onChange={field.onChange || ((value) => setField(field.col, value))}
        />
      );
    }

    if (field.type === "input") {
      return (
        <WizardInput
          key={field.col}
          label={field.label}
          value={getString(field.col)}
          placeholder={field.placeholder}
          hint={field.hint}
          required={field.required}
          full={field.full ?? true}
          maxLength={field.maxLength}
          onChange={(value) => setField(field.col, value)}
        />
      );
    }

    if (field.type === "textarea") {
      return (
        <WizardTextarea
          key={field.col}
          label={field.label}
          value={getString(field.col)}
          placeholder="Write a few sentences about yourself..."
          hint={field.hint}
          required={field.required}
          maxLength={field.maxLength}
          onChange={(value) => setField(field.col, value)}
        />
      );
    }

    if (field.type === "chips") {
      return (
        <WizardChips
          key={field.col}
          label={field.label}
          values={asStringArray(raw)}
          options={field.options}
          max={field.max}
          hint={field.hint}
          required={field.required}
          onChange={(values) => setMultiValue(field.col, values, field.asString)}
        />
      );
    }

    if (field.type === "search") {
      return (
        <WizardSearchableChips
          key={field.col}
          label={field.label}
          values={asStringArray(raw)}
          options={field.options}
          max={field.max}
          hint={field.hint}
          required={field.required}
          onChange={(values) => setMultiValue(field.col, values)}
        />
      );
    }

    const voiceUrl = getString("voice_bio_url");
    return (
      <WizardFieldShell
        key={field.col}
        label={field.label}
        hint={field.hint}
        full
      >
        <div className="rounded-xl border border-[#E4DAC6] bg-[#FCF9F4] p-4">
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={voiceBusy}
              onClick={recording ? stopRecording : startRecording}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold text-white transition disabled:opacity-50 ${
                recording ? "bg-rose-700" : "bg-[#14110E]"
              }`}
            >
              {voiceBusy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : recording ? (
                <Square className="h-4 w-4" />
              ) : (
                <Mic className="h-4 w-4" />
              )}
              <span>
                {voiceBusy
                  ? "Saving voice note..."
                  : recording
                    ? "Stop recording"
                    : voiceUrl
                      ? "Record a new voice note"
                      : "Record voice note"}
              </span>
            </button>
            <span className="text-[11px] font-medium text-[#776B5C]">
              {recording
                ? `${recordingSeconds}s / 120s`
                : voiceUrl
                  ? `Saved (${Number(profile.voice_bio_duration_sec || 0)}s)`
                  : "No voice note yet"}
            </span>
          </div>
          {voiceUrl && (
            <audio controls src={voiceUrl} className="mt-3 h-9 w-full" />
          )}
        </div>
      </WizardFieldShell>
    );
  }

  function renderPhotoSlots() {
    return (
      <WizardSection
        icon={Camera}
        title="Your Photos"
        description="Upload between 2 and 6 photos. The first photo will be your main profile photo."
      >
        <div className="sm:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-xs font-semibold text-[#6F6252]">
              {photos.length} of 6 photos uploaded
            </p>
            <p className="text-[11px] text-[#8C7E6C]">
              2 photos minimum · 6 photos maximum
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }, (_, index) => {
              const photo = photos[index];
              if (!photo) {
                return (
                  <label
                    key={`empty-${index}`}
                    className="flex min-h-56 cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-[#C9B995] bg-[#FCF9F4] px-4 text-center transition hover:border-[#B07A2A] hover:bg-[#F9F1E4]"
                  >
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#F1E4CE] text-[#8C6D3F]">
                      <Upload className="h-5 w-5" />
                    </div>
                    <span className="mt-3 text-xs font-semibold text-[#2C251D]">
                      {index === 0 ? "Add Photo (Main Photo)" : "Add Photo"}
                    </span>
                    <span className="mt-1 text-[10px] text-[#8C7E6C]">
                      JPEG, PNG, WebP or AVIF
                    </span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/avif"
                      className="hidden"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (file) void uploadPhoto(file, index);
                        event.target.value = "";
                      }}
                    />
                  </label>
                );
              }

              return (
                <div
                  key={photo.id}
                  className="overflow-hidden rounded-2xl border border-[#E4DAC6] bg-white"
                >
                  <div className="relative h-48 bg-[#EEE7DA]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={photo.url}
                      alt={`Profile photo ${index + 1}`}
                      className="h-full w-full object-cover"
                    />
                    {photo.is_primary && (
                      <span className="absolute top-2 left-2 rounded-full bg-[#14110E]/85 px-2.5 py-1 text-[10px] font-bold text-[#A8721F]">
                        Main Photo
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-2 px-3 py-2.5">
                    <span className="text-[11px] font-semibold text-[#4A4136]">
                      Photo #{index + 1}
                    </span>
                    <div className="flex items-center gap-1">
                      {!photo.is_primary && (
                        <button
                          type="button"
                          aria-label="Make main photo"
                          title="Make main photo"
                          onClick={() => void patchPhoto(photo.id, { isPrimary: true })}
                          className="rounded-md p-1.5 text-[#8C6D3F] hover:bg-[#F5E9D4]"
                        >
                          <Check className="h-3.5 w-3.5" />
                        </button>
                      )}
                      <button
                        type="button"
                        aria-label="Move photo left"
                        disabled={index === 0}
                        onClick={() => movePhoto(index, -1)}
                        className="rounded-md p-1.5 text-[#6F6252] hover:bg-[#F5E9D4] disabled:opacity-30"
                      >
                        <ChevronLeft className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        aria-label="Move photo right"
                        disabled={index === photos.length - 1}
                        onClick={() => movePhoto(index, 1)}
                        className="rounded-md p-1.5 text-[#6F6252] hover:bg-[#F5E9D4] disabled:opacity-30"
                      >
                        <ChevronRight className="h-3.5 w-3.5" />
                      </button>
                      <label
                        className="cursor-pointer rounded-md p-1.5 text-[#8C6D3F] hover:bg-[#F5E9D4]"
                        title="Replace photo"
                      >
                        <Upload className="h-3.5 w-3.5" />
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp,image/avif"
                          className="hidden"
                          onChange={(event) => {
                            const file = event.target.files?.[0];
                            if (file)
                              void replacePhoto(photo.id, file, photo.is_primary);
                            event.target.value = "";
                          }}
                        />
                      </label>
                      <button
                        type="button"
                        aria-label="Delete photo"
                        onClick={() => void deletePhoto(photo.id)}
                        className="rounded-md p-1.5 text-rose-700 hover:bg-rose-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-5 rounded-xl bg-[#F5E9D4]/60 p-4 text-[11px] leading-5 text-[#5C5346]">
            <p className="font-semibold text-[#2C251D]">Photo guidelines</p>
            <ul className="mt-1 grid gap-1 sm:grid-cols-2">
              <li>· Upload between 2 and 6 clear, recent photos.</li>
              <li>· The first photograph will be your main profile photo.</li>
              <li>· Use a recent photo where your face is clearly visible.</li>
              <li>· Avoid photos with children, contact details or group crops.</li>
              <li>· No inappropriate images or impersonation.</li>
              <li>· Profile photos are always visible to members.</li>
            </ul>
          </div>
        </div>
      </WizardSection>
    );
  }

  return (
    <div
      className="mx-auto max-w-[1500px]"
      style={{
        fontFamily: "var(--font-inter), var(--font-poppins), sans-serif",
      }}
    >
      <div className="overflow-hidden rounded-[20px] border border-[#EBDCC8] bg-white shadow-[0_16px_40px_rgba(80,54,20,0.08)]">
        <div className="flex flex-wrap items-start justify-between gap-6 border-b border-[#EEE2D2] bg-[#FBF3EC] px-5 py-6 sm:px-8">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#B07A2A]">
              MY PROFILE
            </p>
            <h1 className="notification-serif mt-2 text-3xl font-semibold text-[#2A2118] sm:text-4xl">
              {activeStep.title}
            </h1>
            <p className="mt-2 max-w-2xl text-xs leading-5 text-[#7A6D5F] sm:text-sm">
              {activeStep.subtitle}
            </p>
          </div>
          <div className="w-full max-w-xs sm:w-auto">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#7A6D5F]">
                  Profile Completion
                </p>
                <p className="mt-1 text-[11px] text-[#9A8B7A]">
                  {photos.length}/2 minimum photos
                </p>
              </div>
              <p className="notification-serif text-4xl font-bold text-[#A8721F]">
                {displayCompletion}%
              </p>
            </div>
            <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-[#EADCC7]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#B07A2A] to-[#A8721F]"
                style={{ width: `${displayCompletion}%` }}
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 border-b border-[#EEE2D2] bg-[#FBF3EC] px-4 py-4 sm:grid-cols-5 sm:px-6">
          {WIZARD_STEPS.map((step) => {
            const active = step.step === currentStep;
            return (
              <button
                key={step.slug}
                type="button"
                onClick={() => setCurrentStep(step.step)}
                className={`flex min-h-[64px] flex-col items-start justify-center gap-1.5 rounded-xl px-3 py-2.5 text-left text-[10px] font-semibold leading-tight transition last:col-span-2 focus-visible:ring-2 focus-visible:ring-[#A8721F]/40 focus-visible:outline-none sm:flex-row sm:items-center sm:gap-2.5 sm:text-[11px] sm:last:col-span-1 ${
                  active
                    ? "bg-[#B07A2A] text-white shadow-md"
                    : "border border-[#E8D9C5] bg-white/85 text-[#3D3226] hover:border-[#B07A2A]"
                }`}
              >
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[10px] ${
                    active
                      ? "border-white/70 bg-white/15 text-white"
                      : "border-[#B07A2A]/40 text-[#A8721F]"
                  }`}
                >
                  {step.step}
                </span>
                <span>{step.navLabel}</span>
              </button>
            );
          })}
        </div>

        <div className="bg-[#FBF3EC] px-4 py-6 sm:px-8 sm:py-8">

            {message && (
              <div className="mb-5 flex items-center gap-2 rounded-xl border border-emerald-600/25 bg-emerald-50 p-3 text-xs font-semibold text-emerald-900">
                <CheckCircle2 className="h-4 w-4 text-emerald-700" />
                <span>{message}</span>
              </div>
            )}

            {error && (
              <div className="mb-5 rounded-xl border border-rose-500/30 bg-rose-50 p-3 text-xs font-semibold text-rose-800">
                {error}
              </div>
            )}

            <div className="space-y-5">
              {currentStep === 5 ? (
                renderPhotoSlots()
              ) : (
                (sections[currentStep] || []).map((section) => (
                  <WizardSection
                    key={section.title}
                    icon={section.icon}
                    title={section.title}
                    description={section.description}
                  >
                    {section.fields.map((field) => renderField(field))}
                  </WizardSection>
                ))
              )}
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#EBDCC8] bg-white/95 p-3 shadow-[0_8px_24px_rgba(80,54,20,0.06)]">
              <button
                type="button"
                disabled={currentStep === 1 || saving}
                onClick={() => setCurrentStep((step) => Math.max(1, step - 1))}
                className="inline-flex items-center gap-2 rounded-xl border border-[#E1D2BC] bg-white px-4 py-2.5 text-xs font-semibold text-[#4A3B2A] transition hover:border-[#B07A2A] focus-visible:ring-2 focus-visible:ring-[#A8721F]/40 focus-visible:outline-none disabled:opacity-40"
              >
                <ArrowLeft className="h-4 w-4" />
                Previous Step
              </button>

              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void handleSaveStep(false)}
                  className="inline-flex items-center gap-2 rounded-xl border border-[#B07A2A] bg-white px-4 py-2.5 text-xs font-semibold text-[#A8721F] transition hover:bg-[#FBF3EC] focus-visible:ring-2 focus-visible:ring-[#A8721F]/40 focus-visible:outline-none disabled:opacity-50"
                >
                  <Bookmark className="h-4 w-4" />
                  {saving ? "Saving..." : "Save for Later"}
                </button>

                {currentStep < 5 ? (
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => void handleNext()}
                    className="inline-flex items-center gap-2 rounded-xl bg-[#B07A2A] px-5 py-2.5 text-xs font-bold text-white transition hover:bg-[#A8721F] focus-visible:ring-2 focus-visible:ring-[#A8721F]/40 focus-visible:ring-offset-2 focus-visible:outline-none disabled:opacity-50"
                  >
                    Save &amp; Continue
                    <ArrowRight className="h-4 w-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={saving || photos.length < 2}
                    onClick={() => void handleComplete()}
                    className="inline-flex items-center gap-2 rounded-xl bg-[#B07A2A] px-5 py-2.5 text-xs font-bold text-white transition hover:bg-[#A8721F] focus-visible:ring-2 focus-visible:ring-[#A8721F]/40 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Play className="h-4 w-4" />
                    Complete My Profile
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
  );
}
