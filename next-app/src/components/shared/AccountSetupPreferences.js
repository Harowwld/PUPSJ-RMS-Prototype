"use client";

import { useId, useState } from "react";
import { DiceFaces03Icon, Tick01Icon } from "hugeicons-react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { generateShuffledBeam } from "@/lib/beamAvatars";
import { DEFAULT_AVATARS, DEFAULT_AVATAR_VISIBLE_COUNT } from "@/lib/defaultAvatars";
import { generateShuffledNotionist, NOTIONISTS_AVATARS } from "@/lib/notionistsAvatars";
import { cn } from "@/lib/utils";

export default function AccountSetupPreferences({ authUser, saving, error, onBack, onComplete }) {
  const labelId = useId();
  const [nameFormat, setNameFormat] = useState(authUser?.preferences?.display_name_format || "full_name");
  const initialNotionistMatch = authUser?.avatar_filename?.match(/notionist(\d+)/);
  const initialDefaultMatch = authUser?.avatar_filename?.match(/default(\d+)/);

  const [avatarType, setAvatarType] = useState(() => {
    if (initialDefaultMatch) return "beam";
    return "notionists";
  });

  const [selectedAvatarId, setSelectedAvatarId] = useState(() => {
    if (initialNotionistMatch) return Number(initialNotionistMatch[1]);
    if (initialDefaultMatch) return Number(initialDefaultMatch[1]);
    return 1;
  });

  const [customShuffled, setCustomShuffled] = useState(null);
  const [avatarColorMode, setAvatarColorMode] = useState("bold");
  const [beamColorMode, setBeamColorMode] = useState("classic");
  const [showAllAvatars, setShowAllAvatars] = useState(() => selectedAvatarId > DEFAULT_AVATAR_VISIBLE_COUNT)
  const avatarsExpanded = showAllAvatars
  const visibleAvatars = avatarsExpanded ? DEFAULT_AVATARS : DEFAULT_AVATARS.slice(0, DEFAULT_AVATAR_VISIBLE_COUNT)

  const firstName = authUser?.fname?.trim() || "First";
  const lastName = authUser?.lname?.trim() || "Last";

  function complete(skipAvatar) {
    const avatar = skipAvatar ? null : selectedAvatarId === "custom"
      ? { avatarType: "custom", svgString: customShuffled.svgString }
      : { avatarType, defaultAvatarId: selectedAvatarId };
    onComplete({ avatar, nameFormat });
  }

  return (
    <form onSubmit={(event) => { event.preventDefault(); complete(false); }} className="flex min-h-0 flex-1 flex-col">
      <div className="flex-1 space-y-4 overflow-y-auto p-6">
        <div>
          <h3 className="text-[18px] font-semibold tracking-[-0.01em] text-gray-900 dark:text-zinc-50">
            Preferences
          </h3>
          <p className="mt-1 text-[13px] leading-normal text-gray-900 dark:text-zinc-300">
            Choose your profile avatar and how your name appears.
          </p>
        </div>
        <fieldset disabled={saving} className="min-w-0 space-y-4">
          <legend className="mb-2 text-xs font-medium text-gray-700 dark:text-zinc-300">Profile Avatar</legend>
          {/* Avatar Style Switcher Segmented Control */}
          <div className="flex p-0.5 rounded-xl bg-gray-100 dark:bg-zinc-800 border border-black/[0.04] dark:border-white/5">
            <button
              type="button"
              aria-pressed={avatarType === "notionists"}
              onClick={() => {
                if (avatarType === "notionists") return;
                setAvatarType("notionists");
                setCustomShuffled(null);
                setSelectedAvatarId(1);
              }}
              className={cn(
                "flex-1 py-1.5 px-3 text-xs font-semibold rounded-lg transition-all cursor-pointer text-center",
                avatarType === "notionists"
                  ? "bg-white dark:bg-zinc-700 text-gray-900 dark:text-zinc-50 shadow-xs"
                  : "text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-zinc-200"
              )}
            >
              Notionists ({NOTIONISTS_AVATARS.length})
            </button>
            <button
              type="button"
              aria-pressed={avatarType === "beam"}
              onClick={() => {
                if (avatarType === "beam") return;
                setAvatarType("beam");
                setCustomShuffled(null);
                setSelectedAvatarId(1);
              }}
              className={cn(
                "flex-1 py-1.5 px-3 text-xs font-semibold rounded-lg transition-all cursor-pointer text-center",
                avatarType === "beam"
                  ? "bg-white dark:bg-zinc-700 text-gray-900 dark:text-zinc-50 shadow-xs"
                  : "text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-zinc-200"
              )}
            >
              Beam Gradients ({DEFAULT_AVATARS.length})
            </button>
          </div>

          {/* Live Stage Preview */}
          <div className="flex flex-col items-center justify-center gap-2 py-1">
            <div className="relative w-24 h-24 rounded-full overflow-hidden shadow-inner ring-4 ring-gray-100 dark:ring-zinc-800 flex items-center justify-center bg-gray-50 dark:bg-zinc-800">
              <div className="w-full h-full flex items-center justify-center [&_svg]:size-full">
                {selectedAvatarId === "custom" && customShuffled
                  ? customShuffled.svg
                  : avatarType === "notionists"
                  ? NOTIONISTS_AVATARS.find((a) => a.id === selectedAvatarId)?.svg
                  : DEFAULT_AVATARS.find((a) => a.id === selectedAvatarId)?.svg}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-gray-500 dark:text-zinc-400">
                Selected:{" "}
                {selectedAvatarId === "custom" && customShuffled
                  ? "Custom Shuffled Character"
                  : avatarType === "notionists"
                  ? NOTIONISTS_AVATARS.find((a) => a.id === selectedAvatarId)?.name || `Avatar ${selectedAvatarId}`
                  : DEFAULT_AVATARS.find((a) => a.id === selectedAvatarId)?.name || `Avatar ${selectedAvatarId}`}
              </span>
              {avatarType === "notionists" ? (
                <div className="flex items-center gap-1.5">
                  <div className="flex p-0.5 rounded-lg bg-gray-100 dark:bg-zinc-800 border border-black/[0.04] dark:border-white/5">
                    <button
                      type="button"
                      onClick={() => setAvatarColorMode("bold")}
                      className={cn(
                        "px-2 py-0.5 text-[10px] font-bold rounded-md transition-all cursor-pointer",
                        avatarColorMode === "bold"
                          ? "bg-white dark:bg-zinc-700 text-gray-950 dark:text-zinc-50 shadow-2xs"
                          : "text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-zinc-200"
                      )}
                    >
                      Bold
                    </button>
                    <button
                      type="button"
                      onClick={() => setAvatarColorMode("pastel")}
                      className={cn(
                        "px-2 py-0.5 text-[10px] font-bold rounded-md transition-all cursor-pointer",
                        avatarColorMode === "pastel"
                          ? "bg-white dark:bg-zinc-700 text-gray-950 dark:text-zinc-50 shadow-2xs"
                          : "text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-zinc-200"
                      )}
                    >
                      Pastel
                    </button>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const shuffled = generateShuffledNotionist(null, avatarColorMode);
                      setCustomShuffled(shuffled);
                      setSelectedAvatarId("custom");
                    }}
                    className="h-7 px-2.5 text-[11px] font-semibold rounded-lg border border-black/[0.08] dark:border-white/10 bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-xs cursor-pointer active:scale-95 transition-all flex items-center gap-1.5"
                  >
                    <DiceFaces03Icon size="1em" className="text-[13px] text-pup-maroon dark:text-red-400" aria-hidden="true" />
                    <span>Shuffle</span>
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <div className="flex p-0.5 rounded-lg bg-gray-100 dark:bg-zinc-800 border border-black/[0.04] dark:border-white/5">
                    <button
                      type="button"
                      onClick={() => setBeamColorMode("classic")}
                      className={cn(
                        "px-2 py-0.5 text-[10px] font-bold rounded-md transition-all cursor-pointer",
                        beamColorMode === "classic"
                          ? "bg-white dark:bg-zinc-700 text-gray-950 dark:text-zinc-50 shadow-2xs"
                          : "text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-zinc-200"
                      )}
                    >
                      Classic
                    </button>
                    <button
                      type="button"
                      onClick={() => setBeamColorMode("vibrant")}
                      className={cn(
                        "px-2 py-0.5 text-[10px] font-bold rounded-md transition-all cursor-pointer",
                        beamColorMode === "vibrant"
                          ? "bg-white dark:bg-zinc-700 text-gray-950 dark:text-zinc-50 shadow-2xs"
                          : "text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-zinc-200"
                      )}
                    >
                      Vibrant
                    </button>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const shuffled = generateShuffledBeam(null, beamColorMode);
                      setCustomShuffled(shuffled);
                      setSelectedAvatarId("custom");
                    }}
                    className="h-7 px-2.5 text-[11px] font-semibold rounded-lg border border-black/[0.08] dark:border-white/10 bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-xs cursor-pointer active:scale-95 transition-all flex items-center gap-1.5"
                  >
                    <DiceFaces03Icon size="1em" className="text-[13px] text-pup-maroon dark:text-red-400" aria-hidden="true" />
                    <span>Shuffle</span>
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Avatars Grid */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="text-[11px] font-medium uppercase tracking-[0.04em] text-gray-550 dark:text-zinc-400">
                {avatarType === "notionists" ? "Select Notionist Character" : "Select Default Avatar"}
              </label>
              {avatarType === "notionists" && (
                <span className="text-[11px] text-gray-400 dark:text-zinc-500">
                  18 Curated Styles + Custom Shuffle
                </span>
              )}
            </div>

            {avatarType === "notionists" ? (
              <div className="grid grid-cols-6 gap-2.5 w-full max-h-64 overflow-y-auto p-1 -m-1">
                {NOTIONISTS_AVATARS.map((avatar) => {
                  const isSelected = selectedAvatarId === avatar.id && !customShuffled;
                  return (
                    <button
                      key={avatar.id}
                      type="button"
                      onClick={() => {
                        setSelectedAvatarId(avatar.id);
                        setCustomShuffled(null);
                      }}
                      className={cn(
                        "relative aspect-square rounded-full transition-all p-0 flex items-center justify-center cursor-pointer active:scale-95",
                        isSelected
                          ? "ring-2 ring-pup-maroon dark:ring-red-400 ring-offset-2 ring-offset-white dark:ring-offset-card shadow-sm"
                          : "opacity-75 hover:opacity-100"
                      )}
                      aria-pressed={isSelected}
                      title={avatar.name}
                    >
                      <div
                        className={cn(
                          "w-full h-full rounded-full overflow-hidden border-2 flex items-center justify-center bg-gray-50 dark:bg-zinc-800 transition-colors",
                          isSelected
                            ? "border-pup-maroon dark:border-red-400"
                            : "border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-zinc-700"
                        )}
                      >
                        <div className="w-full h-full flex items-center justify-center [&_svg]:size-full">
                          {avatar.svg}
                        </div>
                      </div>
                      {isSelected && (
                        <div className="absolute top-0 right-0 w-4 h-4 rounded-full bg-pup-maroon dark:bg-red-500 text-white flex items-center justify-center shadow-xs ring-1 ring-white dark:ring-card">
                          <Tick01Icon size="1em" className="text-[10px]" aria-hidden="true" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-6 gap-2.5 w-full max-h-64 overflow-y-auto p-1 -m-1">
                  {visibleAvatars.map((avatar) => {
                    const isSelected = selectedAvatarId === avatar.id;
                    return (
                      <button
                        key={avatar.id}
                        type="button"
                        onClick={() => {
                          setSelectedAvatarId(avatar.id);
                          setCustomShuffled(null);
                        }}
                        className={cn(
                          "relative aspect-square rounded-full transition-all p-0 flex items-center justify-center cursor-pointer active:scale-95",
                          isSelected
                            ? "ring-2 ring-pup-maroon dark:ring-red-400 ring-offset-2 ring-offset-white dark:ring-offset-card shadow-sm"
                            : "opacity-75 hover:opacity-100"
                        )}
                        aria-pressed={isSelected}
                        title={avatar.name}
                      >
                        <div
                          className={cn(
                            "w-full h-full rounded-full overflow-hidden border-2 flex items-center justify-center bg-gray-50 dark:bg-zinc-800 transition-colors",
                            isSelected
                              ? "border-pup-maroon dark:border-red-400"
                              : "border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-zinc-700"
                          )}
                        >
                          <div className="w-full h-full flex items-center justify-center [&_svg]:size-full">
                            {avatar.svg}
                          </div>
                        </div>
                        {isSelected && (
                          <div className="absolute top-0 right-0 w-4 h-4 rounded-full bg-pup-maroon dark:bg-red-500 text-white flex items-center justify-center shadow-xs ring-1 ring-white dark:ring-card">
                            <Tick01Icon size="1em" className="text-[10px]" aria-hidden="true" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
                <div className="mt-3 flex justify-center">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowAllAvatars((prev) => !prev)}
                    className="h-8 px-4 text-xs font-semibold rounded-xl border border-black/[0.06] dark:border-white/[0.08] bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-xs cursor-pointer active:scale-95 transition-all"
                  >
                    {avatarsExpanded ? "Show Fewer Avatars" : "View More Avatars"}
                  </Button>
                </div>
              </>
            )}
          </div>
        </fieldset>
        <div>
          <label id={labelId} className="mb-1.5 block text-xs font-medium text-gray-700 dark:text-zinc-300">
            Display Name Format
          </label>
          <Select
            aria-labelledby={labelId}
            value={nameFormat}
            onChange={(event) => setNameFormat(event.target.value)}
            disabled={saving}
          >
            <option value="full_name">{firstName} {lastName}</option>
            <option value="first_only">{firstName}</option>
            <option value="last_only">{lastName}</option>
            <option value="last_first">{lastName}, {firstName}</option>
          </Select>
        </div>
        {error && <p role="alert" className="text-xs text-red-600 dark:text-red-400">{error}</p>}
      </div>

      <div className="flex shrink-0 flex-wrap justify-between gap-2 p-6">
        {onBack && <Button type="button" variant="outline" disabled={saving} onClick={onBack}>Back</Button>}
        <div className="ml-auto flex flex-wrap gap-2">
          <Button type="button" variant="outline" disabled={saving} onClick={() => complete(true)}>Skip Avatar</Button>
          <Button type="submit" disabled={saving}>{saving ? "Saving Preferences…" : "Save Preferences"}</Button>
        </div>
      </div>
    </form>
  );
}
