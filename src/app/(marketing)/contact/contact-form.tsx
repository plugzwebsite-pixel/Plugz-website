"use client";

import { useState } from "react";
import { User, Mail, Send } from "lucide-react";
import { Field, Input, Textarea } from "@/components/ui/input";
import { Select } from "@/components/ui/controls";
import { Button } from "@/components/ui/button";

const CONTACT_EMAIL = "hello@pluggzofficial.co.uk";

const topics = [
  "I'm a shopper",
  "I'm a creator",
  "I'm a brand",
  "Press",
  "Something else",
];

/**
 * Honest contact form: there is no inbox API to post to, so the message is
 * composed into the visitor's own email client and sent from their address.
 * Nothing is stored on our servers, and nothing is promised that isn't true.
 */
export function ContactForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [topic, setTopic] = useState(topics[0]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !message.trim()) {
      setError("Please fill in your name, email and message.");
      return;
    }
    setError(null);
    const subject = `[Pluggz contact] ${topic}: ${name.trim()}`;
    const body = `${message.trim()}\n\nFrom: ${name.trim()} <${email.trim()}>`;
    window.location.href = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(
      subject
    )}&body=${encodeURIComponent(body)}`;
  }

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-5 rounded-lg border border-border bg-surface p-6 sm:p-8"
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Your name" htmlFor="contact-name" required>
          <Input
            id="contact-name"
            placeholder="Amina Khan"
            leftIcon={<User size={16} />}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </Field>
        <Field label="Your email" htmlFor="contact-email" required>
          <Input
            id="contact-email"
            type="email"
            placeholder="amina@example.co.uk"
            leftIcon={<Mail size={16} />}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Field>
      </div>

      <Field label="What's it about?" htmlFor="contact-topic">
        <Select
          id="contact-topic"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
        >
          {topics.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </Select>
      </Field>

      <Field label="Your message" htmlFor="contact-message" required>
        <Textarea
          id="contact-message"
          rows={5}
          placeholder="How can we help?"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
      </Field>

      {error && (
        <p role="alert" className="text-sm text-brand-pink">
          {error}
        </p>
      )}

      <Button type="submit" size="lg" className="w-full sm:w-auto">
        <Send size={16} /> Open in my email app
      </Button>
      <p className="text-xs text-text-faint">
        This opens your email app with the message ready to send from your
        address. Nothing is stored on our servers.
      </p>
    </form>
  );
}
