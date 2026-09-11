"use client";

import { useState } from "react";
import { MessageSquareQuote, Pencil, Star, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Textarea } from "@/components/ui/input";
import { Select } from "@/components/ui/controls";
import { patchJson } from "@/lib/client/api";
import { useToast } from "@/components/ui/toast";

export function EndorsementEditor({
  listingId,
  initialReview,
  initialRating,
  onSaved,
}: {
  listingId: string;
  initialReview: string | null;
  initialRating: number | null;
  onSaved: (review: string | null, rating: number | null) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [review, setReview] = useState(initialReview ?? "");
  const [rating, setRating] = useState(initialRating ? String(initialRating) : "");
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  function cancel() {
    setReview(initialReview ?? "");
    setRating(initialRating ? String(initialRating) : "");
    setEditing(false);
  }

  async function save() {
    const nextReview = review.trim() || null;
    const nextRating = rating ? Number(rating) : null;
    setSaving(true);
    const response = await patchJson(`/api/creator/products/${listingId}`, {
      review: nextReview,
      rating: nextRating,
    });
    setSaving(false);
    if (!response.ok) {
      toast.error("Couldn't save your quote", response.message);
      return;
    }
    onSaved(nextReview, nextRating);
    setEditing(false);
    toast.success("Recommendation updated", "It is now visible on your product page.");
  }

  if (editing) {
    return (
      <div className="mt-3 rounded-sm border border-brand-pink/25 bg-brand-pink/[0.04] p-4">
        <div className="grid gap-3 sm:grid-cols-[1fr_11rem]">
          <Field
            label="Your comment or quote"
            hint="Tell shoppers why you recommend this product."
          >
            <Textarea
              value={review}
              onChange={(event) => setReview(event.target.value)}
              maxLength={1000}
              rows={3}
              placeholder="What do you like about this product?"
            />
          </Field>
          <Field label="Your rating">
            <Select value={rating} onChange={(event) => setRating(event.target.value)}>
              <option value="">No rating</option>
              {[1, 2, 3, 4, 5].map((value) => (
                <option key={value} value={value}>
                  {value} star{value === 1 ? "" : "s"}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <div className="mt-3 flex flex-wrap justify-end gap-2">
          <Button type="button" size="sm" variant="ghost" onClick={cancel} disabled={saving}>
            <X size={14} /> Cancel
          </Button>
          <Button type="button" size="sm" onClick={save} loading={saving}>
            Save recommendation
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-3 flex flex-wrap items-start justify-between gap-3 rounded-sm border border-border bg-surface-2 p-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-text-faint">
          <MessageSquareQuote size={14} /> Your recommendation
        </div>
        {initialReview ? (
          <p className="mt-1.5 text-sm text-text-muted">“{initialReview}”</p>
        ) : (
          <p className="mt-1.5 text-sm text-text-faint">No comment or quote added yet.</p>
        )}
        {initialRating && (
          <span className="mt-1 inline-flex items-center gap-1 text-xs text-accent-gold">
            <Star size={12} fill="currentColor" /> {initialRating}/5
          </span>
        )}
      </div>
      <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(true)}>
        <Pencil size={14} /> {initialReview || initialRating ? "Edit" : "Add quote"}
      </Button>
    </div>
  );
}
