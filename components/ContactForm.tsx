"use client";

import React, { useState } from "react";

export const DEFAULT_CONTACT_CONTENT = {
  title: "Contact us",
  intro:
    "We’re here to answer your questions, hear your feedback, and help you with anything you need.",
  formTitle: "Get In Touch",
  success:
    "We’re here to answer your questions, hear your feedback, and help you with anything you need.",
  name: "Name *",
  email: "Email Address *",
  subject: "Subject *",
  message: "Message *",
  send: "Send Message",
  sending: "Send Message",
  reset: "Reset",
};

interface ContactContent {
  title?: string;
  intro?: string;
  formTitle?: string;
  success?: string;
  name?: string;
  email?: string;
  subject?: string;
  message?: string;
  send?: string;
  sending?: string;
  reset?: string;
}

export function ContactForm({
  content = DEFAULT_CONTACT_CONTENT,
}: {
  content?: ContactContent;
}) {
  const text = { ...DEFAULT_CONTACT_CONTENT, ...content };
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    const response = await fetch("/api/v1/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        email,
        category: "general_feedback",
        subject,
        message,
        pageUrl: "/contact",
      }),
    });
    setLoading(false);
    if (response.ok) {
      setSent(true);
      setName("");
      setEmail("");
      setSubject("");
      setMessage("");
    }
  }

  function handleReset() {
    setName("");
    setEmail("");
    setSubject("");
    setMessage("");
    setSent(false);
  }

  return (
    <section className="public-content-section">
      <div className="public-container-md">
        <div className="public-page-heading">
          <h1 className="public-text-primary">{text.title}</h1>
          <p>{text.intro}</p>
        </div>
        <div className="public-content-card">
          <h3 style={{ marginBottom: 24 }}>{text.formTitle}</h3>
          {sent && (
            <div className="public-alert" role="status">
              {text.success}
            </div>
          )}
          <form className="public-form-grid" onSubmit={handleSubmit}>
            <div className="public-field">
              <label htmlFor="contact-name">{text.name}</label>
              <input
                id="contact-name"
                type="text"
                required
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </div>
            <div className="public-field">
              <label htmlFor="contact-email">{text.email}</label>
              <input
                id="contact-email"
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>
            <div className="public-field">
              <label htmlFor="contact-subject">{text.subject}</label>
              <input
                id="contact-subject"
                type="text"
                required
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
              />
            </div>
            <div className="public-field public-field-full">
              <label htmlFor="contact-message">{text.message}</label>
              <textarea
                id="contact-message"
                required
                value={message}
                onChange={(event) => setMessage(event.target.value)}
              />
            </div>
            <div
              className="public-field-full"
              style={{ display: "flex", gap: 12, justifyContent: "center" }}
            >
              <button
                type="submit"
                className="public-btn public-btn-theme"
                disabled={loading}
              >
                {loading ? text.sending : text.send}
              </button>
              <button
                type="button"
                className="public-btn public-btn-secondary"
                onClick={handleReset}
              >
                {text.reset}
              </button>
            </div>
          </form>
        </div>
      </div>
    </section>
  );
}
