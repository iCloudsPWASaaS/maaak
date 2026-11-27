"use client";

import React, { useId, useMemo, useState } from "react";
import { Check, Search, X } from "lucide-react";

export type WizardOption = {
  value: string;
  label: string;
  group?: string;
};

function groupOptions(options: WizardOption[]) {
  const groups = new Map<string, WizardOption[]>();
  const plain: WizardOption[] = [];

  for (const option of options) {
    if (!option.group) {
      plain.push(option);
      continue;
    }
    const current = groups.get(option.group) || [];
    current.push(option);
    groups.set(option.group, current);
  }

  return { plain, groups };
}

export function WizardSection({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[18px] border border-[#E8DFCC] bg-white p-5 shadow-[0_10px_30px_rgba(20,17,14,0.04)] sm:p-6">
      <div className="mb-5 flex items-start gap-3 border-b border-[#F1EADC] pb-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#F5E9D4] text-[#A8721F]">
          <Icon className="h-[18px] w-[18px]" />
        </div>
        <div>
          <h2 className="font-serif text-xl font-semibold text-[#1A1612]">
            {title}
          </h2>
          <p className="mt-0.5 text-xs text-[#776B5C]">{description}</p>
        </div>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">{children}</div>
    </section>
  );
}

export function WizardFieldShell({
  id,
  label,
  hint,
  required,
  counter,
  full,
  children,
}: {
  id?: string;
  label: string;
  hint?: string;
  required?: boolean;
  counter?: string;
  full?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={full ? "sm:col-span-2" : undefined}>
      <div className="mb-2 flex items-start justify-between gap-3">
        <label
          id={id}
          htmlFor={id}
          className="text-[13px] font-semibold text-[#2C251D]"
        >
          {label} {required && <span className="text-[#B07A2A]">*</span>}
        </label>
        {counter && (
          <span className="shrink-0 text-[11px] font-medium text-[#A8721F]">
            {counter}
          </span>
        )}
      </div>
      {hint && <p className="mb-2 text-[11px] text-[#776B5C]">{hint}</p>}
      {children}
    </div>
  );
}

const controlClass =
  "w-full rounded-xl border border-[#E4DAC6] bg-[#FCF9F4] px-3.5 py-2.5 text-sm text-[#1A1612] outline-none transition placeholder:text-[#A99C89] focus:border-[#B07A2A] focus:bg-white focus:ring-2 focus:ring-[#B07A2A]/15";

export function WizardSelect({
  label,
  value,
  options,
  onChange,
  hint,
  required,
  placeholder = "Select an option",
  full,
}: {
  label: string;
  value: string;
  options: WizardOption[];
  onChange: (value: string) => void;
  hint?: string;
  required?: boolean;
  placeholder?: string;
  full?: boolean;
}) {
  const { plain, groups } = groupOptions(options);
  const id = useId();

  return (
    <WizardFieldShell
      id={id}
      label={label}
      hint={hint}
      required={required}
      full={full}
    >
      <select
        id={id}
        aria-required={required}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={controlClass}
      >
        <option value="">{placeholder}</option>
        {plain.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
        {Array.from(groups.entries()).map(([group, items]) => (
          <optgroup key={group} label={group}>
            {items.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
    </WizardFieldShell>
  );
}

export function WizardInput({
  label,
  value,
  onChange,
  placeholder,
  hint,
  required,
  full,
  maxLength,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  hint?: string;
  required?: boolean;
  full?: boolean;
  maxLength?: number;
  type?: string;
}) {
  const id = useId();
  return (
    <WizardFieldShell
      id={id}
      label={label}
      hint={hint}
      required={required}
      full={full}
    >
      <input
        id={id}
        aria-required={required}
        type={type}
        value={value}
        maxLength={maxLength}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className={controlClass}
      />
    </WizardFieldShell>
  );
}

export function WizardTextarea({
  label,
  value,
  onChange,
  placeholder,
  hint,
  required,
  maxLength = 300,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  hint?: string;
  required?: boolean;
  maxLength?: number;
}) {
  const id = useId();
  return (
    <WizardFieldShell
      id={id}
      label={label}
      hint={hint}
      required={required}
      full
      counter={`${value.length} / ${maxLength} characters`}
    >
      <textarea
        id={id}
        aria-required={required}
        rows={4}
        value={value}
        maxLength={maxLength}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className={`${controlClass} resize-none`}
      />
    </WizardFieldShell>
  );
}

export function WizardChips({
  label,
  values,
  options,
  max,
  onChange,
  hint,
  required,
}: {
  label: string;
  values: string[];
  options: WizardOption[];
  max: number;
  onChange: (values: string[]) => void;
  hint?: string;
  required?: boolean;
}) {
  const id = useId();
  function toggle(value: string) {
    if (values.includes(value)) {
      onChange(values.filter((item) => item !== value));
      return;
    }
    if (values.length >= max) return;
    onChange([...values, value]);
  }

  return (
    <WizardFieldShell
      id={id}
      label={label}
      hint={hint}
      required={required}
      full
      counter={`${values.length} / ${max} selected`}
    >
      <div
        role="group"
        aria-labelledby={id}
        className="flex max-h-56 flex-wrap gap-2 overflow-y-auto rounded-xl border border-[#E4DAC6] bg-[#FCF9F4] p-3"
      >
        {options.map((option) => {
          const active = values.includes(option.value);
          const disabled = !active && values.length >= max;
          return (
            <button
              key={option.value}
              type="button"
              disabled={disabled}
              onClick={() => toggle(option.value)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-semibold transition ${
                active
                  ? "border-[#14110E] bg-[#14110E] text-[#A8721F]"
                  : "border-[#E4DAC6] bg-white text-[#4A4136] hover:border-[#B07A2A] disabled:cursor-not-allowed disabled:opacity-40"
              }`}
            >
              {active && <Check className="h-3 w-3" />}
              <span>{option.label}</span>
            </button>
          );
        })}
      </div>
    </WizardFieldShell>
  );
}

export function WizardSearchableChips({
  label,
  values,
  options,
  max,
  onChange,
  hint,
  required,
}: {
  label: string;
  values: string[];
  options: WizardOption[];
  max: number;
  onChange: (values: string[]) => void;
  hint?: string;
  required?: boolean;
}) {
  const id = useId();
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return options.filter(
      (option) =>
        !values.includes(option.value) &&
        (!needle ||
          option.label.toLowerCase().includes(needle) ||
          (option.group || "").toLowerCase().includes(needle)),
    );
  }, [options, query, values]);

  function toggle(value: string) {
    if (values.includes(value)) {
      onChange(values.filter((item) => item !== value));
      return;
    }
    if (values.length >= max) return;
    onChange([...values, value]);
  }

  return (
    <WizardFieldShell
      id={id}
      label={label}
      hint={hint}
      required={required}
      full
      counter={`${values.length} / ${max} selected`}
    >
      <div
        role="group"
        aria-labelledby={id}
        className="rounded-xl border border-[#E4DAC6] bg-[#FCF9F4] p-3"
      >
        <div className="flex min-h-8 flex-wrap gap-2">
          {values.length === 0 && (
            <span className="pt-1 text-[11px] text-[#A99C89]">
              Nothing selected yet
            </span>
          )}
          {values.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => toggle(value)}
              className="inline-flex items-center gap-1.5 rounded-full bg-[#14110E] px-3 py-1 text-[11px] font-semibold text-[#A8721F]"
            >
              <span>{value}</span>
              <X className="h-3 w-3" />
            </button>
          ))}
        </div>
        <div className="relative mt-3">
          <Search className="absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-[#9A8D7B]" />
          <input
            value={query}
            aria-label={`Search ${label}`}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search and select..."
            className="w-full rounded-lg border border-[#E4DAC6] bg-white py-2 pr-3 pl-9 text-xs outline-none focus:border-[#B07A2A]"
          />
        </div>
        <div className="mt-3 flex max-h-44 flex-wrap gap-1.5 overflow-y-auto">
          {filtered.map((option) => (
            <button
              key={option.value}
              type="button"
              disabled={values.length >= max}
              onClick={() => toggle(option.value)}
              className="rounded-full border border-[#E8DFCC] bg-white px-2.5 py-1 text-[11px] text-[#4A4136] transition hover:border-[#B07A2A] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {option.group ? `${option.group}: ${option.label}` : option.label}
            </button>
          ))}
          {filtered.length === 0 && (
            <span className="py-2 text-[11px] text-[#8C7E6C]">
              No more options found.
            </span>
          )}
        </div>
      </div>
    </WizardFieldShell>
  );
}
