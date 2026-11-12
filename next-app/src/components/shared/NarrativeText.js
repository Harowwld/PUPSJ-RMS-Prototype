"use client";
import { BADGE_BASE } from "@/lib/badgeStyles";


import React, { useMemo } from "react";
import { cn } from "@/lib/utils";
import ProfileAvatar from "@/components/shared/ProfileAvatar";
import {
  parseNarrativeTokens,
  getDeterministicColor,
  resolveUserDisplayName,
} from "@/lib/narrativeParser";

export { parseNarrativeTokens, resolveUserDisplayName };

export function NarrativePersonBadge({ name, avatarId, avatarFilename, onClick }) {
  return (
    <span
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border-0 bg-black/[0.04] px-2.5 py-0.5 align-baseline text-[11px] font-semibold text-gray-900 transition-transform select-text mx-0.5 dark:bg-white/[0.06] dark:text-zinc-100",
        onClick && "cursor-pointer hover:bg-black/[0.08] active:scale-95 dark:hover:bg-white/[0.1]"
      )}
      title={`User: ${name}`}
    >
      <ProfileAvatar
        id={avatarId}
        avatarFilename={avatarFilename}
        name={name}
        initials={(name || "U")[0].toUpperCase()}
        className="size-3.5 shrink-0 rounded-full border-0"
        fallbackClassName={cn("text-[8px] font-bold text-white border-0", getDeterministicColor(name))}
      />
      <span className="max-w-[200px] truncate">{name}</span>
    </span>
  );
}

/**
 * NarrativeText Component
 * Renders rich Apple-style entity tokens for audit descriptions, notification narratives,
 * and activity history.
 *
 * @param {string} text - Raw or formatted audit details
 * @param {"compact" | "full"} [mode="full"] - "compact" for table rows; "full" for cards/sheets
 * @param {string[]} [highlightedPhrases] - Literal phrases to render as emphasized entities
 * @param {function} [onMentionClick] - Callback when a mention/avatar pill is clicked
 * @param {string} [className] - Optional custom CSS classes
 */
export default function NarrativeText({
  text,
  mode = "full",
  highlightedPhrases,
  onMentionClick,
  className,
}) {
  const tokens = useMemo(() => parseNarrativeTokens(text, highlightedPhrases), [text, highlightedPhrases]);

  if (!tokens || tokens.length === 0) {
    return <span className={cn("text-muted-foreground", className)}>No activity description recorded.</span>;
  }

  return (
    <span className={cn("inline leading-relaxed", className)}>
      {tokens.map((token, index) => {
        const key = `token-${index}-${token.type}`;

        switch (token.type) {
          case "mention": {
            const displayName = resolveUserDisplayName(token.value);
            const isRawMention = token.raw?.startsWith("@") && !token.email;

            if (mode === "compact") {
              return (
                <span
                  key={key}
                  onClick={
                    onMentionClick
                      ? (e) => {
                          e.stopPropagation();
                          onMentionClick(displayName);
                        }
                      : undefined
                  }
                  className={cn(
                    "font-semibold text-pup-maroon dark:text-red-400 select-text",
                    onMentionClick && "hover:underline cursor-pointer"
                  )}
                  title={`User: ${displayName}`}
                >
                  {isRawMention ? `@${displayName}` : displayName}
                </span>
              );
            }

            return (
              <NarrativePersonBadge
                key={key}
                name={displayName}
                avatarId={token.email || displayName}
                onClick={onMentionClick ? (event) => {
                  event.stopPropagation();
                  onMentionClick(displayName);
                } : undefined}
              />
            );
          }

          case "record_id": {
            const cleanId = String(token.value || "").replace(/^#/, "");
            if (mode === "compact") {
              return (
                <span
                  key={key}
                  className="font-mono text-[11px] font-semibold text-gray-800 dark:text-zinc-200 tabular-nums select-text"
                >
                  {cleanId}
                </span>
              );
            }
            return (
              <span
                key={key}
                className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-black/[0.04] dark:bg-white/[0.06] text-gray-800 dark:text-zinc-200 tabular-nums select-text mx-0.5 border-0", BADGE_BASE)}
              >
                {cleanId}
              </span>
            );
          }

          case "transition": {
            const isNegative = /declined|cancelled|rejected|failed/i.test(token.to);
            const isPositive = /approved|ready|completed|active|success/i.test(token.to);

            const toColor = isNegative
              ? "text-rose-600 dark:text-rose-400 font-semibold"
              : isPositive
                ? "text-emerald-600 dark:text-emerald-400 font-semibold"
                : "text-sky-600 dark:text-sky-400 font-semibold";

            if (mode === "compact") {
              return (
                <span key={key} className="inline-flex items-center gap-1 font-medium text-gray-600 dark:text-zinc-400">
                  <span className="line-through opacity-70">{token.from}</span>
                  <span className="text-gray-400">→</span>
                  <span className={toColor}>{token.to}</span>
                </span>
              );
            }

            return (
              <span
                key={key}
                className={cn("inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-black/[0.03] dark:bg-white/[0.05] text-[11px] font-medium select-text mx-0.5 border-0", BADGE_BASE)}
              >
                <span className="text-gray-500 dark:text-zinc-400 line-through opacity-75">{token.from}</span>
                <span className="text-gray-400 dark:text-zinc-500 font-bold">→</span>
                <span className={toColor}>{token.to}</span>
              </span>
            );
          }

          case "key_value": {
            return (
              <span key={key} className="inline-flex items-baseline gap-1 select-text mx-0.5">
                <span className="text-gray-400 dark:text-zinc-500 font-medium text-[11px]">{token.key}:</span>
                <span className="font-semibold text-gray-900 dark:text-zinc-100">{token.value}</span>
              </span>
            );
          }

          case "quoted_entity": {
            return (
              <strong key={key} className="select-text font-bold text-gray-950 dark:text-zinc-50">
                {token.value}
              </strong>
            );
          }

          case "ip_address": {
            return (
              <span
                key={key}
                className="font-mono text-[11px] text-gray-500 dark:text-zinc-400 tabular-nums select-text"
              >
                {token.value}
              </span>
            );
          }

          case "text":
          default:
            return <React.Fragment key={key}>{token.value}</React.Fragment>;
        }
      })}
    </span>
  );
}
