"use client";

import { useActionState, useState } from "react";
import { Star } from "lucide-react";
import { submitReview, type ReviewState } from "@/app/product/[slug]/review-actions";

export function ReviewForm({ productId, slug, existing }: { productId: string; slug: string; existing?: { rating: number; body: string; isApproved: boolean } }) {
  const [state, action, pending] = useActionState<ReviewState, FormData>(submitReview.bind(null, productId, slug), undefined);
  const [rating, setRating] = useState(existing?.rating ?? 0);

  if (state?.ok)
    return <p role="status" className="rounded-xl border border-[#09492e]/20 bg-[#09492e]/5 p-4 text-sm text-[#09492e]">Thank you! Your review will appear once our team approves it.</p>;

  return (
    <form action={action} className="space-y-3 rounded-2xl border border-[#c6a253]/40 bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-[#09492e]">{existing ? "Update your review" : "Write a review"}{existing && !existing.isApproved && <span className="ml-2 normal-case text-[#7a5c14]">(awaiting approval)</span>}</p>
      <div className="flex gap-1" role="radiogroup" aria-label="Rating">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" role="radio" aria-checked={rating === n} aria-label={`${n} star${n > 1 ? "s" : ""}`} onClick={() => setRating(n)} className="cursor-pointer p-1">
            <Star className="h-6 w-6 text-[#c6a253]" fill={n <= rating ? "#c6a253" : "none"} />
          </button>
        ))}
      </div>
      <input type="hidden" name="rating" value={rating} />
      <textarea name="body" rows={3} maxLength={1000} defaultValue={existing?.body} placeholder="How was the weave, drape and finish?" className="w-full rounded-xl border border-[#09492e]/20 px-3.5 py-2.5 text-base sm:text-sm outline-none focus:border-[#09492e]" />
      {state?.error && <p role="alert" className="text-xs text-[#b81d56]">{state.error}</p>}
      <button disabled={pending || rating === 0} className="rounded-full bg-[#09492e] px-5 py-2.5 text-sm font-semibold text-[#fbf8f3] disabled:opacity-50 cursor-pointer">{pending ? "Submitting…" : "Submit review"}</button>
    </form>
  );
}
