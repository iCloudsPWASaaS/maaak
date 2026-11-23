"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  CircleHelp,
  Crown,
  Flag,
  Handshake,
  Headset,
  Heart,
  Hourglass,
  Lock,
  MapPin,
  MessageCircle,
  Phone,
  Send,
  ShieldAlert,
  ShieldCheck,
  Star,
  Users,
  X,
} from "lucide-react";

type TabKey = "behaviour" | "safety" | "account" | "faqs";

type SupportCategory =
  | "general_feedback"
  | "technical_problem"
  | "complaint"
  | "suggestion";

type FaqItem = { question: string; answer: string };

const SERIF = { fontFamily: 'Georgia, "Times New Roman", serif' } as const;

const GOLD_PATTERN = {
  backgroundImage:
    "radial-gradient(circle at 1px 1px, rgba(167, 124, 60, 0.38) 1px, transparent 0)",
  backgroundSize: "18px 18px",
  WebkitMaskImage: "radial-gradient(circle at 70% 30%, black, transparent 72%)",
  maskImage: "radial-gradient(circle at 70% 30%, black, transparent 72%)",
} as const;

const CARD_CLASS =
  "rounded-xl border border-[#E8DFD0] bg-white shadow-[0_2px_12px_rgba(64,45,22,0.05)]";

const TABS = [
  { key: "behaviour", label: "Behaviour & Guidelines", icon: Users },
  { key: "safety", label: "Safety & Privacy", icon: Lock },
  { key: "account", label: "Account & Membership", icon: Crown },
  { key: "faqs", label: "FAQs", icon: CircleHelp },
] as const;

const QUICK_ACTIONS = [
  {
    title: "Contact Support",
    description: "Get in touch with our team for help.",
    icon: MessageCircle,
    tab: null,
    target: "contact-support",
  },
  {
    title: "Browse FAQs",
    description: "Find quick answers to common questions.",
    icon: BookOpen,
    tab: "faqs" as TabKey,
    target: "faq-panel",
  },
  {
    title: "Safety Resources",
    description: "Tips and tools to help you stay safe.",
    icon: ShieldCheck,
    tab: "safety" as TabKey,
    target: "safety-resources",
  },
];

const GUIDELINES = [
  {
    icon: Handshake,
    title: "Respect Others' Boundaries",
    description:
      "Honor personal boundaries and space. If someone isn't interested or stops responding, please respect their decision.",
  },
  {
    icon: BadgeCheck,
    title: "Be Honest and Authentic",
    description:
      "Use recent and accurate photos of yourself. Be honest about your intentions, whether you're seeking a serious relationship, friendship or something casual.",
  },
  {
    icon: MessageCircle,
    title: "Communicate Clearly and Respectfully",
    description:
      "Keep conversations polite, thoughtful and respectful. Use appropriate language and avoid offensive, discriminatory or derogatory remarks.",
  },
  {
    icon: Lock,
    title: "Maintain Privacy and Security",
    description:
      "Do not share personal information like your home address, financial details or sensitive data too early. Be mindful when connecting on social media.",
  },
  {
    icon: Users,
    title: "Consent is Key",
    description:
      "Ensure all interactions, including conversations, photos and in-person meetings, are consensual. Respect the other person's right to say no or change their mind at any time.",
  },
  {
    icon: Hourglass,
    title: "Be Patient and Polite",
    description:
      "Avoid spamming or sending multiple messages if someone doesn't respond right away. Be understanding, as people have different schedules and commitments.",
  },
  {
    icon: Flag,
    title: "Report Suspicious Behaviour",
    description:
      "If you encounter fake profiles, scams or behaviour that goes against our guidelines, please report it to our support team.",
  },
  {
    icon: MapPin,
    title: "Plan Safe Meetups",
    description:
      "When meeting someone in person for the first time, choose a public place and let a trusted friend or family member know your plans.",
  },
  {
    icon: Heart,
    title: "Be Kind and Courteous",
    description:
      "Treat others with kindness and respect. Refrain from making judgments or assumptions based on superficial details.",
  },
  {
    icon: Star,
    title: "Follow Ma'aak's Rules",
    description:
      "These guidelines help keep Ma'aak a safe, respectful and positive space for everyone. Repeated or serious breaches may result in account action, including removal.",
  },
];

const SAFETY_CARDS = [
  {
    title: "Protect your information",
    icon: Lock,
    items: [
      "Never share passwords, PINs or financial details. Ma'aak will never ask for your username or password by email.",
      "Watch for unsafe links, urgent money requests and sob stories. Keep conversations inside the app until you feel comfortable.",
      "If anyone asks for financial information, report them immediately.",
    ],
  },
  {
    title: "Meet with confidence",
    icon: Users,
    items: [
      "Do not rush. Get to know someone through chat and calls first, and be clear about your boundaries.",
      "Never meet at a private or secluded location, including either of your homes. Choose a populated public place.",
      "Share your plans with someone you trust, keep your phone with you and control how you travel. If you feel unsafe, end the meeting at once.",
    ],
  },
  {
    title: "Your privacy and account controls",
    icon: ShieldCheck,
    items: [
      "Details such as your surname, date of birth, full postcode and ID verification data are not shown on your profile.",
      "Photos use signed links and watermarks, and published profiles display at least two clear photographs.",
      "You can pause or delete your account and manage blocked members at any time in Safety & Settings.",
    ],
  },
];

const SAFETY_RESOURCES = [
  {
    title: "Immediate danger",
    detail:
      "Call 999 if you or someone else is in danger. For urgent help that is not life-threatening, call NHS 111.",
    icon: Phone,
  },
  {
    title: "Samaritans",
    detail: "Call 116 123, day or night, for free and confidential support.",
    icon: Heart,
  },
  {
    title: "Muslim Youth Helpline",
    detail:
      "Call 0808 808 2008 for culturally sensitive support, 4pm–10pm, 365 days a year.",
    icon: MessageCircle,
  },
  {
    title: "Mind",
    detail: "Call 0330 123 3393 for advice and information about mental health.",
    icon: ShieldCheck,
  },
  {
    title: "Women's Aid",
    detail:
      "Support and safe spaces for women and children affected by domestic abuse at womensaid.org.uk.",
    icon: ShieldAlert,
  },
];

const ACCOUNT_FAQS: FaqItem[] = [
  {
    question: "How does the first month free Premium offer work?",
    answer:
      "When you register and select Premium Membership, your first 30 days are free with nothing charged today. Billing of £24.99 per month begins after the trial ends, and you can cancel at any time before your trial end date.",
  },
  {
    question: "What can I do on the Free plan?",
    answer:
      "Free members can complete their profile, browse mutually eligible matches and send up to 10 introduction requests in total. Premium unlocks unlimited requests, messaging and voice or video calling.",
  },
  {
    question: "Why can I only have 3 active chats at a time?",
    answer:
      "Ma'aak is built for sincere, focused courtship. Limiting active conversations to three encourages meaningful dialogue. Closing an ended conversation frees a slot immediately.",
  },
  {
    question: "Can I hide or blur my profile photos?",
    answer:
      "No. To keep the community transparent and trustworthy, every published profile shows at least two clear photographs. We protect photos with signed URLs, copy restrictions and dynamic watermarks.",
  },
  {
    question: "How are dealbreakers different from preferences?",
    answer:
      "Preferences shape your compatibility score, while dealbreakers are strict eligibility filters. A member who does not meet a dealbreaker, or has not answered it, is excluded from your recommendations.",
  },
  {
    question: "How do I verify my ID?",
    answer:
      "Open Verification from the sidebar to start the check. Verification helps keep the community genuine, and your ID documents are processed securely rather than displayed on your profile.",
  },
  {
    question: "How do I pause, deactivate or delete my account?",
    answer:
      "Go to Safety & Settings in the sidebar. There you can pause your profile, deactivate your account or request permanent deletion.",
  },
];

const GENERAL_FAQS: FaqItem[] = [
  {
    question: "How do I contact support?",
    answer:
      "Use the Contact Support form below, or email info@maaak.co.uk. Our moderation and member care team aims to reply within 24 hours, Monday to Friday, 9:00 AM to 6:00 PM GMT.",
  },
  {
    question: "How do I report a member or a safety concern?",
    answer:
      "To report a specific member, open their profile and choose Report Profile so our moderators can review it directly. For a general concern, use the Report a Safety Concern option on this page.",
  },
  {
    question: "What should I do if someone asks me for money?",
    answer:
      "Do not send money or share financial details. Keep the messages as evidence, block the member and report them straight away. Ma'aak will never ask you for money or your password by email.",
  },
  {
    question: "How do I block or unblock someone?",
    answer:
      "You can block a member from their profile, and review or remove blocked members under Safety & Settings.",
  },
  {
    question: "Why do I need to verify my ID?",
    answer:
      "Verification helps us keep Ma'aak a genuine, safe community. Verification information is handled privately and is not displayed to other members.",
  },
  {
    question: "Are my messages and photos private?",
    answer:
      "Chat and calls take place in the app, photos use protected links and watermarks, and sensitive personal details are kept off your profile. Never share your login details with anyone.",
  },
];

const APP_GUIDE = [
  {
    title: "Build your profile",
    detail: "Add recent photos and be honest about your values, family and relationship goals.",
    href: "/profile/wizard",
    label: "My Profile",
  },
  {
    title: "Discover matches",
    detail: "Browse compatible members and fine-tune your preferences and dealbreakers.",
    href: "/explore",
    label: "Discover",
  },
  {
    title: "Connect with care",
    detail: "Send introductions, chat in-app and use voice or video calls before meeting.",
    href: "/messages",
    label: "Messages",
  },
  {
    title: "Stay safe",
    detail: "Verify your ID, read the guidance here and manage your privacy settings.",
    href: "/verification",
    label: "Verification",
  },
];

function FaqList({ items }: { items: FaqItem[] }) {
  return (
    <div className="space-y-2.5">
      {items.map((item) => (
        <details
          key={item.question}
          className={`group ${CARD_CLASS}`}
        >
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-3.5 text-sm font-semibold text-[#231C16] [&::-webkit-details-marker]:hidden">
            <span>{item.question}</span>
            <ChevronDown className="h-4 w-4 shrink-0 text-[#9C743C] transition group-open:rotate-180" />
          </summary>
          <p className="border-t border-[#E8DFD0] px-4 py-3.5 text-xs leading-6 text-[#6B6155]">
            {item.answer}
          </p>
        </details>
      ))}
    </div>
  );
}

export default function HelpSupportPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("behaviour");
  const [reportOpen, setReportOpen] = useState(false);
  const [concernType, setConcernType] = useState("Fake or misleading profile");
  const [concernMember, setConcernMember] = useState("");
  const [concernDetails, setConcernDetails] = useState("");
  const [concernEmail, setConcernEmail] = useState("");
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactCategory, setContactCategory] =
    useState<SupportCategory>("general_feedback");
  const [contactSubject, setContactSubject] = useState("");
  const [contactMessage, setContactMessage] = useState("");
  const [contactLoading, setContactLoading] = useState(false);
  const [contactError, setContactError] = useState<string | null>(null);
  const [contactSent, setContactSent] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  function showToast(message: string) {
    setToast(message);
    setTimeout(() => setToast(null), 4000);
  }

  function openQuickAction(tab: TabKey | null, target: string) {
    if (tab) setActiveTab(tab);
    setTimeout(() => {
      document
        .getElementById(target)
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);
  }

  async function handleContactSubmit(event: React.FormEvent) {
    event.preventDefault();
    setContactLoading(true);
    setContactError(null);
    try {
      const res = await fetch("/api/v1/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: contactName || undefined,
          email: contactEmail || undefined,
          category: contactCategory,
          subject: contactSubject || undefined,
          message: contactMessage,
          pageUrl: "/help-support",
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setContactError(json.message || "Unable to send your request.");
      } else {
        setContactSent(true);
        setContactSubject("");
        setContactMessage("");
      }
    } catch {
      setContactError("Network error while sending your request.");
    } finally {
      setContactLoading(false);
    }
  }

  async function handleReportSubmit(event: React.FormEvent) {
    event.preventDefault();
    setReportLoading(true);
    setReportError(null);
    try {
      const res = await fetch("/api/v1/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: concernEmail || contactEmail || undefined,
          category: "complaint",
          subject: `Safety concern: ${concernType}`,
          message: `Concern: ${concernType}\nMember or profile (if known): ${concernMember || "Not specified"}\n\n${concernDetails}`,
          pageUrl: "/help-support",
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setReportError(json.message || "Unable to send your safety concern.");
      } else {
        setReportOpen(false);
        setConcernMember("");
        setConcernDetails("");
        showToast("Your safety concern has been sent to our team.");
      }
    } catch {
      setReportError("Network error while sending your safety concern.");
    } finally {
      setReportLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-[1100px] space-y-8 px-1 py-2">
      {toast && (
        <div
          role="status"
          className="fixed right-6 bottom-20 z-50 rounded-full border border-[#C59B5F] bg-[#14110E] px-5 py-3 text-xs font-semibold text-[#DFBE8A] shadow-xl"
        >
          {toast}
        </div>
      )}

      <header className="relative isolate overflow-hidden rounded-xl bg-gradient-to-br from-[#FBF7F2] via-[#FBF7F2] to-[#F5EBDD] px-1 py-4 sm:px-3">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-12 right-0 h-52 w-72 opacity-70"
          style={GOLD_PATTERN}
        />
        <div className="relative flex items-start gap-4">
          <Headset
            className="mt-1 h-10 w-10 shrink-0 text-[#9C743C]"
            strokeWidth={1.5}
          />
          <div>
            <h1
              style={SERIF}
              className="text-3xl font-bold text-[#231C16] sm:text-4xl"
            >
              Help &amp; Support
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-[#6B6155]">
              Get answers, stay safe and understand how to make the most of
              Ma&apos;aak.
            </p>
          </div>
        </div>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        {QUICK_ACTIONS.map((action) => {
          const Icon = action.icon;
          return (
            <button
              key={action.title}
              type="button"
              onClick={() => openQuickAction(action.tab, action.target)}
              className="group flex h-full flex-col rounded-xl border border-[#E8DFD0] bg-white p-5 text-left shadow-[0_2px_12px_rgba(64,45,22,0.05)] transition hover:border-[#C59B5F] hover:shadow-md"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#F5EEE2] text-[#9C743C]">
                <Icon className="h-5 w-5" strokeWidth={1.7} />
              </div>
              <h2 className="mt-4 text-sm font-bold text-[#231C16]">
                {action.title}
              </h2>
              <p className="mt-1.5 text-xs leading-6 text-[#6B6155]">
                {action.description}
              </p>
              <ArrowRight className="mt-5 self-end h-4 w-4 text-[#9C743C] transition group-hover:translate-x-1" />
            </button>
          );
        })}
      </div>

      <div
        id="help-tabs"
        className="flex w-full flex-wrap gap-1 rounded-full border border-[#E8DFD0] bg-white/70 p-1.5 shadow-[0_2px_12px_rgba(64,45,22,0.04)] scroll-mt-24 sm:inline-flex sm:w-auto sm:flex-nowrap"
      >
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              aria-pressed={active}
              onClick={() => setActiveTab(tab.key)}
              className={`inline-flex flex-1 items-center justify-center gap-2 rounded-full px-4 py-2.5 text-xs font-semibold transition sm:flex-none ${
                active
                  ? "bg-[#9C743C] text-white shadow-sm"
                  : "text-[#3B3128] hover:bg-[#F5EEE2]"
              }`}
            >
              <Icon className="h-4 w-4" strokeWidth={1.7} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {activeTab === "behaviour" && (
        <section id="behaviour-panel" className="space-y-5 scroll-mt-24">
          <div>
            <h2
              style={SERIF}
              className="text-2xl font-bold text-[#231C16] sm:text-3xl"
            >
              Ma&apos;aak&apos;s Behaviour &amp; Community Guidelines
            </h2>
            <p className="mt-2 text-sm leading-7 text-[#6B6155]">
              A respectful and values-based community helps everyone have a
              positive and meaningful experience.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {GUIDELINES.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.title}
                  className={`flex items-start gap-4 p-4 sm:p-5 ${CARD_CLASS}`}
                >
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#F5EEE2] text-[#9C743C]">
                    <Icon className="h-5 w-5" strokeWidth={1.6} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-[#231C16]">
                      {item.title}
                    </h3>
                    <p className="mt-1 text-xs leading-6 text-[#6B6155]">
                      {item.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {activeTab === "safety" && (
        <section id="safety-panel" className="space-y-5 scroll-mt-24">
          <div>
            <h2
              style={SERIF}
              className="text-2xl font-bold text-[#231C16] sm:text-3xl"
            >
              Safety &amp; Privacy
            </h2>
            <p className="mt-2 text-sm leading-7 text-[#6B6155]">
              A few practical habits protect your information and keep every
              introduction safe. Trust your instincts and never feel obliged
              to continue an interaction.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {SAFETY_CARDS.map((card) => {
              const Icon = card.icon;
              return (
                <div key={card.title} className={`p-5 ${CARD_CLASS}`}>
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#F5EEE2] text-[#9C743C]">
                    <Icon className="h-5 w-5" strokeWidth={1.6} />
                  </div>
                  <h3 className="mt-4 text-sm font-bold text-[#231C16]">
                    {card.title}
                  </h3>
                  <ul className="mt-3 space-y-2.5 pl-4 text-xs leading-6 text-[#6B6155] [&>li]:list-disc">
                    {card.items.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
          <Link
            href="/settings"
            className="inline-flex items-center gap-2 text-xs font-semibold text-[#9C743C] hover:underline"
          >
            Manage blocked users and privacy settings
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>

          <div
            id="safety-resources"
            className={`mt-6 space-y-4 p-5 scroll-mt-24 ${CARD_CLASS}`}
          >
            <div className="flex items-center gap-2">
              <Phone className="h-5 w-5 text-[#9C743C]" strokeWidth={1.7} />
              <h3
                style={SERIF}
                className="text-xl font-bold text-[#231C16]"
              >
                Safety Resources
              </h3>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {SAFETY_RESOURCES.map((resource) => {
                const Icon = resource.icon;
                return (
                  <div
                    key={resource.title}
                    className="rounded-xl border border-[#E8DFD0] bg-[#FBF7F2] p-4"
                  >
                    <div className="flex items-center gap-2">
                      <Icon
                        className="h-4 w-4 text-[#9C743C]"
                        strokeWidth={1.7}
                      />
                      <h4 className="text-xs font-bold text-[#231C16]">
                        {resource.title}
                      </h4>
                    </div>
                    <p className="mt-2 text-xs leading-6 text-[#6B6155]">
                      {resource.detail}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {activeTab === "account" && (
        <section id="account-panel" className="space-y-5 scroll-mt-24">
          <div>
            <h2
              style={SERIF}
              className="text-2xl font-bold text-[#231C16] sm:text-3xl"
            >
              Account &amp; Membership
            </h2>
            <p className="mt-2 text-sm leading-7 text-[#6B6155]">
              Answers about plans, chats, photos and controlling your account.
            </p>
          </div>
          <FaqList items={ACCOUNT_FAQS} />
          <div className="space-y-4 pt-2">
            <h3 style={SERIF} className="text-xl font-bold text-[#231C16]">
              App Guide
            </h3>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {APP_GUIDE.map((step, index) => (
                <div key={step.title} className={`p-5 ${CARD_CLASS}`}>
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#14110E] text-xs font-bold text-[#DFBE8A]">
                    {index + 1}
                  </div>
                  <h4 className="mt-4 text-sm font-bold text-[#231C16]">
                    {step.title}
                  </h4>
                  <p className="mt-2 text-xs leading-6 text-[#6B6155]">
                    {step.detail}
                  </p>
                  <Link
                    href={step.href}
                    className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-[#9C743C] hover:underline"
                  >
                    {step.label}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {activeTab === "faqs" && (
        <section id="faq-panel" className="space-y-5 scroll-mt-24">
          <div>
            <h2
              style={SERIF}
              className="text-2xl font-bold text-[#231C16] sm:text-3xl"
            >
              FAQs
            </h2>
            <p className="mt-2 text-sm leading-7 text-[#6B6155]">
              Common questions about getting help, staying safe and keeping
              your details private.
            </p>
          </div>
          <FaqList items={GENERAL_FAQS} />
        </section>
      )}

      <div className="flex flex-col gap-4 rounded-xl border border-[#EBCFD3] bg-[#FDF3F4] p-5 sm:flex-row sm:items-center sm:p-6">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#F7E3E6] text-[#8B2333]">
          <ShieldAlert className="h-6 w-6" strokeWidth={1.7} />
        </div>
        <div className="min-w-0 flex-1">
          <h2
            style={SERIF}
            className="text-lg font-bold text-[#5F1420]"
          >
            Report a Safety Concern
          </h2>
          <p className="mt-1 text-xs leading-6 text-[#6B4A50]">
            Report harassment, inappropriate behaviour, scams or any safety
            concerns. Reports are confidential and reviewed by our team.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setReportError(null);
            setReportOpen(true);
          }}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-[#8B2333] px-6 py-2.5 text-xs font-bold text-white transition hover:bg-[#701A28]"
        >
          Report a Concern
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>

      <section id="contact-support" className="space-y-5 scroll-mt-24">
        <div>
          <h2
            style={SERIF}
            className="text-2xl font-bold text-[#231C16] sm:text-3xl"
          >
            Contact Support
          </h2>
          <p className="mt-2 text-sm leading-7 text-[#6B6155]">
            Describe your issue and our team will review it. You can also email
            info@maaak.co.uk. We aim to respond within 24 hours, Monday to
            Friday, 9:00 AM to 6:00 PM GMT.
          </p>
        </div>
        <div className={`p-6 sm:p-8 ${CARD_CLASS}`}>
          {contactSent ? (
            <div className="py-6 text-center">
              <CheckCircle2 className="mx-auto h-12 w-12 text-[#9C743C]" />
              <h3
                style={SERIF}
                className="mt-3 text-xl font-bold text-[#231C16]"
              >
                JazakAllahu Khayran!
              </h3>
              <p className="mt-2 text-xs leading-6 text-[#6B6155]">
                Your request has been sent to our member care team at
                info@maaak.co.uk.
              </p>
              <button
                type="button"
                onClick={() => setContactSent(false)}
                className="mt-5 rounded-full border border-[#C59B5F] px-6 py-2.5 text-xs font-semibold text-[#231C16] hover:bg-[#FBF7F2]"
              >
                Send another request
              </button>
            </div>
          ) : (
            <form onSubmit={handleContactSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="text-xs font-semibold text-[#231C16]">
                    Your name
                  </span>
                  <input
                    type="text"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    placeholder="Optional"
                    className="mt-1.5 w-full rounded-xl border border-[#E8DFD0] bg-[#FBF7F2] px-4 py-2.5 text-xs"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-semibold text-[#231C16]">
                    Email address
                  </span>
                  <input
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="Optional — we will use your account email"
                    className="mt-1.5 w-full rounded-xl border border-[#E8DFD0] bg-[#FBF7F2] px-4 py-2.5 text-xs"
                  />
                </label>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="text-xs font-semibold text-[#231C16]">
                    What is this about?
                  </span>
                  <select
                    value={contactCategory}
                    onChange={(e) =>
                      setContactCategory(e.target.value as SupportCategory)
                    }
                    className="mt-1.5 w-full rounded-xl border border-[#E8DFD0] bg-[#FBF7F2] px-4 py-2.5 text-xs"
                  >
                    <option value="general_feedback">General question</option>
                    <option value="technical_problem">Technical problem</option>
                    <option value="complaint">Complaint or safety concern</option>
                    <option value="suggestion">Suggestion</option>
                  </select>
                </label>
                <label className="block">
                  <span className="text-xs font-semibold text-[#231C16]">
                    Subject
                  </span>
                  <input
                    type="text"
                    value={contactSubject}
                    onChange={(e) => setContactSubject(e.target.value)}
                    placeholder="Brief summary"
                    className="mt-1.5 w-full rounded-xl border border-[#E8DFD0] bg-[#FBF7F2] px-4 py-2.5 text-xs"
                  />
                </label>
              </div>
              <label className="block">
                <span className="text-xs font-semibold text-[#231C16]">
                  How can we help? *
                </span>
                <textarea
                  required
                  rows={5}
                  value={contactMessage}
                  onChange={(e) => setContactMessage(e.target.value)}
                  placeholder="Describe your issue, including any relevant member name or message details..."
                  className="mt-1.5 w-full rounded-xl border border-[#E8DFD0] bg-[#FBF7F2] px-4 py-2.5 text-xs"
                />
              </label>
              {contactError && (
                <p role="alert" className="text-xs text-rose-700">
                  {contactError}
                </p>
              )}
              <div className="flex flex-wrap items-center gap-4">
                <button
                  type="submit"
                  disabled={contactLoading}
                  className="inline-flex items-center gap-2 rounded-full bg-[#14110E] px-6 py-2.5 text-xs font-semibold text-[#DFBE8A] transition hover:bg-[#332A1E] disabled:opacity-50"
                >
                  <Send className="h-3.5 w-3.5" />
                  {contactLoading ? "Sending..." : "Submit request"}
                </button>
                <span className="text-[11px] text-[#6B6155]">
                  Do not include passwords or financial details.
                </span>
              </div>
            </form>
          )}
        </div>
      </section>

      {reportOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <form
            onSubmit={handleReportSubmit}
            className="w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3
                  style={SERIF}
                  className="text-xl font-bold text-[#231C16]"
                >
                  Report a Safety Concern
                </h3>
                <p className="mt-1 text-xs leading-6 text-[#6B6155]">
                  Your report is reviewed privately by our moderation team.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setReportOpen(false)}
                aria-label="Close report form"
                className="rounded-lg p-1.5 text-[#6B6155] hover:bg-[#F5EEE2]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-5 space-y-4">
              <label className="block">
                <span className="text-xs font-semibold text-[#231C16]">
                  What kind of concern is it? *
                </span>
                <select
                  value={concernType}
                  onChange={(e) => setConcernType(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-[#E8DFD0] bg-[#FBF7F2] px-4 py-2.5 text-xs"
                >
                  <option>Fake or misleading profile</option>
                  <option>Harassment or pressure</option>
                  <option>Impersonation</option>
                  <option>Inappropriate content</option>
                  <option>Suspicious link or money request</option>
                  <option>Other safety concern</option>
                </select>
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-[#231C16]">
                  Member or profile involved
                </span>
                <input
                  type="text"
                  value={concernMember}
                  onChange={(e) => setConcernMember(e.target.value)}
                  placeholder="Optional — username or profile link"
                  className="mt-1.5 w-full rounded-xl border border-[#E8DFD0] bg-[#FBF7F2] px-4 py-2.5 text-xs"
                />
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-[#231C16]">
                  Tell us what happened *
                </span>
                <textarea
                  required
                  rows={4}
                  value={concernDetails}
                  onChange={(e) => setConcernDetails(e.target.value)}
                  placeholder="Include dates, messages or links that might help our team..."
                  className="mt-1.5 w-full rounded-xl border border-[#E8DFD0] bg-[#FBF7F2] px-4 py-2.5 text-xs"
                />
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-[#231C16]">
                  Email address
                </span>
                <input
                  type="email"
                  value={concernEmail}
                  onChange={(e) => setConcernEmail(e.target.value)}
                  placeholder="Optional — we will use your account email"
                  className="mt-1.5 w-full rounded-xl border border-[#E8DFD0] bg-[#FBF7F2] px-4 py-2.5 text-xs"
                />
              </label>
              {reportError && (
                <p
                  role="alert"
                  className="flex items-center gap-2 text-xs text-rose-700"
                >
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  {reportError}
                </p>
              )}
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="submit"
                  disabled={reportLoading}
                  className="inline-flex items-center gap-2 rounded-full bg-[#8B2333] px-6 py-2.5 text-xs font-bold text-white disabled:opacity-50"
                >
                  <Flag className="h-3.5 w-3.5" />
                  {reportLoading ? "Sending..." : "Submit concern"}
                </button>
                <span className="text-[11px] text-[#6B6155]">
                  In immediate danger, call 999.
                </span>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
