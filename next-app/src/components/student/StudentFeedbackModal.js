"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import HugeIcon from "@/components/shared/HugeIcon";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const RATING_LABELS = {
  1: "Poor",
  2: "Fair",
  3: "Satisfactory",
  4: "Very Good",
  5: "Excellent",
};

const SUGGESTED_ASPECTS = [
  "Easy process",
  "Clear requirements",
  "Fast submission",
  "Helpful notifications",
  "Clear document options",
  "Mobile friendly",
];

export default function StudentFeedbackModal({
  open,
  isOpen,
  onClose,
  onOpenChange,
  request,
  initialRating = 0,
  onFeedbackSubmitted,
}) {
  const isModalOpen = open ?? isOpen ?? false;
  const handleClose = () => {
    onClose?.();
    onOpenChange?.(false);
  };

  const [rating, setRating] = useState(initialRating || 0);
  const [hoverRating, setHoverRating] = useState(0);
  const [selectedAspects, setSelectedAspects] = useState([]);
  const [comments, setComments] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Initialize or prefill feedback when request changes
  useEffect(() => {
    if (request?.feedback) {
      setRating(request.feedback.rating || 0);
      setSelectedAspects(Array.isArray(request.feedback.aspect_tags) ? request.feedback.aspect_tags : []);
      setComments(request.feedback.comments || "");
    } else {
      setRating(initialRating || 0);
      setSelectedAspects([]);
      setComments("");
    }
    setHoverRating(0);
  }, [request, initialRating]);

  const toggleAspect = (aspect) => {
    setSelectedAspects((prev) =>
      prev.includes(aspect)
        ? prev.filter((item) => item !== aspect)
        : [...prev, aspect]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!rating) {
      toast.error("Please select a rating from 1 to 5 stars.");
      return;
    }
    if (!request?.id) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/student/document-requests/${request.id}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rating,
          aspectTags: selectedAspects,
          comments: comments.trim(),
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Unable to submit feedback.");
      }

      toast.success("Thank you for your feedback!", {
        description: `Your ${rating}-star rating has been recorded for Request #${request.id}.`,
      });

      if (onFeedbackSubmitted) {
        onFeedbackSubmitted(json.data);
      }
      handleClose();
    } catch (err) {
      toast.error(err.message || "Failed to submit feedback. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const activeRating = hoverRating || rating;
  const sentimentText = activeRating ? RATING_LABELS[activeRating] : "Select your rating";

  return (
    <Dialog open={isModalOpen} onOpenChange={(openState) => !openState && handleClose()}>
      <DialogContent className="overflow-hidden rounded-2xl border border-border bg-white p-0 shadow-2xl sm:max-w-md dark:border-border dark:bg-card gap-0 font-jakarta">
        <DialogHeader className="bg-white p-6 pb-0 dark:bg-card border-none text-left">
          <div className="flex items-start gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <DialogTitle className="text-[16px] font-semibold tracking-[-0.01em] text-gray-900 dark:text-zinc-50">
                  Rate Your Experience
                </DialogTitle>
                {request?.id && (
                  <span className="text-[11px] font-semibold text-pup-maroon bg-red-50 dark:bg-red-950/40 px-2 py-0.5 rounded-full border border-red-100 dark:border-red-900/30">
                    #{request.id}
                  </span>
                )}
              </div>
              <DialogDescription className="mt-1 text-[13px] font-normal text-gray-900 dark:text-zinc-300">
                {request?.doc_type ? `${request.doc_type} · ` : ""}Help the Registrar improve student and alumni digital services.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 p-6">
            {/* Star Rating Section */}
            <div>
              <label className="mb-2 block text-[11px] font-medium uppercase tracking-wider text-gray-900 dark:text-zinc-300">
                Overall Satisfaction <span className="text-red-500">*</span>
              </label>
              <div className="flex flex-col items-center justify-center py-3 bg-gray-50/70 dark:bg-zinc-900/40 rounded-xl border border-border dark:border-border">
                <div
                  className="flex items-center gap-1.5"
                  role="radiogroup"
                  aria-label="Star rating from 1 to 5"
                >
                  {[1, 2, 3, 4, 5].map((star) => {
                    const isFilled = star <= activeRating;
                    return (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRating(star)}
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(0)}
                        className="group relative flex h-10 w-10 items-center justify-center rounded-xl p-1 transition-all active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pup-maroon cursor-pointer"
                        aria-label={`Rate ${star} star${star > 1 ? "s" : ""}: ${RATING_LABELS[star]}`}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          className={cn(
                            "h-6 w-6 transition-colors duration-150",
                            isFilled
                              ? "fill-amber-400 text-amber-400 drop-shadow-xs"
                              : "fill-transparent text-gray-300 dark:text-zinc-600 group-hover:text-amber-300"
                          )}
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                        </svg>
                      </button>
                    );
                  })}
                </div>
                <span
                  className={cn(
                    "mt-2 text-xs font-semibold px-2.5 py-0.5 rounded-full transition-all",
                    activeRating > 0
                      ? "bg-amber-100/70 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                      : "text-gray-400 dark:text-zinc-500"
                  )}
                >
                  {sentimentText}
                </span>
              </div>
            </div>

            {/* Quick Feedback Aspect Chips */}
            <div>
              <label className="mb-2 block text-[11px] font-medium uppercase tracking-wider text-gray-900 dark:text-zinc-300">
                What went well? <span className="text-[11px] font-normal text-gray-400 dark:text-zinc-500">(Optional)</span>
              </label>
              <div className="flex flex-wrap gap-1.5">
                {SUGGESTED_ASPECTS.map((aspect) => {
                  const isSelected = selectedAspects.includes(aspect);
                  return (
                    <button
                      key={aspect}
                      type="button"
                      onClick={() => toggleAspect(aspect)}
                      className={cn(
                        "rounded-lg px-2.5 py-1 text-xs font-medium border transition-all active:scale-95 cursor-pointer",
                        isSelected
                          ? "bg-red-50 text-pup-maroon border-red-200 dark:bg-red-950/50 dark:border-red-900/60 dark:text-red-300 shadow-xs"
                          : "bg-gray-50 text-gray-600 border-border hover:bg-gray-100 hover:text-gray-900 dark:bg-zinc-800/80 dark:border-border dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                      )}
                    >
                      {aspect}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Suggestions / Comments Textarea */}
            <div>
              <label htmlFor="student-feedback-comments" className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-gray-900 dark:text-zinc-300">
                Comments or Suggestions <span className="text-[11px] font-normal text-gray-400 dark:text-zinc-500">(Optional)</span>
              </label>
              <textarea
                id="student-feedback-comments"
                rows={3}
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                placeholder="Share any thoughts or suggestions for the Registrar Office..."
                className="w-full rounded-xl border border-border dark:border-border bg-white dark:bg-zinc-800 p-3 text-xs text-gray-900 dark:text-zinc-100 placeholder:text-gray-400 dark:placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-pup-maroon shadow-xs resize-none transition-all"
              />
            </div>
          </div>

          <DialogFooter className="p-6 pt-0 bg-white dark:bg-card border-none flex items-center justify-end gap-2.5">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={submitting}
              className="h-10 px-4 text-xs font-semibold rounded-xl border border-border dark:border-border bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-xs cursor-pointer active:scale-95 transition-all"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!rating || submitting}
              className="h-10 px-5 text-xs font-semibold rounded-xl! btn-brand-red text-white! shadow-xs cursor-pointer active:scale-95 disabled:opacity-50 transition-all border-0"
              style={{ color: "#ffffff" }}
            >
              {submitting ? (
                <span className="flex items-center gap-2">
                  <HugeIcon className="ph-bold ph-spinner animate-spin text-sm" />
                  Submitting...
                </span>
              ) : request?.feedback ? (
                "Update"
              ) : (
                "Submit"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
