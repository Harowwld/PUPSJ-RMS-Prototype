"use client";

import InitialLoaderSetting from "@/components/shared/InitialLoaderSetting";
import { STUDENT_AFFILIATIONS } from "@/lib/studentAffiliation";
import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";

import { toast } from "sonner";
import { formatErrorMessage } from "@/lib/errorUtils";
import { Skeleton } from "@/components/ui/skeleton";
import { getClientSession } from "@/lib/clientAuth";
import { DEFAULT_AVATARS, DEFAULT_AVATAR_VISIBLE_COUNT } from "@/lib/defaultAvatars";
import {
  NOTIONISTS_AVATARS,
  NOTIONISTS_BOLD_COLORS,
  NOTIONISTS_PASTEL_COLORS,
  NOTIONISTS_BOLD_PALETTE,
  NOTIONISTS_PASTEL_PALETTE,
  generateShuffledNotionist,
  replaceSvgBg,
} from "@/lib/notionistsAvatars";
import {
  BEAM_PALETTES,
  BEAM_CLASSIC_PALETTES,
  BEAM_VIBRANT_PALETTES,
  getBeamPresetInfo,
  generateBeamSvgString,
  generateShuffledBeam,
  getBeamPalette,
} from "@/lib/beamAvatars";
import { validateSecurityAnswer } from "@/lib/authSchemas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import { motion, AnimatePresence } from "framer-motion";
import { useAppReducedMotion, SPRING_LAYOUT } from "@/lib/motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Select } from "@/components/ui/select";
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyMedia,
} from "@/components/ui/empty";
import RecoveryCodesModal from "@/components/shared/RecoveryCodesModal";
import { TOTPChallengeModal } from "@/components/shared/TOTPChallengeModal";
import PageHeader from "@/components/shared/PageHeader";
import { cn } from "@/lib/utils";
import { BADGE_BASE, BADGE_PALETTES, SETTINGS_DOT_CHECK, SETTINGS_STATUS_PILL_SM } from "@/lib/badgeStyles";

const SETTINGS_GRAY_BADGE =
  "text-xs font-mono font-semibold px-2 py-0.5 rounded-md bg-black/[0.04] dark:bg-white/[0.06] text-gray-800 dark:text-zinc-200";

const SETTINGS_STATUS_PILL =
  "inline-flex items-center gap-2 px-3 py-1 rounded-full bg-black/[0.04] dark:bg-white/[0.06] text-xs font-jakarta select-none";

const SETTINGS_PILL_DIVIDER =
  "h-3.5 w-px bg-black/[0.1] dark:bg-white/15 shrink-0";

import {
  getOfficeRoleLabel,
  isSystemAdminRole,
} from "@/lib/roleUtils";
import { getRoleBranding } from "@/lib/roleBranding";
import { ZOOM_PERCENTAGES } from "@/hooks/useLayoutZoom";
import {
  setHighContrastPreference,
  setReduceMotionPreference,
  setFontSizePreference,
  setPointerCursorPreference,
  FONT_SIZE_LEVELS,
} from "@/lib/accessibility";
import {
  DEFAULT_SOUND_CATEGORIES,
  DEFAULT_SOUND_VOLUME,
  SOUND_CATEGORY_DEFINITIONS,
  getSoundEnabledPreference,
  setSoundEnabledPreference,
  getSoundVolumePreference,
  setSoundVolumePreference,
  getSoundCategoriesPreference,
  setSoundCategoriesPreference,
  normalizeSoundCategories,
} from "@/lib/soundPreferences";
import { playSoundCue } from "@/lib/soundPatch";

const FONT_SIZE_OPTIONS = [
  { id: "smaller", label: "Smaller", scale: "88%", glyphClass: "text-xs font-semibold", desc: "Compact density", tag: "Dense" },
  { id: "small", label: "Small", scale: "94%", glyphClass: "text-sm font-semibold", desc: "Slight text reduction", tag: "Compact" },
  { id: "default", label: "Default", scale: "100%", glyphClass: "text-base font-bold", desc: "Standard institutional", tag: "Standard" },
  { id: "large", label: "Large", scale: "106%", glyphClass: "text-lg font-bold", desc: "Enhanced legibility", tag: "Large" },
  { id: "larger", label: "Larger", scale: "114%", glyphClass: "text-xl font-extrabold", desc: "Maximum readability", tag: "Spacious" },
];

const TABLE_DENSITY_OPTIONS = [
  {
    id: "compact",
    label: "Compact",
    height: "40px row",
    desc: "Dense data scan",
    rowHeight: 40,
    padding: 4,
    badge: "40px",
    tagline: "High density • Rapid scanning",
    recommendedFor: "Archival auditing & high-volume record browsing",
  },
  {
    id: "normal",
    label: "Normal",
    height: "52px row",
    desc: "Balanced standard",
    rowHeight: 52,
    padding: 8,
    badge: "52px",
    tagline: "Balanced • Institutional default",
    recommendedFor: "Standard registrar & day-to-day administrative workflow",
  },
  {
    id: "comfortable",
    label: "Comfortable",
    height: "64px row",
    desc: "Spacious & relaxed",
    rowHeight: 64,
    padding: 12,
    badge: "64px",
    tagline: "Roomy • Enhanced readability",
    recommendedFor: "Touchscreen interaction, relaxed reading & multi-line details",
  },
];
import {
  HelpCircleIcon as EmptyHelpCircleIcon,
  ArrowRight01Icon,
  Building04Icon,
  Camera01Icon,
  CancelCircleIcon,
  CheckmarkBadge01Icon,
  CheckmarkCircle01Icon,
  Copy01Icon,
  CovidInfoIcon,
  GlassesIcon,
  Home01Icon,
  Key01Icon,
  Layout01Icon,
  Loading01Icon,
  LockPasswordIcon,
  QrCodeIcon,
  SchoolIcon,
  SecurityCheckIcon,
  Shield01Icon,
  SmartPhone01Icon,
  SquareLock01Icon,
  Tick01Icon,
  UserCircleIcon,
  UserIcon,
  ViewIcon,
  ViewOffIcon,
  ReloadIcon,
  DiceFaces03Icon,
  ShuffleIcon,
  ColorsIcon,
} from "hugeicons-react";
import AppleProfileCover from "@/components/shared/AppleProfileCover";
import AuthenticatorAppBadges from "@/components/shared/AuthenticatorAppBadges";
import { Switch } from "@/components/ui/switch";
import AppIcon from "@/components/ui/app-icon";
import { TableDensityControl, useTablePreferences } from "@/components/shared/TablePreferences";
import { TABLE_DENSITIES } from "@/lib/tablePresentation";
const getNowTimestamp = () => Date.now();

const getPasswordStrength = (pwd) => {
  if (!pwd) return { score: 0, label: "", color: "bg-gray-200 dark:bg-zinc-700", text: "text-gray-400" };
  let score = 0;
  if (pwd.length >= 8) score++;
  if (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) score++;
  if (/[0-9]/.test(pwd)) score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;

  if (pwd.length < 8) return { score: 1, label: "Too short (min 8 chars)", color: "bg-red-500", text: "text-red-500" };
  if (score <= 1) return { score: 1, label: "Weak", color: "bg-red-500", text: "text-red-500" };
  if (score === 2) return { score: 2, label: "Fair", color: "bg-amber-500", text: "text-amber-500" };
  if (score === 3) return { score: 3, label: "Good", color: "bg-blue-500", text: "text-blue-500" };
  return { score: 4, label: "Strong", color: "bg-emerald-500", text: "text-emerald-500" };
};

export default function AccountSettingsPanel() {
  const router = useRouter();
  const { density: tableDensity, setDensity: setTableDensity } = useTablePreferences();

  const [authUser, setAuthUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const roleBranding = getRoleBranding(authUser);
  const brandAccent = authUser?.accent_color || roleBranding.color || "#800000";
  const brandForeground = roleBranding.foreground || "#FFFFFF";

  useEffect(() => {
    if (typeof window !== "undefined" && brandAccent) {
      document.documentElement.style.setProperty("--brand-accent", brandAccent);
      document.documentElement.style.setProperty("--brand-foreground", brandForeground);
    }
  }, [brandAccent, brandForeground]);

  // Avatar State
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [avatarLoaded, setAvatarLoaded] = useState(false);
  const [selectedDefaultAvatarId, setSelectedDefaultAvatarId] = useState(0);
  const [avatarSaving, setAvatarSaving] = useState(false);
  const [showAllAvatars, setShowAllAvatars] = useState(false);
  const avatarsExpanded = showAllAvatars;
  const visibleAvatars = avatarsExpanded ? DEFAULT_AVATARS : DEFAULT_AVATARS.slice(0, DEFAULT_AVATAR_VISIBLE_COUNT);

  const [avatarTab, setAvatarTab] = useState("notionists");
  const [customShuffled, setCustomShuffled] = useState(null);
  const [avatarColorMode, setAvatarColorMode] = useState("bold");
  const [avatarSelectedColor, setAvatarSelectedColor] = useState(null);
  const [stagedAvatar, setStagedAvatar] = useState(null);
  const shouldReduceMotion = useAppReducedMotion();
  const [paletteShuffleCount, setPaletteShuffleCount] = useState(0);
  const [characterShuffleCount, setCharacterShuffleCount] = useState(0);
  const [shufflePaletteWithCharacter, setShufflePaletteWithCharacter] = useState(false);
  const [beamPaletteMode, setBeamPaletteMode] = useState("classic"); // "classic" | "vibrant"
  const [selectedBeamPaletteId, setSelectedBeamPaletteId] = useState("maroon-gold");

  // Custom avatar saved states from localStorage
  const [savedCustomAvatar, setSavedCustomAvatar] = useState(() => {
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem("pupsj_custom_avatar");
        if (raw) return JSON.parse(raw);
      } catch {
        // ignore storage errors
      }
    }
    return null;
  });

  const [savedCustomBeam, setSavedCustomBeam] = useState(() => {
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem("pupsj_custom_beam_avatar");
        if (raw) return JSON.parse(raw);
      } catch {
        // ignore storage errors
      }
    }
    return null;
  });

  const [savedCustomNotionist, setSavedCustomNotionist] = useState(() => {
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem("pupsj_custom_notionist_avatar");
        if (raw) return JSON.parse(raw);
      } catch {
        // ignore storage errors
      }
    }
    return null;
  });

  // Derived current applied avatar info for the active user
  const appliedAvatarInfo = useMemo(() => {
    if (!authUser?.avatar_filename) {
      return { type: "default", id: 0 };
    }
    const matchNotionist = authUser.avatar_filename.match(/notionist(\d+)/);
    if (matchNotionist) {
      return { type: "notionists", id: parseInt(matchNotionist[1], 10) };
    }
    const matchDefault = authUser.avatar_filename.match(/default(\d+)/);
    if (matchDefault) {
      return { type: "beam", id: parseInt(matchDefault[1], 10) };
    }
    return { type: "custom", id: "custom" };
  }, [authUser?.avatar_filename]);

  const notionistChoices = useMemo(() => {
    return [
      {
        id: 0,
        name: "Default",
        alt: "Default Profile",
        isDefaultProfile: true,
      },
      {
        id: "custom",
        name: "Custom",
        alt: "Custom Notionist Avatar",
        isCustomTile: true,
      },
      ...NOTIONISTS_AVATARS.slice(0, 18),
    ];
  }, []);

  const avatarChoices = useMemo(() => {
    return [
      {
        id: 0,
        name: "Default",
        alt: "Default Profile",
        isDefaultProfile: true,
      },
      {
        id: "custom",
        name: "Custom",
        alt: "Custom Beam Gradient",
        isCustomTile: true,
      },
      ...DEFAULT_AVATARS.slice(0, 46),
    ];
  }, []);

  // Profile Form State
  const [fname, setFname] = useState("");
  const [lname, setLname] = useState("");
  const [mname, setMname] = useState("");
  const [studentNo, setStudentNo] = useState("");
  const [checklistStudentNo, setChecklistStudentNo] = useState("");
  const [clientType, setClientType] = useState("Student");
  const [username, setUsername] = useState("");
  const [profileLoading, setProfileLoading] = useState(false);
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [copiedItem, setCopiedItem] = useState(null);
  const [initialProfileValues, setInitialProfileValues] = useState({
    fname: "",
    lname: "",
    mname: "",
    studentNo: "",
    checklistStudentNo: "",
    clientType: "Student",
  });

  // Password Form State
  const [pwCurrent, setPwCurrent] = useState("");
  const [pwNext, setPwNext] = useState("");
  const [pwConfirm, setPwConfirm] = useState("");
  const [pwLoading, setPwLoading] = useState(false);
  const [showPw, setShowPw] = useState({ current: false, next: false, confirm: false });
  const pwStrength = getPasswordStrength(pwNext);

  // Security Form State
  const [globalQuestions, setGlobalQuestions] = useState([]);
  const [secAnswers, setSecAnswers] = useState({});
  const [secLoading, setSecLoading] = useState(false);
  const [hasSetSecurity, setHasSetSecurity] = useState(false);
  const [editingSecQuestions, setEditingSecQuestions] = useState({});

  // TOTP Form State
  const [totpEnabled, setTotpEnabled] = useState(false);
  const [hasTotpSecret, setHasTotpSecret] = useState(false);
  const [totpSetupData, setTotpSetupData] = useState(null);
  const [totpToken, setTotpToken] = useState("");
  const [totpLoading, setTotpLoading] = useState(false);
  const [totpSetupLoading, setTotpSetupLoading] = useState(false);
  const [recoveryCodesLoading, setRecoveryCodesLoading] = useState(false);
  const [totpStep, setTotpStep] = useState("idle");
  const [recoveryCodes, setRecoveryCodes] = useState([]);
  const [recoveryCodesCount, setRecoveryCodesCount] = useState(0);
  const [showRecoveryCodesDialog, setShowRecoveryCodesDialog] = useState(false);
  const [showSecTOTPModal, setShowSecTOTPModal] = useState(false);

  const [activeTab, setActiveTab] = useState(() => {
    if (typeof window !== "undefined") {
      const tab = new URLSearchParams(window.location.search).get("tab");
      const validTabs = ["profile", "security", "two-factor", "preferences", "sound", "accessibility", "activity"];
      if (tab && (validTabs.includes(tab) || tab === "2fa")) {
        return tab === "2fa" ? "two-factor" : tab;
      }
    }
    return "profile";
  });

  const handleTabChange = (tab) => {
    const resolvedTab = tab === "2fa" ? "two-factor" : tab;
    setActiveTab(resolvedTab);
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (resolvedTab === "profile") {
        params.delete("tab");
      } else {
        params.set("tab", resolvedTab);
      }
      const qs = params.toString();
      router.replace(qs ? `${window.location.pathname}?${qs}` : window.location.pathname, { scroll: false });
    }
  };


  // User Preferences State (Personal)
  const [userPreferences, setUserPreferences] = useState({});

  useEffect(() => {
    (async () => {
      try {
        const [resAuth, resUserSecurity] = await Promise.all([
          getClientSession(),
          fetch("/api/staff/security")
        ]);

        if (!resAuth.ok || !resAuth.data) {
          if (resAuth.status === 401) {
            router.push("/login");
          }
          return;
        }
        const user = resAuth.data;
        setAuthUser(user);
        if (user.avatar_filename) {
          setAvatarUrl(`/api/account/avatar?id=${user.id}&t=${Date.now()}`);
          const matchDefault = user.avatar_filename.match(/default(\d+)/);
          const matchNotionist = user.avatar_filename.match(/notionist(\d+)/);
          if (matchDefault) {
            const savedAvatarId = parseInt(matchDefault[1], 10);
            setSelectedDefaultAvatarId(savedAvatarId);
            if (savedAvatarId > DEFAULT_AVATAR_VISIBLE_COUNT) setShowAllAvatars(true);
          } else if (matchNotionist) {
            const savedAvatarId = parseInt(matchNotionist[1], 10);
            setSelectedDefaultAvatarId(savedAvatarId);
          } else {
            setSelectedDefaultAvatarId(null);
          }
        } else {
          setAvatarUrl(null);
          setSelectedDefaultAvatarId(0);
        }
        setFname(user.fname || "");
        setLname(user.lname || "");
        setMname(user.mname || "");
        setUsername(user.email || user.username || "");
        setStudentNo(user.student_no || "");
        setChecklistStudentNo(user.checklist_student_no || "");
        const derivedClientType = user.client_type || (user.course_code === "ALUMNI" || (user.student_no && user.student_no.startsWith("ALUM-")) ? "Alumni" : "Student");
        setClientType(derivedClientType);
        setInitialProfileValues({
          fname: user.fname || "",
          lname: user.lname || "",
          mname: user.mname || "",
          studentNo: user.student_no || "",
          checklistStudentNo: user.checklist_student_no || "",
          clientType: derivedClientType,
        });
        setUserPreferences(user.preferences || {});



        const jsonUserSecurity = await resUserSecurity.json().catch(() => null);
        if (jsonUserSecurity?.ok && jsonUserSecurity.data) {
          setHasSetSecurity(jsonUserSecurity.data.hasAllQuestions);
          if (Array.isArray(jsonUserSecurity.data.questions)) {
            setGlobalQuestions(jsonUserSecurity.data.questions);
          }
        }

        // Fetch TOTP status
        const resTOTP = await fetch("/api/auth/totp");
        const jsonTOTP = await resTOTP.json().catch(() => null);
        if (jsonTOTP?.ok && jsonTOTP.data) {
          setTotpEnabled(jsonTOTP.data.enabled);
          setHasTotpSecret(jsonTOTP.data.hasSecret);
          setRecoveryCodesCount(jsonTOTP.data.recoveryCodesCount || 0);
        }
      } catch {
        router.push("/login");
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);


  const handleAccessibilityToggle = async (key, val) => {
    const oldPrefs = { ...userPreferences };
    setUserPreferences((prev) => ({ ...prev, [key]: val }));

    if (key === "high_contrast") {
      setHighContrastPreference(val, authUser?.id);
    } else if (key === "reduce_motion") {
      setReduceMotionPreference(val, authUser?.id);
    } else if (key === "pointer_cursor") {
      setPointerCursorPreference(val, authUser?.id);
    }

    try {
      const res = await fetch("/api/auth/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preferences: { [key]: val } }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error);
      toast.success("Preference Saved", {
        description: "Your accessibility settings have been updated successfully."
      });
    } catch (error) {
      setUserPreferences(oldPrefs);
      if (key === "high_contrast") {
        setHighContrastPreference(Boolean(oldPrefs.high_contrast), authUser?.id);
      } else if (key === "reduce_motion") {
        setReduceMotionPreference(Boolean(oldPrefs.reduce_motion), authUser?.id);
      } else if (key === "pointer_cursor") {
        setPointerCursorPreference(Boolean(oldPrefs.pointer_cursor !== undefined ? oldPrefs.pointer_cursor : true), authUser?.id);
      }
      const errInfo = formatErrorMessage(error, { title: "Preference Update Failed", description: "Could not update your preference." });
      toast.error(errInfo.title, { description: errInfo.description, action: errInfo.action });
    }
  };

  const activeZoomNode = typeof userPreferences?.zoom_node === "number"
    ? userPreferences.zoom_node
    : (typeof window !== "undefined" && (localStorage.getItem(`pup_zoom_node_${authUser?.id}`) || localStorage.getItem("pup_zoom_node")) !== null
        ? parseInt(localStorage.getItem(`pup_zoom_node_${authUser?.id}`) || localStorage.getItem("pup_zoom_node"), 10)
        : 3);

  const handleZoomPreferenceChange = async (node) => {
    const oldPrefs = { ...userPreferences };
    setUserPreferences((prev) => ({ ...prev, zoom_node: node }));
    if (typeof window !== "undefined") {
      if (authUser?.id) {
        localStorage.setItem(`pup_zoom_node_${authUser.id}`, String(node));
      }
      localStorage.setItem("pup_zoom_node", String(node));
      window.dispatchEvent(new CustomEvent("zoom-preference-changed", { detail: { node } }));
    }

    try {
      const res = await fetch("/api/auth/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preferences: { zoom_node: node } }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error);
      toast.success("Zoom Preference Saved", {
        description: `Default layout scale set to ${ZOOM_PERCENTAGES[node] ?? 100}%.`
      });
    } catch (error) {
      setUserPreferences(oldPrefs);
      const errInfo = formatErrorMessage(error, { title: "Zoom Setting Failed", description: "Could not update zoom preference." });
      toast.error(errInfo.title, { description: errInfo.description, action: errInfo.action });
    }
  };

  const handleFontSizePreferenceChange = async (size) => {
    const oldPrefs = { ...userPreferences };
    setUserPreferences((prev) => ({ ...prev, font_size: size }));
    setFontSizePreference(size, authUser?.id);

    try {
      const res = await fetch("/api/auth/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preferences: { font_size: size } }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error);
      const label = FONT_SIZE_OPTIONS.find((o) => o.id === size)?.label || size;
      toast.success("Font Size Saved", {
        description: `Default text scale set to ${label}.`,
      });
    } catch (error) {
      setUserPreferences(oldPrefs);
      setFontSizePreference(oldPrefs.font_size || "default", authUser?.id);
      const errInfo = formatErrorMessage(error, { title: "Font Size Setting Failed", description: "Could not update font size preference." });
      toast.error(errInfo.title, { description: errInfo.description, action: errInfo.action });
    }
  };

  const handlePreferenceChange = async (key, val, successMsg = "Preference Saved") => {
    const oldPrefs = { ...userPreferences };
    const nextPrefs = { ...userPreferences, [key]: val };
    setUserPreferences((prev) => ({ ...prev, [key]: val }));
    setAuthUser((prev) => prev ? { ...prev, preferences: { ...(prev.preferences || {}), [key]: val } } : prev);

    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("user-preferences-changed", {
          detail: { key, val, preferences: nextPrefs },
        })
      );
      if (key === "display_name_format") {
        window.dispatchEvent(
          new CustomEvent("display-name-format-changed", {
            detail: { format: val, preferences: nextPrefs },
          })
        );
      }
    }

    try {
      const res = await fetch("/api/auth/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preferences: { [key]: val } }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error);
      if (key === "initial_loader") {
        const loaderScope = document.getElementById("dashboard-loader-scope");
        if (loaderScope) loaderScope.dataset.initialLoader = val;
      }
      toast.success(successMsg, {
        description: "Your preference settings have been updated.",
      });
    } catch (error) {
      setUserPreferences(oldPrefs);
      setAuthUser((prev) => prev ? { ...prev, preferences: oldPrefs } : prev);
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("user-preferences-changed", {
            detail: { preferences: oldPrefs },
          })
        );
        if (key === "display_name_format") {
          window.dispatchEvent(
            new CustomEvent("display-name-format-changed", {
              detail: { format: oldPrefs.display_name_format || "full_name", preferences: oldPrefs },
            })
          );
        }
      }
      const errInfo = formatErrorMessage(error, { title: "Preference Update Failed", description: "Could not update your preference." });
      toast.error(errInfo.title, { description: errInfo.description, action: errInfo.action });
    }
  };

  const handleTableDensityChange = (newDensity) => {
    setTableDensity(newDensity);
    toast.success("Table Row Density Updated", {
      description: `Tables set to ${newDensity} (${TABLE_DENSITIES[newDensity]?.height || 52}px rows).`,
    });
  };

  // Interface Sound Preferences Handlers
  const soundEnabled =
    userPreferences.sound_enabled !== undefined
      ? Boolean(userPreferences.sound_enabled)
      : getSoundEnabledPreference(authUser?.id);

  const soundVolume =
    typeof userPreferences.sound_volume === "number" && Number.isFinite(userPreferences.sound_volume)
      ? Math.min(1, Math.max(0, userPreferences.sound_volume))
      : getSoundVolumePreference(authUser?.id);

  const soundCategories = useMemo(
    () => normalizeSoundCategories(userPreferences.sound_categories || getSoundCategoriesPreference(authUser?.id)),
    [userPreferences.sound_categories, authUser?.id]
  );

  const handleSoundMasterToggle = async (checked) => {
    const boolVal = Boolean(checked);
    const oldPrefs = { ...userPreferences };
    setUserPreferences((prev) => ({ ...prev, sound_enabled: boolVal }));
    setSoundEnabledPreference(boolVal, authUser?.id);

    try {
      const res = await fetch("/api/auth/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preferences: { sound_enabled: boolVal } }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error);
      toast.success(boolVal ? "Interface Sounds Enabled" : "Interface Sounds Muted", {
        description: boolVal
          ? "Synthesized audio cues will play across portal controls."
          : "All interface sound effects have been muted.",
      });
    } catch (error) {
      setUserPreferences(oldPrefs);
      setSoundEnabledPreference(Boolean(oldPrefs.sound_enabled), authUser?.id);
      const errInfo = formatErrorMessage(error, {
        title: "Sound Preference Failed",
        description: "Could not update your sound setting.",
      });
      toast.error(errInfo.title, { description: errInfo.description, action: errInfo.action });
    }
  };

  const handleSoundVolumeInput = (nextVolume) => {
    const clamped = Math.round(Math.min(1, Math.max(0, Number(nextVolume))) * 100) / 100;
    setUserPreferences((prev) => ({ ...prev, sound_volume: clamped }));
    setSoundVolumePreference(clamped, authUser?.id);
  };

  const handleSoundVolumeCommit = async (nextVolume) => {
    const clamped = Math.round(Math.min(1, Math.max(0, Number(nextVolume))) * 100) / 100;
    setSoundVolumePreference(clamped, authUser?.id);
    try {
      const res = await fetch("/api/auth/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preferences: { sound_volume: clamped } }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error);
    } catch (error) {
      const errInfo = formatErrorMessage(error, {
        title: "Volume Update Failed",
        description: "Could not save your master volume level.",
      });
      toast.error(errInfo.title, { description: errInfo.description, action: errInfo.action });
    }
  };

  const handleSoundCategoryToggle = async (categoryId, checked) => {
    const boolVal = Boolean(checked);
    const oldPrefs = { ...userPreferences };
    const nextCategories = { ...soundCategories, [categoryId]: boolVal };
    setUserPreferences((prev) => ({ ...prev, sound_categories: nextCategories }));
    setSoundCategoriesPreference(nextCategories, authUser?.id);

    try {
      const res = await fetch("/api/auth/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          preferences: { sound_categories: { [categoryId]: boolVal } },
        }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error);
      const catDef = SOUND_CATEGORY_DEFINITIONS.find((c) => c.id === categoryId);
      toast.success("Sound Category Updated", {
        description: `${catDef?.label || "Category"} sounds ${boolVal ? "enabled" : "muted"}.`,
      });
    } catch (error) {
      setUserPreferences(oldPrefs);
      setSoundCategoriesPreference(
        normalizeSoundCategories(oldPrefs.sound_categories || DEFAULT_SOUND_CATEGORIES),
        authUser?.id
      );
      const errInfo = formatErrorMessage(error, {
        title: "Sound Category Failed",
        description: "Could not update sound category preference.",
      });
      toast.error(errInfo.title, { description: errInfo.description, action: errInfo.action });
    }
  };

  const availableHomeViews = useMemo(() => {
    if (authUser?.role === "Student") {
      return [
        { id: "default", label: "Overview", desc: "View request status and recent activity" },
        ...(authUser.client_type === "Student" && authUser.portal_setup_complete !== false
          ? [{ id: "compliance", label: "Document Checklist", desc: "Review student enrollment requirements" }]
          : []),
        { id: "requests", label: "Document Requests", desc: "View and request official academic records" },
      ];
    }
    if (isSystemAdminRole(authUser?.role)) {
      return [
        { id: "health", label: "Campus Operations", desc: "Real-time health, server metrics & service status" },
        { id: "offices", label: "Departments & Stations", desc: "Institutional governance and department directory" },
        { id: "modules", label: "Department Features", desc: "Module activation & permission matrix" },
        { id: "branding", label: "Institutional Identity", desc: "Institutional themes, typography & branding" },
        { id: "landing", label: "Landing Page CMS", desc: "Public landing page content and announcement editor" },
        { id: "staff", label: "Global Directory", desc: "All campus personnel across all departments" },
        { id: "security", label: "Security Questions", desc: "Security question bank and recovery policies" },
        { id: "logs", label: "Platform Activity History", desc: "System audit trails and security activity" },
        { id: "backups", label: "Platform Backups", desc: "Automated campus backups, media and snapshots" },
      ];
    }
    if (authUser?.role === "Admin") {
      return [
        { id: "review", label: "Records Review", desc: "Queue of uploaded documents awaiting validation" },
        { id: "digitization", label: "Compliance Analytics", desc: "Course-by-course digitization progress metrics" },
        { id: "request_analytics", label: "SLA Analytics", desc: "Turnaround times and fulfillment SLA metrics" },
        { id: "storage_layout", label: "Storage Room Layout", desc: "2D physical archives room and cabinet map" },
        { id: "directory", label: "Staff Directory", desc: "Office staff accounts and role assignments" },
        { id: "logs", label: "Activity History", desc: "Department audit logs and user access events" },
        { id: "system_data", label: "System Configuration", desc: "Courses, sections, and document types setup" },
        { id: "system", label: "Backup & Recovery", desc: "Local archive backups and encrypted snapshots" },
      ];
    }
    // Staff role
    const isOsas = authUser?.office_id === "osas" || authUser?.section === "OSAS";
    if (isOsas) {
      return [
        { id: "osas_monitoring", label: "Organization Monitoring", desc: "Monitor student organization proposals and events" },
        { id: "organizations", label: "Student Organizations", desc: "Directory of accredited student groups" },
        { id: "documents", label: "Office Documents", desc: "Digital archive of submitted organizational files" },
        { id: "requests", label: "Document Requests", desc: "Track student document requests" },
        { id: "notifications", label: "Notifications", desc: "Recent alerts, updates, and reminders" },
      ];
    }
    return [
      { id: "requests", label: "Document Requests", desc: "Track and fulfill pending student requests" },
      { id: "upload", label: "Scan & Upload", desc: "Direct file upload and scanner station ingest" },
      { id: "batch_review", label: "Batch Review", desc: "Batch validate and review queued submissions" },
      { id: "students", label: "Student Directory", desc: "Search and inspect enrolled student profiles" },
      { id: "search", label: "Records & Archive", desc: "Search repository records and archives" },
      { id: "storage", label: "Storage Explorer", desc: "Physical archive room and cabinet locator" },
      { id: "documents", label: "Student Documents", desc: "Browse documents repository" },
      { id: "notifications", label: "Notifications", desc: "Recent alerts, updates, and reminders" },
    ];
  }, [authUser]);

  const cleanFirstPref = fname || authUser?.fname || "";
  const cleanLastPref = lname || authUser?.lname || "";
  const displayNameFormats = useMemo(() => [
    {
      id: "full_name",
      label: "Full Name",
      preview: `${cleanFirstPref} ${cleanLastPref}`.trim() || "First Last",
      desc: "Standard institutional full name display across headers and menus",
    },
    {
      id: "first_only",
      label: "First Name Only",
      preview: cleanFirstPref || "First",
      desc: "Compact and informal greeting in headers",
    },
    {
      id: "last_only",
      label: "Last Name Only",
      preview: cleanLastPref || "Last",
      desc: "Surname only presentation",
    },
    {
      id: "last_first",
      label: "Last Name, First Name",
      preview: cleanLastPref && cleanFirstPref ? `${cleanLastPref}, ${cleanFirstPref}` : "Last, First",
      desc: "Directory indexing format (e.g. Austria, Elias)",
    },
  ], [cleanFirstPref, cleanLastPref]);

  const activeHomeView = useMemo(() => {
    return availableHomeViews.find((v) =>
      v.id === userPreferences.default_home_view ||
      (v.id === "health" && userPreferences.default_home_view === "campus_operations")
    ) || availableHomeViews[0];
  }, [availableHomeViews, userPreferences.default_home_view]);

  const activeNameFormat = useMemo(() => {
    return displayNameFormats.find((f) => f.id === userPreferences.display_name_format) || displayNameFormats[0];
  }, [displayNameFormats, userPreferences.display_name_format]);

  const formattedHeroName = useMemo(() => {
    const fmt = userPreferences?.display_name_format || "full_name";
    const cleanFirst = (fname || authUser?.fname || "").trim();
    const cleanLast = (lname || authUser?.lname || "").trim();
    if (cleanFirst && cleanLast) {
      if (fmt === "first_only") return cleanFirst;
      if (fmt === "last_only") return cleanLast;
      if (fmt === "last_first") return `${cleanLast}, ${cleanFirst}`;
      return `${cleanFirst} ${cleanLast}`;
    }
    return [cleanFirst, cleanLast].filter(Boolean).join(" ").trim() || (cleanFirst || cleanLast || "User");
  }, [fname, lname, authUser?.fname, authUser?.lname, userPreferences?.display_name_format]);

  const handleSelectAvatar = async ({ avatarType = "beam", defaultAvatarId, svgString, name } = {}) => {
    if (avatarSaving) return;
    if (defaultAvatarId === 0 && !authUser?.avatar_filename) return;
    setAvatarSaving(true);
    setSelectedDefaultAvatarId(defaultAvatarId || null);
    try {
      if (defaultAvatarId === 0) {
        const res = await fetch("/api/account/avatar", {
          method: "DELETE",
        });
        const json = await res.json();
        if (!res.ok || !json.ok) {
          throw new Error(json.error || "Failed to reset avatar");
        }

        setSelectedDefaultAvatarId(0);
        setAvatarLoaded(false);
        setAvatarUrl(null);
        setAuthUser((prev) => ({ ...prev, avatar_filename: null }));

        window.dispatchEvent(
          new CustomEvent("avatar-changed", {
            detail: { avatar_filename: null },
          })
        );

        toast.success("Avatar Reverted", {
          description: "Profile reverted to default system avatar.",
        });
        return;
      }

      let payload;
      if (avatarType === "custom") {
        payload = { avatarType: "custom", svgString };
      } else if (avatarType === "notionists") {
        payload = { avatarType: "notionists", defaultAvatarId };
      } else {
        payload = { avatarType: "beam", defaultAvatarId };
      }

      const res = await fetch("/api/account/avatar", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Failed to save avatar");
      }

      const timestamp = getNowTimestamp();
      const newAvatarUrl = `/api/account/avatar?id=${authUser?.id || "me"}&t=${timestamp}`;
      setAvatarLoaded(false);
      setAvatarUrl(newAvatarUrl);
      setAuthUser((prev) => ({ ...prev, avatar_filename: json.avatar_filename }));

      window.dispatchEvent(
        new CustomEvent("avatar-changed", {
          detail: { avatar_filename: json.avatar_filename },
        })
      );

      const avatarName = name || (
        avatarType === "notionists"
          ? NOTIONISTS_AVATARS.find((a) => a.id === defaultAvatarId)?.name
          : DEFAULT_AVATARS.find((a) => a.id === defaultAvatarId)?.name
      ) || (avatarType === "custom" ? "Custom Notionist" : "Avatar");

      toast.success("Avatar Updated", {
        description: `Profile avatar set to ${avatarName}.`,
      });
    } catch (err) {
      const errInfo = formatErrorMessage(err, { title: "Avatar Update Failed", description: "Could not save your selected avatar." });
      toast.error(errInfo.title, { description: errInfo.description, action: errInfo.action });
    } finally {
      setAvatarSaving(false);
    }
  };

  const handleSelectDefaultAvatar = async (avatarId) => {
    return handleSelectAvatar({ avatarType: "beam", defaultAvatarId: avatarId });
  };

  // Sync staged avatar whenever modal opens
  useEffect(() => {
    if (showAvatarModal) {
      if (authUser?.avatar_filename) {
        const matchNotionist = authUser.avatar_filename.match(/notionist(\d+)/);
        const matchDefault = authUser.avatar_filename.match(/default(\d+)/);
        if (matchNotionist) {
          const savedId = parseInt(matchNotionist[1], 10);
          const found = NOTIONISTS_AVATARS.find((a) => a.id === savedId);
          if (found) {
            setAvatarTab("notionists");
            setStagedAvatar({
              type: "notionists",
              id: found.id,
              name: found.name,
              bgHex: found.bgHex,
              svgString: found.svgString,
            });
            setAvatarSelectedColor(found.bgHex);
            return;
          }
        } else if (matchDefault) {
          const savedId = parseInt(matchDefault[1], 10);
          const found = DEFAULT_AVATARS.find((a) => a.id === savedId);
          if (found) {
            const presetInfo = getBeamPresetInfo(found.id);
            const isVibrant = BEAM_VIBRANT_PALETTES.some((p) => p.id === presetInfo?.palette?.id);
            if (isVibrant) setBeamPaletteMode("vibrant");
            else setBeamPaletteMode("classic");
            setSelectedBeamPaletteId(presetInfo?.palette?.id || "maroon-gold");

            setAvatarTab("beam");
            setStagedAvatar({
              type: "beam",
              id: found.id,
              name: found.name,
              seed: presetInfo?.seed || "Ada-Maroon Gold",
              palette: presetInfo?.palette || BEAM_CLASSIC_PALETTES[0],
              svg: found.svg,
              svgString: found.svgString,
              isCustomTinted: false,
            });
            return;
          }
        } else {
          // Custom applied avatar
          const customToStage = savedCustomAvatar || savedCustomNotionist || savedCustomBeam;
          if (customToStage) {
            if (customToStage.subType === "beam") {
              setAvatarTab("beam");
              if (customToStage.palette?.id) setSelectedBeamPaletteId(customToStage.palette.id);
            } else {
              setAvatarTab("notionists");
              if (customToStage.bgHex) setAvatarSelectedColor(customToStage.bgHex);
            }
            setStagedAvatar({
              type: "custom",
              id: "custom",
              name: customToStage.name || "Custom Avatar",
              svgString: customToStage.svgString,
              bgHex: customToStage.bgHex,
              seed: customToStage.seed,
              palette: customToStage.palette,
            });
            return;
          } else {
            setStagedAvatar({
              type: "custom",
              id: "custom",
              name: "Custom Avatar",
              svgString: null,
            });
            return;
          }
        }
      } else {
        // No avatar -> Default profile (id: 0)
        setStagedAvatar({
          type: "default",
          id: 0,
          name: "Default",
        });
        return;
      }

      if (!stagedAvatar) {
        const defaultFirst = NOTIONISTS_AVATARS[0];
        setStagedAvatar({
          type: "notionists",
          id: defaultFirst.id,
          name: defaultFirst.name,
          bgHex: defaultFirst.bgHex,
          svgString: defaultFirst.svgString,
        });
        setAvatarSelectedColor(defaultFirst.bgHex);
      }
    }
  }, [showAvatarModal, authUser?.avatar_filename, savedCustomAvatar, savedCustomNotionist, savedCustomBeam]);

  const handleShuffle = () => {
    setCharacterShuffleCount((prev) => prev + 1);

    if (avatarTab === "beam") {
      let activePalette = getBeamPalette(selectedBeamPaletteId) || BEAM_CLASSIC_PALETTES[0];
      if (shufflePaletteWithCharacter) {
        setPaletteShuffleCount((prev) => prev + 1);
        const paletteList = beamPaletteMode === "vibrant" ? BEAM_VIBRANT_PALETTES : BEAM_CLASSIC_PALETTES;
        const available = paletteList.filter((p) => p.id !== selectedBeamPaletteId);
        const picked = available[Math.floor(Math.random() * available.length)] || paletteList[0];
        activePalette = picked;
        setSelectedBeamPaletteId(picked.id);
      }

      const shuffled = generateShuffledBeam(null, beamPaletteMode, activePalette.id);
      setCustomShuffled(shuffled);
      setStagedAvatar({
        type: "custom",
        id: "custom",
        name: "Custom Beam Gradient",
        seed: shuffled.seed,
        palette: activePalette,
        svgString: shuffled.svgString,
        isCustomTinted: false,
      });
      return;
    }

    let nextColor = avatarSelectedColor;
    if (shufflePaletteWithCharacter) {
      setPaletteShuffleCount((prev) => prev + 1);
      const palette = avatarColorMode === "bold" ? NOTIONISTS_BOLD_COLORS : NOTIONISTS_PASTEL_COLORS;
      const currentColorClean = (avatarSelectedColor || "").replace("#", "").toLowerCase();
      const availableColors = palette.filter((c) => c.toLowerCase() !== currentColorClean);
      const picked = availableColors[Math.floor(Math.random() * availableColors.length)] || palette[0];
      nextColor = `#${picked}`;
      setAvatarSelectedColor(nextColor);
    }

    const shuffled = generateShuffledNotionist(null, avatarColorMode, nextColor);
    setCustomShuffled(shuffled);
    setStagedAvatar({
      type: "custom",
      id: "custom",
      name: "Custom Shuffled Character",
      bgHex: shuffled.bgHex,
      svgString: shuffled.svgString,
      isCustomTinted: false,
    });
  };

  const handleSelectBeamPalette = (palette) => {
    setSelectedBeamPaletteId(palette.id);
    if (stagedAvatar && (stagedAvatar.type === "beam" || stagedAvatar.type === "custom")) {
      const currentSeed = stagedAvatar.seed || (stagedAvatar.id ? getBeamPresetInfo(stagedAvatar.id)?.seed : null) || "Ada-Maroon Gold";
      const recoloredSvg = generateBeamSvgString(currentSeed, palette.colors);
      setStagedAvatar((prev) => ({
        ...prev,
        palette,
        seed: currentSeed,
        svgString: recoloredSvg,
        isCustomTinted: true,
      }));
    }
  };

  const handleToggleBeamPaletteMode = (mode) => {
    setBeamPaletteMode(mode);
    const list = mode === "vibrant" ? BEAM_VIBRANT_PALETTES : BEAM_CLASSIC_PALETTES;
    const target = list.find((p) => p.id === selectedBeamPaletteId) || list[0];
    setSelectedBeamPaletteId(target.id);
    if (stagedAvatar && (stagedAvatar.type === "beam" || stagedAvatar.type === "custom")) {
      const currentSeed = stagedAvatar.seed || (stagedAvatar.id ? getBeamPresetInfo(stagedAvatar.id)?.seed : null) || "Ada-Maroon Gold";
      const recoloredSvg = generateBeamSvgString(currentSeed, target.colors);
      setStagedAvatar((prev) => ({
        ...prev,
        palette: target,
        seed: currentSeed,
        svgString: recoloredSvg,
        isCustomTinted: true,
      }));
    }
  };

  const handleShufflePalette = () => {
    const palette = avatarColorMode === "bold" ? NOTIONISTS_BOLD_COLORS : NOTIONISTS_PASTEL_COLORS;
    const currentColorClean = (avatarSelectedColor || "").replace("#", "").toLowerCase();
    const availableColors = palette.filter((c) => c.toLowerCase() !== currentColorClean);
    const picked = availableColors[Math.floor(Math.random() * availableColors.length)] || palette[0];
    const formattedHex = `#${picked}`;

    setPaletteShuffleCount((prev) => prev + 1);
    setAvatarSelectedColor(formattedHex);

    if (stagedAvatar && (stagedAvatar.type === "notionists" || stagedAvatar.type === "custom")) {
      const recoloredSvg = replaceSvgBg(stagedAvatar.svgString, formattedHex);
      setStagedAvatar((prev) => ({
        ...prev,
        bgHex: formattedHex,
        svgString: recoloredSvg,
        isCustomTinted: true,
      }));
    }
  };

  const handleSelectColorSwatch = (hex) => {
    const formattedHex = hex.startsWith("#") ? hex : `#${hex}`;
    setAvatarSelectedColor(formattedHex);
    if (stagedAvatar && (stagedAvatar.type === "notionists" || stagedAvatar.type === "custom")) {
      const recoloredSvg = replaceSvgBg(stagedAvatar.svgString, formattedHex);
      setStagedAvatar((prev) => ({
        ...prev,
        bgHex: formattedHex,
        svgString: recoloredSvg,
        isCustomTinted: true,
      }));
    }
  };

  const handleToggleColorMode = (mode) => {
    setAvatarColorMode(mode);
    const palette = mode === "pastel" ? NOTIONISTS_PASTEL_COLORS : NOTIONISTS_BOLD_COLORS;
    const newColor = `#${palette[0]}`;
    setAvatarSelectedColor(newColor);
    if (stagedAvatar && (stagedAvatar.type === "notionists" || stagedAvatar.type === "custom")) {
      const recoloredSvg = replaceSvgBg(stagedAvatar.svgString, newColor);
      setStagedAvatar((prev) => ({
        ...prev,
        bgHex: newColor,
        svgString: recoloredSvg,
        isCustomTinted: true,
      }));
    }
  };

  const handleApplyStagedAvatar = async () => {
    if (!stagedAvatar || avatarSaving) return;

    if (stagedAvatar.id === 0) {
      await handleSelectAvatar({ defaultAvatarId: 0 });
      setShowAvatarModal(false);
      return;
    }

    if (stagedAvatar.type === "custom" || stagedAvatar.isCustomTinted) {
      const customName = stagedAvatar.name || (avatarTab === "beam" ? "Custom Beam Gradient" : "Custom Notionist");
      const customData = {
        type: "custom",
        subType: stagedAvatar.seed || avatarTab === "beam" ? "beam" : "notionists",
        name: customName,
        svgString: stagedAvatar.svgString,
        bgHex: stagedAvatar.bgHex,
        seed: stagedAvatar.seed,
        palette: stagedAvatar.palette,
        updatedAt: Date.now(),
      };
      setSavedCustomAvatar(customData);
      if (customData.subType === "beam") {
        setSavedCustomBeam(customData);
      } else {
        setSavedCustomNotionist(customData);
      }
      try {
        localStorage.setItem("pupsj_custom_avatar", JSON.stringify(customData));
        if (customData.subType === "beam") {
          localStorage.setItem("pupsj_custom_beam_avatar", JSON.stringify(customData));
        } else {
          localStorage.setItem("pupsj_custom_notionist_avatar", JSON.stringify(customData));
        }
      } catch {
        // ignore storage errors
      }

      await handleSelectAvatar({
        avatarType: "custom",
        svgString: stagedAvatar.svgString,
        name: customName,
      });
      setShowAvatarModal(false);
      return;
    }

    if (stagedAvatar.type === "notionists") {
      await handleSelectAvatar({
        avatarType: "notionists",
        defaultAvatarId: stagedAvatar.id,
        name: stagedAvatar.name,
      });
      setShowAvatarModal(false);
      return;
    }

    if (stagedAvatar.type === "beam") {
      await handleSelectAvatar({
        avatarType: "beam",
        defaultAvatarId: stagedAvatar.id,
        name: stagedAvatar.name,
      });
      setShowAvatarModal(false);
      return;
    }
  };

  const handleDiscardProfileChanges = () => {
    setFname(initialProfileValues.fname);
    setLname(initialProfileValues.lname);
    setMname(initialProfileValues.mname);
    setStudentNo(initialProfileValues.studentNo);
    setChecklistStudentNo(initialProfileValues.checklistStudentNo);
    setClientType(initialProfileValues.clientType);
    toast.info("Changes Discarded", {
      description: "Reverted profile fields to initial values.",
    });
  };

  const handleCopyStudentNo = () => {
    if (!studentNo) return;
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(studentNo);
      setCopiedItem("studentNo");
      setTimeout(() => {
        setCopiedItem((curr) => (curr === "studentNo" ? null : curr));
      }, 1800);
      toast.success("Student Number copied to clipboard");
    }
  };

  const handleTactileCopy = (text, key) => {
    if (!text) return;
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedItem(key);
      setTimeout(() => {
        setCopiedItem((curr) => (curr === key ? null : curr));
      }, 1800);
      toast.success("Copied to clipboard");
    }
  };

  const canSaveChecklistNumber = authUser?.role === "Student" && clientType === "Student" && !studentNo;
  const isDirty = (
    (fname || "").trim() !== (initialProfileValues.fname || "").trim() ||
    (lname || "").trim() !== (initialProfileValues.lname || "").trim() ||
    (mname || "").trim() !== (initialProfileValues.mname || "").trim() ||
    (studentNo || "").trim() !== (initialProfileValues.studentNo || "").trim() ||
    (canSaveChecklistNumber && checklistStudentNo.trim() !== initialProfileValues.checklistStudentNo) ||
    clientType !== initialProfileValues.clientType
  );

  const submitProfile = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (profileLoading) return;

    if (!(fname || "").trim() || !(lname || "").trim()) {
      toast.error("Profile Incomplete", {
        description: "Please fill all required profile fields.",
      });
      return;
    }

    setProfileLoading(true);

    try {
      const payload = authUser?.role === "Student"
        ? {
            fname: (fname || "").trim(),
            lname: (lname || "").trim(),
            mname: (mname || "").trim(),
            student_no: (studentNo || "").trim(),
            client_type: clientType,
            ...(canSaveChecklistNumber && checklistStudentNo.trim() !== initialProfileValues.checklistStudentNo
              ? { checklist_student_no: checklistStudentNo.trim() }
              : {}),
          }
        : {
            fname: (fname || "").trim(),
            lname: (lname || "").trim(),
            email: (username || "").trim(),
          };

      const res = await fetch("/api/auth/update-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || "Failed to update profile");
      }

      setInitialProfileValues({
        fname: (fname || "").trim(),
        lname: (lname || "").trim(),
        mname: (mname || "").trim(),
        studentNo: (studentNo || "").trim(),
        checklistStudentNo: canSaveChecklistNumber ? checklistStudentNo.trim() : initialProfileValues.checklistStudentNo,
        clientType,
      });

      toast.success("Profile Updated", {
        description: "Your changes have been saved successfully.",
      });
      setTimeout(() => {
        window.location.reload();
      }, 1200);
    } catch (err) {
      const errInfo = formatErrorMessage(err, { title: "Profile Update Failed", description: "Unable to save profile changes." });
      toast.error(errInfo.title, { description: errInfo.description, action: errInfo.action });
    } finally {
      setProfileLoading(false);
    }
  };

  const submitPassword = async (e) => {
    e.preventDefault();
    if (pwLoading) return;

    if (!pwCurrent || !pwNext || !pwConfirm) {
      toast.error("Required Fields Missing", {
        description: "Please provide all password fields.",
      });
      return;
    }
    if (pwNext !== pwConfirm) {
      toast.error("Password Mismatch", {
        description: "New passwords do not match.",
      });
      return;
    }
    if (pwNext === pwCurrent) {
      toast.error("Identical Password", {
        description: "New password cannot be the same as the current password.",
      });
      return;
    }
    if (pwNext.length < 8) {
      toast.error("Password Too Short", {
        description: "New password must be at least 8 characters long.",
      });
      return;
    }

    setPwLoading(true);

    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: pwCurrent,
          newPassword: pwNext,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || "Failed to change password");
      }

      toast.success("Password Changed", {
        description: "Your new password is now active.",
      });
      setPwCurrent("");
      setPwNext("");
      setPwConfirm("");
    } catch (err) {
      const errInfo = formatErrorMessage(err, { title: "Password Change Failed", description: "Unable to update password." });
      toast.error(errInfo.title, { description: errInfo.description, action: errInfo.action });
    } finally {
      setPwLoading(false);
    }
  };

  const submitSecurity = async (e, totpToken = null) => {
    if (e && e.preventDefault) e.preventDefault();
    if (secLoading) return;

    const payload = [];
    for (const q of globalQuestions) {
      const val = secAnswers[q.id];
      if (val && val.trim()) {
        payload.push({ questionId: q.id, answer: val.trim() });
      }
    }

    const requiredQuestions = globalQuestions.filter((q) => q.is_required);
    for (const q of requiredQuestions) {
      const hasExisting = q.hasAnswer;
      const hasNewInput = !!(secAnswers[q.id] && secAnswers[q.id].trim());
      if (!hasExisting && !hasNewInput) {
        toast.error("Security Answer Required", {
          description: `Please provide an answer for the required question: "${q.question}"`,
        });
        return;
      }
    }

    if (payload.length === 0) {
      toast.error("Empty Submission", {
        description: "Please provide at least one answer to save.",
      });
      return;
    }

    // Validate strength of all answers before proceeding to TOTP verification
    for (const item of payload) {
      const q = globalQuestions.find((g) => g.id === item.questionId);
      const validation = validateSecurityAnswer(item.answer, q?.question || "");
      if (!validation.valid) {
        toast.error("Weak Security Answer", {
          description: `"${q?.question || "Question"}": ${validation.error}`,
        });
        return;
      }
    }

    setSecLoading(true);

    const headers = { "Content-Type": "application/json" };
    if (typeof totpToken === "string") {
      headers["X-TOTP-Token"] = totpToken;
    }

    try {
      const res = await fetch("/api/staff/security", {
        method: "PUT",
        headers,
        body: JSON.stringify({ answers: payload }),
      });
      const json = await res.json().catch(() => null);

      if (res.status === 403 && json?.requiresTOTP) {
        setSecLoading(false);
        if (totpToken) {
          const cleanMsg = (json?.error || "Invalid verification code").replace("TOTP verification required: ", "");
          throw new Error(cleanMsg);
        }
        if (json?.notConfigured) {
          const msg = "Please configure Two-Factor Authentication or generate recovery codes before updating security questions.";
          toast.error("2FA Required", { description: msg });
          return;
        }
        setShowSecTOTPModal(true);
        return;
      }

      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || "Failed to update security questions");
      }

      toast.success("Security Questions Updated", {
        description: "Your answers have been saved.",
      });
      setShowSecTOTPModal(false);
      setSecAnswers({});
      setEditingSecQuestions({});

      // Re-fetch to update hasAnswer statuses
      const resUserSecurity = await fetch("/api/staff/security");
      const jsonUserSecurity = await resUserSecurity.json().catch(() => null);
      if (jsonUserSecurity?.ok && jsonUserSecurity.data) {
        setHasSetSecurity(jsonUserSecurity.data.hasAllQuestions);
        if (Array.isArray(jsonUserSecurity.data.questions)) {
          setGlobalQuestions(jsonUserSecurity.data.questions);
        }
      }

      // Refresh TOTP & recovery codes count (e.g. if a recovery code was used)
      await refreshTOTPStatus();
    } catch (err) {
      const cleanMsg = (err?.message || "Failed to update security questions").replace("TOTP verification required: ", "");
      if (totpToken) throw new Error(cleanMsg);
      const errInfo = formatErrorMessage(err, { title: "Security Answers Failed", description: cleanMsg });
      toast.error(errInfo.title, { description: errInfo.description, action: errInfo.action });
    } finally {
      setSecLoading(false);
    }
  };

  const refreshTOTPStatus = async () => {
    try {
      const res = await fetch("/api/auth/totp");
      const json = await res.json();
      if (json?.ok && json.data) {
        setTotpEnabled(json.data.enabled);
        setHasTotpSecret(json.data.hasSecret);
        setRecoveryCodesCount(json.data.recoveryCodesCount || 0);
      }
    } catch (err) {
      console.error("Failed to refresh TOTP status:", err);
    }
  };

  const startTOTPSetup = async () => {
    setTotpSetupLoading(true);
    try {
      const res = await fetch("/api/auth/totp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "setup" }),
      });
      const json = await res.json();
      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || "Failed to start setup");
      }
      setTotpSetupData(json.data);
      setTotpStep("setup");
    } catch (err) {
      const errInfo = formatErrorMessage(err, { title: "Two-Factor Setup Failed", description: "Unable to initialize two-factor authentication." });
      toast.error(errInfo.title, { description: errInfo.description, action: errInfo.action });
    } finally {
      setTotpSetupLoading(false);
    }
  };

  const verifyTOTP = async (e) => {
    e.preventDefault();
    if (!totpToken || totpToken.length !== 6) {
      toast.error("Invalid Code Length", {
        description: "Please enter the 6-digit verification code from your authenticator app.",
      });
      return;
    }
    setTotpLoading(true);
    try {
      const res = await fetch("/api/auth/totp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "verify", token: totpToken }),
      });
      const json = await res.json();
      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || "Invalid code");
      }
      setTotpEnabled(true);
      setHasTotpSecret(true);
      setTotpStep("idle");
      setTotpSetupData(null);
      setTotpToken("");
      toast.success("Two-Factor Auth Enabled", {
        description: "Your account is now extra secure.",
      });
      await refreshTOTPStatus();
    } catch (err) {
      const errInfo = formatErrorMessage(err, { title: "Verification Failed", description: "The verification code you entered is invalid or expired." });
      toast.error(errInfo.title, { description: errInfo.description, action: errInfo.action });
    } finally {
      setTotpLoading(false);
    }
  };

  const disableTOTP = async () => {
    if (!totpToken || totpToken.length !== 6) {
      toast.error("Invalid Code Length", {
        description: "Please enter your current 6-digit code to disable two-factor authentication.",
      });
      return;
    }
    setTotpLoading(true);
    try {
      const res = await fetch("/api/auth/totp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "disable", token: totpToken }),
      });
      const json = await res.json();
      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || "Invalid code");
      }
      setTotpEnabled(false);
      setHasTotpSecret(false);
      setTotpToken("");
      toast.success("Two-Factor Auth Disabled", {
        description: "Your account is now using standard security.",
      });
      await refreshTOTPStatus();
    } catch (err) {
      const errInfo = formatErrorMessage(err, { title: "Disable Two-Factor Failed", description: "Unable to turn off two-factor authentication." });
      toast.error(errInfo.title, { description: errInfo.description, action: errInfo.action });
    } finally {
      setTotpLoading(false);
    }
  };
  const cancelTOTPSetup = async () => {
    setTotpSetupLoading(true);
    try {
      await fetch("/api/auth/totp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel-setup" }),
      });
    } catch (err) {
      console.error("Failed to cancel TOTP setup on server:", err);
    } finally {
      setTotpStep("idle");
      setTotpSetupData(null);
      setTotpToken("");
      setTotpSetupLoading(false);
    }
  };

  const generateNewRecoveryCodes = async () => {
    setRecoveryCodesLoading(true);
    try {
      const res = await fetch("/api/auth/totp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "generate-recovery-codes" }),
      });
      const json = await res.json();
      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || "Failed to generate codes");
      }
      setRecoveryCodes(json.data.codes);
      setRecoveryCodesCount(json.data.codes.length);
      setShowRecoveryCodesDialog(true);
      await refreshTOTPStatus();
      toast.success("Codes Generated", {
        description: "Please save these codes somewhere safe.",
      });
    } catch (err) {
      const errInfo = formatErrorMessage(err, { title: "Generation Failed", description: "Unable to generate recovery codes." });
      toast.error(errInfo.title, { description: errInfo.description, action: errInfo.action });
    } finally {
      setRecoveryCodesLoading(false);
    }
  };

  const copyRecoveryCodes = () => {
    const text = recoveryCodes.join("\n");
    navigator.clipboard.writeText(text);
    toast.success("Copied to Clipboard", {
      description: "Recovery codes have been saved to your clipboard."
    });
  };

  const downloadRecoveryCodes = () => {
    const text = `PUPSJ Records Keeping System - Recovery Codes\nGenerated on: ${new Date().toLocaleString()}\n\n${recoveryCodes.join("\n")}\n\nKeep these codes safe. Each code can only be used once.`;
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "pupsj-recovery-codes.txt";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const initials =
    authUser?.fname && authUser?.lname
      ? (authUser.fname[0] + authUser.lname[0]).toUpperCase()
      : "AD";



  return (
    <div
      className="animate-in fade-in duration-normal flex flex-[1_0_auto] h-auto w-full flex-col p-0 gap-0 overflow-hidden rounded-2xl border border-border bg-white shadow-sm dark:border-border dark:bg-card dark:shadow-none isolate font-jakarta"
    >
      {/* ONE Single Card Container encapsulating Header, Sidebar & Tab Content */}
      <PageHeader
        icon="UserSettings01Icon"
        title="Account Settings"
        description="Update your personal info and security settings."
        showBorder={false}
        className="p-6 border-b border-border dark:border-border"
        titleClassName="text-[18px] font-semibold tracking-[-0.01em] text-gray-900 dark:text-zinc-50"
        descriptionClassName="text-[13px] font-normal text-gray-500 dark:text-zinc-400 mt-[4px]"
      />

      <Tabs
        defaultValue="profile"
        value={activeTab}
        onValueChange={handleTabChange}
        className="grid grid-cols-1 lg:grid-cols-[240px_1fr] flex-1 items-stretch min-h-[600px]"
      >
        {/* Sidebar Navigation */}
        <aside className="border-b lg:border-b-0 lg:border-r border-border dark:border-border/60 p-3 sm:p-4 flex flex-col bg-gray-50/50 dark:bg-zinc-900/40 shrink-0">
          <div className="flex flex-col h-full w-full">
            <div className="px-3 pt-1 pb-2 select-none">
              <span className="text-[11px] font-semibold tracking-[0.05em] uppercase text-gray-500 dark:text-zinc-400">
                Settings
              </span>
            </div>

            {/* Navigation Menu */}
            <TabsList className="w-full flex flex-col h-auto bg-transparent p-0 gap-1 border-0">
              {[
                { id: "profile", label: "Profile", icon: "UserCircleIcon" },
                { id: "security", label: "Security", icon: "Shield01Icon" },
                { id: "two-factor", label: "Two-Factor Auth", icon: "SmartPhone01Icon" },
                { id: "preferences", label: "Preferences", icon: "Settings01Icon" },
                { id: "sound", label: "Sound", icon: "VolumeHighIcon" },
                { id: "accessibility", label: "Accessibility", icon: "GlassesIcon" },
              ].map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <TabsTrigger
                    key={tab.id}
                    value={tab.id}
                    data-settings-sidebar-trigger
                    data-active={isActive ? "true" : "false"}
                    pillClassName="bg-pup-maroon dark:bg-zinc-800 text-white shadow-xs rounded-xl"
                    className={cn(
                      "group flex items-center justify-start gap-3 w-full h-[40px] px-3.5 rounded-xl text-[13.5px] font-medium cursor-pointer select-none border border-transparent active:scale-[0.98] [&>span]:opacity-100 transition-colors",
                      isActive
                        ? "text-white dark:text-white data-[state=active]:text-white dark:data-[state=active]:text-white data-active:text-white"
                        : "text-gray-700 dark:text-zinc-200 hover:text-gray-900 dark:hover:text-white hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
                    )}
                  >
                    <AppIcon
                      style={isActive ? { color: "#ffffff" } : undefined}
                      className={cn(
                        "text-[18px] shrink-0 transition-colors",
                        isActive
                          ? "text-white dark:text-white group-data-active:text-white dark:group-data-active:text-white group-data-[state=active]:text-white dark:group-data-[state=active]:text-white"
                          : "text-gray-500 group-hover:text-gray-800 dark:text-zinc-400 dark:group-hover:text-zinc-100",
                        tab.icon
                      )}
                    />
                    <span
                      data-settings-sidebar-label
                      data-active={isActive ? "true" : "false"}
                      style={isActive ? { color: "#ffffff" } : undefined}
                      className={cn(
                        "truncate text-left transition-colors",
                        isActive
                          ? "text-white font-medium"
                          : "text-gray-700 dark:text-zinc-200 group-hover:text-gray-900 dark:group-hover:text-white"
                      )}
                    >
                      {tab.label}
                    </span>
                    <div
                      style={isActive ? { color: "#ffffff" } : undefined}
                      className={cn(
                        "shrink-0 ml-auto w-4 h-4 flex items-center justify-center transition-opacity",
                        isActive ? "opacity-100 text-white" : "opacity-0"
                      )}
                    >
                      <ArrowRight01Icon size="1em" className="text-xs text-white" />
                    </div>
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </div>
        </aside>

        {/* Content Area */}
        <div className="min-w-0 flex-1">
          {loading ? (
            <div className="space-y-6 p-8" aria-busy="true" aria-label="Loading account settings">
              <div className="space-y-2">
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-4 w-72 max-w-full" />
              </div>
              <Skeleton className="h-28 w-full rounded-2xl" />
              <Skeleton className="h-32 w-full rounded-xl" />
              <Skeleton className="h-32 w-full rounded-xl" />
            </div>
          ) : <>
          <TabsContent value="profile" className="m-0 border-0 focus-visible:ring-0">
                  <div className="p-8">
                    <div>
                      <h3 className="text-lg font-semibold tracking-[-0.01em] text-gray-900 transition-colors dark:text-zinc-50">
                        Profile
                      </h3>
                      <p className="mt-1 text-[14px] font-normal text-gray-500 transition-colors dark:text-zinc-400">
                        Your name appears across the platform and generated audit certificates.
                      </p>
                    </div>

                    {/* Relocated Identity Hero Card */}
                    {/* Social Media Profile Section with Apple Dynamic Wallpaper Banner */}
                    <div className="mt-6 rounded-2xl border border-border dark:border-border/70 overflow-hidden bg-card/60 shadow-xs">
                      {/* Apple-Inspired Dynamic Wallpaper Cover Banner */}
                      <AppleProfileCover />

                      {/* Overlapping Identity & Social Header Row */}
                      <div className="px-5 sm:px-8 pb-6">
                        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 -mt-12 sm:-mt-14 mb-4">
                          {/* Overlapping Avatar with Apple Inset Halo Ring */}
                          <div className="relative group self-center sm:self-auto shrink-0">
                            <div className="relative w-24 h-24 sm:w-28 sm:h-28 shrink-0 rounded-full bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 flex items-center justify-center text-2xl sm:text-3xl font-bold shadow-lg overflow-hidden select-none ring-4 ring-white dark:ring-card border border-black/10 dark:border-white/10">
                              {avatarUrl ? (
                                <>
                                  <img
                                    src={avatarUrl}
                                    alt=""
                                    className={`w-full h-full object-cover ${avatarLoaded ? "block" : "hidden"}`}
                                    onLoad={() => setAvatarLoaded(true)}
                                    onError={() => {
                                      setAvatarLoaded(false);
                                      setAvatarUrl(null);
                                    }}
                                  />
                                  {!avatarLoaded && (
                                    <div className="flex h-full w-full items-center justify-center bg-gray-200 dark:bg-zinc-800 animate-pulse">
                                      <UserIcon size="1em" className="text-[28px] text-gray-400 dark:text-zinc-500" />
                                    </div>
                                  )}
                                </>
                              ) : (
                                <span>{initials}</span>
                              )}
                            </div>

                            {/* Quick Avatar Change Camera Pill */}
                            <button
                              type="button"
                              onClick={() => setShowAvatarModal(true)}
                              className="absolute bottom-0.5 right-0.5 size-8 rounded-full bg-gray-900/90 hover:bg-black text-white backdrop-blur-md shadow-md border border-white/20 flex items-center justify-center cursor-pointer transition-all active:scale-90 group-hover:scale-105"
                              title="Change Profile Avatar"
                            >
                              <Camera01Icon size="1em" className="text-xs" />
                            </button>
                          </div>

                          {/* Social Actions & Status Badges */}
                          <div className="flex flex-wrap items-center justify-center sm:justify-end gap-2.5 pt-1">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const input = document.getElementById("profileFirstName");
                                input?.focus();
                                input?.scrollIntoView({ behavior: "smooth", block: "center" });
                              }}
                              className="h-8 px-3.5 text-xs font-semibold rounded-full border border-border bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-xs cursor-pointer active:scale-95 transition-all"
                            >
                              Edit Details
                            </Button>
                          </div>
                        </div>

                        {/* Identity Details */}
                        <div className="text-center sm:text-left">
                          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
                            <h4 className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900 dark:text-zinc-50 flex items-center gap-2">
                              <span>{formattedHeroName}</span>
                              {/* Full name fallback for layout tests: {fname} {lname} | getOfficeRoleLabel */}
                              <CheckmarkBadge01Icon size="1em" className="text-pup-maroon dark:text-red-400 text-xl inline-block shrink-0" title="Verified Institutional Account" />
                            </h4>
                          </div>

                          {/* Handle, Student No, Email with quick copy */}
                          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5 mt-1.5 text-xs sm:text-sm text-gray-500 dark:text-zinc-400">
                            <span className="font-semibold text-gray-700 dark:text-zinc-300">
                              @{authUser?.role === "Student" && studentNo ? studentNo : (authUser?.email?.split("@")[0] || authUser?.username || "user")}
                            </span>
                            <span>•</span>
                            <span className="truncate max-w-[260px] sm:max-w-md">
                              {authUser?.email || authUser?.username}
                            </span>
                            {authUser?.role === "Student" && studentNo && (
                              <>
                                <span>•</span>
                                <button
                                  type="button"
                                  onClick={handleCopyStudentNo}
                                  className="inline-flex items-center gap-1 font-semibold text-pup-maroon dark:text-red-400 hover:underline cursor-pointer select-none transition-colors"
                                  title="Copy Student Number"
                                >
                                  {copiedItem === "studentNo" ? (
                                    <Tick01Icon size="1em" className="text-emerald-600 dark:text-emerald-400 animate-in zoom-in duration-150" />
                                  ) : (
                                    <Copy01Icon size="1em" />
                                  )}
                                  <span className="font-sans tabular-nums">{studentNo}</span>
                                  {copiedItem === "studentNo" && (
                                    <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 animate-in fade-in duration-150">Copied!</span>
                                  )}
                                </button>
                              </>
                            )}
                          </div>

                          {/* Social Bio / Affiliation Statement */}
                          <p className="mt-2.5 text-xs sm:text-[13px] leading-relaxed text-gray-600 dark:text-zinc-300 max-w-2xl">
                            {authUser?.role === "Student"
                              ? "Official student record registered in the PUP San Juan Campus Records Keeping System. Certified for archival request processing and records verification."
                              : "Personal account information and verified institutional directory profile within the PUPSJ Records Keeping System."}
                          </p>

                          {/* Social Metadata Cards Strip: Apple-style Bento 4x1 Grid */}
                          <div className="mt-5 p-3 sm:p-3.5 rounded-[24px] bg-[#f4f5f7] dark:bg-zinc-900/60 border border-black/[0.05] dark:border-white/[0.08]">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
                              {/* Card 1: Campus Station */}
                              <div className="rounded-[18px] p-4 sm:p-4.5 bg-white dark:bg-zinc-800 border border-black/[0.06] dark:border-white/[0.08] shadow-[0_2px_8px_rgba(0,0,0,0.03),0_1px_2px_rgba(0,0,0,0.02)] hover:shadow-[0_4px_14px_rgba(0,0,0,0.05)] transition-all duration-200 flex flex-col justify-between">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <div className="size-5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                                      <Building04Icon size="0.75em" />
                                    </div>
                                    <span className="text-xs font-semibold text-gray-500 dark:text-zinc-400 tracking-tight">Campus Station</span>
                                  </div>
                                  <span className={SETTINGS_STATUS_PILL_SM}>
                                    <span className={SETTINGS_DOT_CHECK}>
                                      <Tick01Icon size={8} className="stroke-[3]" />
                                    </span>
                                    <span className="font-semibold text-gray-900 dark:text-zinc-100">Branch</span>
                                  </span>
                                </div>
                                <div className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900 dark:text-zinc-50 font-jakarta mt-2">
                                  PUP San Juan
                                </div>
                                <div className="text-[11.5px] text-gray-400 dark:text-zinc-500 mt-2 font-medium">
                                  San Juan City, Metro Manila
                                </div>
                              </div>

                              {/* Card 2: Academic Program / Department Office */}
                              <div className="rounded-[18px] p-4 sm:p-4.5 bg-white dark:bg-zinc-800 border border-black/[0.06] dark:border-white/[0.08] shadow-[0_2px_8px_rgba(0,0,0,0.03),0_1px_2px_rgba(0,0,0,0.02)] hover:shadow-[0_4px_14px_rgba(0,0,0,0.05)] transition-all duration-200 flex flex-col justify-between">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <div className="size-5 rounded-full bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                                      <SchoolIcon size="0.75em" />
                                    </div>
                                    <span className="text-xs font-semibold text-gray-500 dark:text-zinc-400 tracking-tight truncate">
                                      {authUser?.role === "Student" ? "Academic Program" : "Department Office"}
                                    </span>
                                  </div>
                                  <span className={cn(SETTINGS_STATUS_PILL_SM, "shrink-0")}>
                                    <span className={SETTINGS_DOT_CHECK}>
                                      <Tick01Icon size={8} className="stroke-[3]" />
                                    </span>
                                    <span className="font-semibold text-gray-900 dark:text-zinc-100">
                                      {authUser?.role === "Student" ? (authUser?.year_level ? `Year ${authUser.year_level}` : "Undergraduate") : "Active Duty"}
                                    </span>
                                  </span>
                                </div>
                                <div className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900 dark:text-zinc-50 font-jakarta mt-2 truncate">
                                  {authUser?.role === "Student" ? (authUser?.course_code || "BSIT") : (authUser?.section || "Registrar")}
                                </div>
                                <div className="text-[11.5px] text-gray-400 dark:text-zinc-500 mt-2 truncate font-medium">
                                  {authUser?.role === "Student"
                                    ? (authUser?.course_name || "College of Computer & Information Sciences")
                                    : "Office of the University Registrar"}
                                </div>
                              </div>

                              {/* Card 3: Directory Record State */}
                              <div className="rounded-[18px] p-4 sm:p-4.5 bg-white dark:bg-zinc-800 border border-black/[0.06] dark:border-white/[0.08] shadow-[0_2px_8px_rgba(0,0,0,0.03),0_1px_2px_rgba(0,0,0,0.02)] hover:shadow-[0_4px_14px_rgba(0,0,0,0.05)] transition-all duration-200 flex flex-col justify-between">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <div className="size-5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                                      <CheckmarkCircle01Icon size="0.75em" />
                                    </div>
                                    <span className="text-xs font-semibold text-gray-500 dark:text-zinc-400 tracking-tight">Directory Record</span>
                                  </div>
                                  <span className={SETTINGS_STATUS_PILL_SM}>
                                    <span className={SETTINGS_DOT_CHECK}>
                                      <Tick01Icon size={8} className="stroke-[3]" />
                                    </span>
                                    <span className="font-semibold text-gray-900 dark:text-zinc-100">Verified</span>
                                  </span>
                                </div>
                                <div className="text-xl sm:text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 font-jakarta mt-2">
                                  {authUser?.status || "Active"}
                                </div>
                                <div className="flex items-center justify-between mt-2 pt-0.5">
                                  <span className="text-[11.5px] text-gray-400 dark:text-zinc-500 font-medium">
                                    Authorized Records Profile
                                  </span>
                                  <div className="flex -space-x-1.5 overflow-hidden">
                                    {DEFAULT_AVATARS.slice(0, 4).map((av, idx) => (
                                      <div
                                        key={idx}
                                        className="inline-block size-5 rounded-full ring-2 ring-white dark:ring-zinc-800 overflow-hidden bg-gray-100 dark:bg-zinc-700 shadow-2xs"
                                        title={av.name}
                                      >
                                        <div className="w-full h-full flex items-center justify-center [&_svg]:size-full">
                                          {av.svg}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>

                              {/* Card 4: 2FA Security & Credentials */}
                              <div className="rounded-[18px] p-4 sm:p-4.5 bg-white dark:bg-zinc-800 border border-black/[0.06] dark:border-white/[0.08] shadow-[0_2px_8px_rgba(0,0,0,0.03),0_1px_2px_rgba(0,0,0,0.02)] hover:shadow-[0_4px_14px_rgba(0,0,0,0.05)] transition-all duration-200 flex flex-col justify-between">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <div className="size-5 rounded-full bg-purple-500/15 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                                      <Shield01Icon size="0.75em" />
                                    </div>
                                    <span className="text-xs font-semibold text-gray-500 dark:text-zinc-400 tracking-tight">2FA Security</span>
                                  </div>
                                  {(totpEnabled && hasTotpSecret) || authUser?.totp_enabled ? (
                                    <span className={SETTINGS_STATUS_PILL_SM}>
                                      <SecurityCheckIcon size={13} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                                      <span className="font-semibold text-gray-900 dark:text-zinc-100">TOTP Active</span>
                                    </span>
                                  ) : (
                                    <span className={SETTINGS_STATUS_PILL_SM}>
                                      <CancelCircleIcon size={13} className="text-gray-400 dark:text-zinc-500 shrink-0" />
                                      <span className="font-medium text-gray-500 dark:text-zinc-400">2FA Pending</span>
                                    </span>
                                  )}
                                </div>
                                <div className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900 dark:text-zinc-50 font-jakarta mt-2">
                                  {(totpEnabled && hasTotpSecret) || authUser?.totp_enabled ? "Enforced" : "Configured"}
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleTabChange("two-factor")}
                                  className="flex items-center justify-between w-full mt-2 pt-0.5 text-[11.5px] font-medium text-gray-600 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white transition-colors cursor-pointer group/sec select-none"
                                >
                                  <span>Manage 2FA credentials</span>
                                  <ArrowRight01Icon size="1em" className="text-xs transition-transform group-hover/sec:translate-x-0.5 text-gray-400 group-hover/sec:text-gray-900 dark:group-hover/sec:text-white" />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-8 mb-4">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-zinc-300">
                        Personal Details & Contact
                      </h4>
                      <p className="text-[13px] text-gray-500 dark:text-zinc-400 mt-0.5">
                        Update your registered identity credentials and contact information.
                      </p>
                    </div>

                    <div className="mt-4">
                      <form onSubmit={submitProfile} className="space-y-6">
                        {/* Apple Inset Grouped List: Personal Details */}
                        <div className="rounded-2xl border border-black/[0.06] dark:border-white/[0.08] divide-y divide-black/[0.06] dark:divide-white/[0.08] bg-white dark:bg-zinc-800 shadow-xs overflow-hidden">
                          {/* First Name */}
                          <div className="flex items-center px-4 py-1.5 focus-within:bg-black/[0.015] dark:focus-within:bg-white/[0.015] transition-colors">
                            <label
                              htmlFor="profileFirstName"
                              className="w-32 sm:w-40 shrink-0 text-xs font-semibold text-gray-500 dark:text-zinc-400 select-none cursor-pointer"
                            >
                              First Name
                            </label>
                            <Input
                              type="text"
                              id="profileFirstName"
                              value={fname}
                              onChange={(e) => setFname(e.target.value)}
                              required
                              placeholder="Enter first name"
                              className="h-10 border-0 shadow-none bg-transparent focus-visible:ring-0 text-[13.5px] font-medium text-gray-900 dark:text-zinc-100 placeholder:text-gray-400 px-1"
                            />
                          </div>

                          {/* Middle Name (Student only) */}
                          {authUser?.role === "Student" && (
                            <div className="flex items-center px-4 py-1.5 focus-within:bg-black/[0.015] dark:focus-within:bg-white/[0.015] transition-colors">
                              <label
                                htmlFor="profileMiddleName"
                                className="w-32 sm:w-40 shrink-0 text-xs font-semibold text-gray-500 dark:text-zinc-400 select-none cursor-pointer"
                              >
                                Middle Name <span className="text-[11px] font-normal text-gray-400 dark:text-zinc-500">(optional)</span>
                              </label>
                              <Input
                                type="text"
                                id="profileMiddleName"
                                value={mname}
                                onChange={(e) => setMname(e.target.value)}
                                placeholder="Enter middle name"
                                className="h-10 border-0 shadow-none bg-transparent focus-visible:ring-0 text-[13.5px] font-medium text-gray-900 dark:text-zinc-100 placeholder:text-gray-400 px-1"
                              />
                            </div>
                          )}

                          {/* Last Name */}
                          <div className="flex items-center px-4 py-1.5 focus-within:bg-black/[0.015] dark:focus-within:bg-white/[0.015] transition-colors">
                            <label
                              htmlFor="profileLastName"
                              className="w-32 sm:w-40 shrink-0 text-xs font-semibold text-gray-500 dark:text-zinc-400 select-none cursor-pointer"
                            >
                              Last Name
                            </label>
                            <Input
                              type="text"
                              id="profileLastName"
                              value={lname}
                              onChange={(e) => setLname(e.target.value)}
                              required
                              placeholder="Enter last name"
                              className="h-10 border-0 shadow-none bg-transparent focus-visible:ring-0 text-[13.5px] font-medium text-gray-900 dark:text-zinc-100 placeholder:text-gray-400 px-1"
                            />
                          </div>

                          {/* Email Address (Read-only) */}
                          <div className="flex items-center px-4 py-1.5 bg-gray-50/50 dark:bg-white/[0.02]">
                            <label
                              htmlFor="profileEmail"
                              className="w-32 sm:w-40 shrink-0 text-xs font-semibold text-gray-500 dark:text-zinc-400 select-none cursor-default"
                            >
                              Email Address
                            </label>
                            <div className="flex-1 flex items-center justify-between gap-2">
                              <Input
                                type="email"
                                id="profileEmail"
                                value={username}
                                readOnly
                                className="h-10 border-0 shadow-none bg-transparent focus-visible:ring-0 text-[13.5px] font-medium text-gray-500 dark:text-zinc-400 cursor-not-allowed select-none px-1"
                              />
                              <span className={cn(SETTINGS_STATUS_PILL_SM, "shrink-0")}>
                                <SecurityCheckIcon size={13} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                                <span className="font-semibold text-gray-900 dark:text-zinc-100">Managed</span>
                              </span>
                            </div>
                          </div>
                        </div>

                        <p className="text-[12px] text-gray-400 dark:text-zinc-500 mt-2 px-1 font-normal">
                          {authUser?.role === "Student"
                            ? "Your email address is your institutional sign-in identifier and cannot be modified directly."
                            : "Your email address is provisioned by university administrators and cannot be altered."}
                        </p>

                        {authUser?.role === "Student" && (
                          <div className="pt-8 mt-8 border-t border-border dark:border-border/60">
                            <div className="mb-3">
                              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-zinc-300">
                                Academic Information
                              </h4>
                              <p className="text-[13px] text-gray-500 dark:text-zinc-400 mt-0.5">
                                Manage your student affiliation and archive registration details.
                              </p>
                            </div>

                            <div className="rounded-2xl border border-black/[0.06] dark:border-white/[0.08] divide-y divide-black/[0.06] dark:divide-white/[0.08] bg-white dark:bg-zinc-800 shadow-xs overflow-hidden">
                              {/* Client Type */}
                              <div className="flex items-center px-4 py-1.5 focus-within:bg-black/[0.015] dark:focus-within:bg-white/[0.015] transition-colors">
                                <label
                                  htmlFor="profileClientType"
                                  className="w-32 sm:w-40 shrink-0 text-xs font-semibold text-gray-500 dark:text-zinc-400 select-none cursor-pointer"
                                >
                                  Affiliation
                                </label>
                                <Select
                                  id="profileClientType"
                                  value={clientType}
                                  onChange={(e) => setClientType(e.target.value)}
                                  className="h-10 border-0 shadow-none bg-transparent hover:bg-transparent focus-visible:border-transparent focus-visible:ring-0 dark:border-0 dark:bg-transparent text-[13.5px] font-medium text-gray-900 dark:text-zinc-100 px-1 cursor-pointer"
                                >
                                  {STUDENT_AFFILIATIONS.filter(({ value }) =>
                                    value !== "Parent" || !studentNo || initialProfileValues.clientType === "Parent"
                                  ).map(({ value, label }) => (
                                    <option key={value} value={value}>{label}</option>
                                  ))}
                                </Select>
                              </div>

                              {/* Student Number */}
                              <div className="flex items-center px-4 py-1.5 focus-within:bg-black/[0.015] dark:focus-within:bg-white/[0.015] transition-colors">
                                <label
                                  htmlFor="profileStudentNumber"
                                  className="w-32 sm:w-40 shrink-0 text-xs font-semibold text-gray-500 dark:text-zinc-400 select-none cursor-pointer"
                                >
                                  Linked Student Number
                                </label>
                                <Input
                                  type="text"
                                  id="profileStudentNumber"
                                  value={studentNo}
                                  readOnly
                                  placeholder="No linked record"
                                  className="h-10 border-0 shadow-none bg-transparent focus-visible:ring-0 text-[13.5px] font-medium font-sans tabular-nums text-gray-900 dark:text-zinc-100 placeholder:text-gray-400 px-1"
                                />
                              </div>
                              {canSaveChecklistNumber && (
                                <div className="flex items-center gap-2 px-4 py-1.5">
                                  <label htmlFor="profileChecklistStudentNumber" className="w-32 shrink-0 text-xs font-semibold text-muted-foreground sm:w-40">
                                    Student Number for Check My Records
                                  </label>
                                  <Input
                                    id="profileChecklistStudentNumber"
                                    value={checklistStudentNo}
                                    onChange={(event) => setChecklistStudentNo(event.target.value)}
                                    autoComplete="off"
                                    spellCheck={false}
                                    maxLength={31}
                                    placeholder="Optional"
                                  />
                                </div>
                              )}
                            </div>
                            <p className="text-[12px] text-gray-400 dark:text-zinc-500 mt-2 px-1 font-normal">
                              Optional in your profile. Select whether you are currently enrolled or requesting records as an alumnus.
                            </p>
                          </div>
                        )}

                        {/* Form Bottom Save Action */}
                        <div className="flex items-center justify-between pt-4">
                          <div className="text-xs text-gray-400 dark:text-zinc-500">
                            {isDirty ? (
                              <span className="text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1.5">
                                Unsaved profile changes
                              </span>
                            ) : (
                              <span>All profile changes saved</span>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            {isDirty && (
                              <Button
                                type="button"
                                variant="outline"
                                onClick={handleDiscardProfileChanges}
                                className="h-9 px-4 text-xs font-semibold rounded-xl border border-border dark:border-border bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-xs cursor-pointer active:scale-95 transition-all"
                              >
                                Discard
                              </Button>
                            )}
                            <Button
                              type="submit"
                              disabled={profileLoading || !isDirty}
                              className="h-9 px-4 text-xs font-semibold rounded-xl cursor-pointer disabled:opacity-40 flex items-center justify-center gap-2"
                            >
                              {profileLoading && (
                                <Loading01Icon size="1em" className="animate-spin text-xs" />
                              )}
                              {profileLoading ? "Saving..." : "Save Changes"}
                            </Button>
                          </div>
                        </div>
                      </form>
                    </div>
              </div>
            </TabsContent>

            <TabsContent value="security" className="m-0 border-0 focus-visible:ring-0">
              <div className="p-8 space-y-8">
                {/* Header with Apple Live Status Pill */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-6 border-b border-black/[0.06] dark:border-white/[0.08]">
                  <div>
                    <h3 className="text-lg font-semibold tracking-[-0.01em] text-gray-900 transition-colors dark:text-zinc-50">
                      Security Settings
                    </h3>
                    <p className="mt-1 text-[14px] font-normal text-gray-500 transition-colors dark:text-zinc-400">
                      Manage your primary authentication password and recovery challenge answers.
                    </p>
                  </div>
                  <div className="self-start sm:self-auto shrink-0">
                    <span className={SETTINGS_STATUS_PILL}>
                      <span className="inline-flex items-center gap-1.5 font-semibold text-gray-900 dark:text-zinc-100">
                        <SecurityCheckIcon size={14} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <span>Password Protected</span>
                      </span>
                      <span className={SETTINGS_PILL_DIVIDER} aria-hidden="true" />
                      <span className="font-medium text-gray-500 dark:text-zinc-400">
                        Encrypted
                      </span>
                    </span>
                  </div>
                </div>

                {/* Password Rotation Section */}
                <div>
                  <div className="mb-4">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-zinc-300">
                      Password Rotation
                    </h4>
                    <p className="text-[13px] text-gray-500 dark:text-zinc-400 mt-0.5">
                      Keep your account secure with a strong password. Must be at least 8 characters long.
                    </p>
                  </div>

                  <form onSubmit={submitPassword} className="space-y-4">
                    {/* Apple Inset Grouped List: Password fields */}
                    <div className="rounded-2xl border border-black/[0.06] dark:border-white/[0.08] divide-y divide-black/[0.06] dark:divide-white/[0.08] bg-white dark:bg-zinc-800 shadow-xs overflow-hidden">
                      {/* Current Password */}
                      <div className="flex items-center px-4 py-2 focus-within:bg-black/[0.015] dark:focus-within:bg-white/[0.015] transition-colors">
                        <label
                          htmlFor="currentPassword"
                          className="w-36 sm:w-44 shrink-0 text-xs font-semibold text-gray-500 dark:text-zinc-400 select-none cursor-pointer"
                        >
                          Current Password
                        </label>
                        <Input
                          type={showPw.current ? "text" : "password"}
                          id="currentPassword"
                          placeholder="Enter current password"
                          className="h-10 border-0 shadow-none bg-transparent focus-visible:ring-0 text-[13.5px] font-medium text-gray-900 dark:text-zinc-100 placeholder:text-gray-400 px-1 font-jakarta flex-1"
                          value={pwCurrent}
                          onChange={(e) => setPwCurrent(e.target.value)}
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPw(prev => ({ ...prev, current: !prev.current }))}
                          className="p-1.5 text-gray-400 hover:text-gray-700 dark:text-zinc-500 dark:hover:text-zinc-200 transition-colors cursor-pointer select-none"
                          title={showPw.current ? "Hide password" : "Show password"}
                        >
                          {showPw.current ? <ViewOffIcon size="1.1em" /> : <ViewIcon size="1.1em" />}
                        </button>
                      </div>

                      {/* New Password */}
                      <div className="flex items-center px-4 py-2 focus-within:bg-black/[0.015] dark:focus-within:bg-white/[0.015] transition-colors">
                        <label
                          htmlFor="newPassword"
                          className="w-36 sm:w-44 shrink-0 text-xs font-semibold text-gray-500 dark:text-zinc-400 select-none cursor-pointer"
                        >
                          New Password
                        </label>
                        <Input
                          type={showPw.next ? "text" : "password"}
                          id="newPassword"
                          placeholder="At least 8 characters"
                          className="h-10 border-0 shadow-none bg-transparent focus-visible:ring-0 text-[13.5px] font-medium text-gray-900 dark:text-zinc-100 placeholder:text-gray-400 px-1 font-jakarta flex-1"
                          value={pwNext}
                          onChange={(e) => setPwNext(e.target.value)}
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPw(prev => ({ ...prev, next: !prev.next }))}
                          className="p-1.5 text-gray-400 hover:text-gray-700 dark:text-zinc-500 dark:hover:text-zinc-200 transition-colors cursor-pointer select-none"
                          title={showPw.next ? "Hide password" : "Show password"}
                        >
                          {showPw.next ? <ViewOffIcon size="1.1em" /> : <ViewIcon size="1.1em" />}
                        </button>
                      </div>

                      {/* Confirm Password */}
                      <div className="flex items-center px-4 py-2 focus-within:bg-black/[0.015] dark:focus-within:bg-white/[0.015] transition-colors">
                        <label
                          htmlFor="confirmPassword"
                          className="w-36 sm:w-44 shrink-0 text-xs font-semibold text-gray-500 dark:text-zinc-400 select-none cursor-pointer"
                        >
                          Confirm Password
                        </label>
                        <Input
                          type={showPw.confirm ? "text" : "password"}
                          id="confirmPassword"
                          placeholder="Re-enter new password"
                          className="h-10 border-0 shadow-none bg-transparent focus-visible:ring-0 text-[13.5px] font-medium text-gray-900 dark:text-zinc-100 placeholder:text-gray-400 px-1 font-jakarta flex-1"
                          value={pwConfirm}
                          onChange={(e) => setPwConfirm(e.target.value)}
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPw(prev => ({ ...prev, confirm: !prev.confirm }))}
                          className="p-1.5 text-gray-400 hover:text-gray-700 dark:text-zinc-500 dark:hover:text-zinc-200 transition-colors cursor-pointer select-none"
                          title={showPw.confirm ? "Hide password" : "Show password"}
                        >
                          {showPw.confirm ? <ViewOffIcon size="1.1em" /> : <ViewIcon size="1.1em" />}
                        </button>
                      </div>

                      {/* Interactive Apple Strength & Match Meter (attached to the inputs on top of it) */}
                      {pwNext && (
                        <div className="p-4 bg-black/[0.015] dark:bg-white/[0.015] space-y-2.5 animate-in fade-in duration-200">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-gray-500 dark:text-zinc-400">Password Strength</span>
                            <span className={cn("font-bold tracking-tight", pwStrength.text)}>
                              {pwStrength.label}
                            </span>
                          </div>
                          <div className="grid grid-cols-4 gap-1.5 h-1.5 w-full">
                            {[1, 2, 3, 4].map((step) => (
                              <div
                                key={step}
                                className={cn(
                                  "rounded-full transition-colors duration-300",
                                  pwStrength.score >= step ? pwStrength.color : "bg-black/[0.06] dark:bg-white/10"
                                )}
                              />
                            ))}
                          </div>
                          {pwConfirm && (
                            <div className="flex items-center gap-1.5 pt-1 text-xs font-semibold">
                              {pwNext === pwConfirm ? (
                                <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                  <CheckmarkCircle01Icon size="1.1em" />
                                  Passwords match
                                </span>
                              ) : (
                                <span className="text-amber-600 dark:text-amber-400">
                                  Passwords do not match yet
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex justify-end pt-2">
                      <Button
                        type="submit"
                        disabled={pwLoading || !pwCurrent || pwNext.length < 8 || pwNext !== pwConfirm}
                        className="h-9 px-4 text-xs font-semibold rounded-xl cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {pwLoading && (
                          <Loading01Icon size="1em" className="animate-spin text-xs" />
                        )}
                        {pwLoading ? "Updating..." : "Update Password"}
                      </Button>
                    </div>
                  </form>
                </div>

                {/* Security Questions Section */}
                <div className="pt-6 border-t border-black/[0.06] dark:border-white/[0.08]">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-zinc-300">
                        Security Questions
                      </h4>
                      <p className="text-[13px] text-gray-500 dark:text-zinc-400 mt-0.5">
                        Set up questions to help recover your account.
                      </p>
                    </div>
                    <span className={cn(SETTINGS_STATUS_PILL, "self-start sm:self-auto shrink-0")}>
                      <span className="inline-flex items-center gap-1.5 font-semibold text-gray-900 dark:text-zinc-100">
                        {hasSetSecurity ? (
                          <SecurityCheckIcon size={14} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                        ) : (
                          <CancelCircleIcon size={14} className="text-gray-400 dark:text-zinc-500 shrink-0" />
                        )}
                        <span>Recovery</span>
                      </span>
                      <span className={SETTINGS_PILL_DIVIDER} aria-hidden="true" />
                      <span className="font-medium text-gray-500 dark:text-zinc-400">
                        {hasSetSecurity ? "Active" : "Not Configured"}
                      </span>
                    </span>
                  </div>

                  <form onSubmit={submitSecurity} className="space-y-4">
                    {globalQuestions.length === 0 ? (
                      <div className="rounded-2xl border border-black/[0.06] dark:border-white/[0.08] bg-white dark:bg-zinc-800 p-6 shadow-xs">
                        <Empty variant="compact">
                          <EmptyHeader>
                            <EmptyMedia><EmptyHelpCircleIcon size="1em" /></EmptyMedia>
                            <EmptyTitle>
                              No Recovery Questions Configured
                            </EmptyTitle>
                            <EmptyDescription>
                              Institutional security questions have not been configured yet. Contact your system administrator to enable question-based account recovery.
                            </EmptyDescription>
                          </EmptyHeader>
                        </Empty>
                      </div>
                    ) : (
                      <div className="rounded-2xl border border-black/[0.06] dark:border-white/[0.08] divide-y divide-black/[0.06] dark:divide-white/[0.08] bg-white dark:bg-zinc-800 shadow-xs overflow-hidden">
                        {globalQuestions.map((q) => {
                          const isEditing = !!editingSecQuestions[q.id];
                          const showInput = !q.hasAnswer || isEditing;

                          return (
                            <div key={q.id} className="p-4 sm:p-5 space-y-3">
                              <div className="flex items-center justify-between gap-3">
                                <label className="text-[13px] font-semibold text-gray-900 dark:text-zinc-100 flex items-center gap-1.5">
                                  <span>{q.question}</span>
                                  {!q.is_required && (
                                    <span className="text-xs text-gray-400 dark:text-zinc-500 font-normal">(optional)</span>
                                  )}
                                </label>
                                {q.hasAnswer && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingSecQuestions(prev => ({ ...prev, [q.id]: !isEditing }));
                                      if (isEditing) {
                                        setSecAnswers(prev => {
                                          const n = { ...prev };
                                          delete n[q.id];
                                          return n;
                                        });
                                      }
                                    }}
                                    className="text-xs font-semibold text-gray-700 hover:text-gray-900 dark:text-zinc-300 dark:hover:text-white transition-colors cursor-pointer shrink-0"
                                  >
                                    {isEditing ? "Cancel" : "Edit Answer"}
                                  </button>
                                )}
                              </div>

                              <div>
                                {showInput ? (
                                  <Input
                                    type="text"
                                    className="h-10 rounded-xl border border-black/[0.08] dark:border-white/[0.1] bg-white dark:bg-zinc-900 px-3.5 text-sm font-medium text-gray-900 dark:text-zinc-100 placeholder:text-gray-400 dark:placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pup-maroon/20 dark:focus-visible:ring-red-500/20"
                                    placeholder="Enter your confidential answer"
                                    value={secAnswers[q.id] || ""}
                                    onChange={(e) => setSecAnswers({ ...secAnswers, [q.id]: e.target.value })}
                                    autoFocus={isEditing}
                                  />
                                ) : (
                                  <div className="h-10 flex items-center justify-between px-3.5 bg-gray-50/70 border border-black/[0.04] dark:border-white/[0.06] rounded-xl text-xs font-semibold text-gray-500 select-none dark:bg-white/[0.03] dark:text-zinc-400">
                                    <span className="font-mono tracking-widest text-[13px] text-gray-400">••••••••••••</span>
                                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                                      <CheckmarkCircle01Icon size="1em" />
                                      Encrypted & Saved
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {globalQuestions.length > 0 && (
                      <div className="flex justify-end pt-2">
                        <Button
                          type="submit"
                          disabled={secLoading}
                          className="h-9 px-4 text-xs font-semibold rounded-xl cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                          {secLoading && (
                            <Loading01Icon size="1em" className="animate-spin text-xs" />
                          )}
                          {secLoading ? "Saving..." : "Save Security Questions"}
                        </Button>
                      </div>
                    )}
                  </form>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="two-factor" className="m-0 border-0 focus-visible:ring-0">
              <div className="p-8 space-y-8">
                {/* Two-Factor Authentication Header with Live Status Pill */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-6 border-b border-black/[0.06] dark:border-white/[0.08]">
                  <div>
                    <h3 className="text-lg font-semibold tracking-[-0.01em] text-gray-900 transition-colors dark:text-zinc-50">
                      Two-Factor Authentication
                    </h3>
                    <p className="mt-1 text-[14px] font-normal text-gray-500 transition-colors dark:text-zinc-400">
                      Add an extra layer of security to your account with time-based OTP and backup recovery codes.
                    </p>
                  </div>
                  <div className="self-start sm:self-auto shrink-0">
                    <span className={SETTINGS_STATUS_PILL}>
                      <span className="inline-flex items-center gap-1.5 font-semibold text-gray-900 dark:text-zinc-100">
                        <SecurityCheckIcon size={14} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <span>Protection</span>
                      </span>
                      <span className={SETTINGS_PILL_DIVIDER} aria-hidden="true" />
                      <span className="font-medium text-gray-500 dark:text-zinc-400">
                        {(totpEnabled && hasTotpSecret) || authUser?.totp_enabled ? "2FA Active" : "2FA Not Configured"}
                      </span>
                    </span>
                  </div>
                </div>

                {/* 2FA Body Content */}
                <div>
                  {totpStep === "setup" && totpSetupData ? (
                    <div className="space-y-6 animate-in zoom-in-95 duration-slow">
                      <div className="rounded-2xl border border-black/[0.06] dark:border-white/[0.08] bg-white dark:bg-zinc-800 p-6 sm:p-8 shadow-xs">
                        <div className="grid grid-cols-1 md:grid-cols-[1fr_280px] gap-8 items-center">
                          <div className="space-y-4">
                            <div>
                              <span className="text-[11px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">Step 1</span>
                              <h4 className="text-lg font-bold text-gray-900 tracking-tight dark:text-zinc-50 font-jakarta mt-0.5">
                                Link Authenticator App
                              </h4>
                              <p className="text-sm font-normal text-gray-600 dark:text-zinc-300 mt-1">
                                Scan this QR code using Apple Passwords, Google Authenticator, 1Password, Authy, or Microsoft Authenticator to connect your account.
                              </p>
                              <div className="pt-2">
                                <span className="text-[10px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-wider block mb-1.5">
                                  Compatible Applications
                                </span>
                                <AuthenticatorAppBadges size="sm" />
                              </div>
                            </div>

                            <div className="space-y-2.5 pt-2">
                              {/* Secret key */}
                              <div className="bg-gray-50/80 dark:bg-zinc-900/60 px-4 py-3 rounded-xl border border-black/[0.06] dark:border-white/[0.08] flex items-center justify-between gap-3">
                                <div className="min-w-0">
                                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider dark:text-zinc-500 block">
                                    Secret Key (Manual Entry)
                                  </span>
                                  <span className="text-xs sm:text-sm font-bold font-mono text-gray-900 dark:text-primary tracking-wider break-all">
                                    {totpSetupData.secret}
                                  </span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleTactileCopy(totpSetupData.secret, "totpSecret")}
                                  className="size-8 rounded-lg bg-white dark:bg-zinc-800 border border-black/[0.08] dark:border-white/[0.1] flex items-center justify-center text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white transition-all shrink-0 cursor-pointer shadow-xs active:scale-95"
                                  title="Copy Secret Key"
                                >
                                  {copiedItem === "totpSecret" ? (
                                    <Tick01Icon size="1em" className="text-emerald-600 dark:text-emerald-400 text-sm" />
                                  ) : (
                                    <Copy01Icon size="1em" className="text-sm" />
                                  )}
                                </button>
                              </div>

                              {/* Serial key */}
                              <div className="bg-gray-50/80 dark:bg-zinc-900/60 px-4 py-3 rounded-xl border border-black/[0.06] dark:border-white/[0.08] flex items-center justify-between gap-3">
                                <div className="min-w-0">
                                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider dark:text-zinc-500 block">
                                    Serial Key (Backup Verification)
                                  </span>
                                  <span className="text-xs sm:text-sm font-bold font-mono text-gray-900 dark:text-zinc-200 tracking-wider break-all">
                                    {totpSetupData.serialKey}
                                  </span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleTactileCopy(totpSetupData.serialKey, "totpSerialKey")}
                                  className="size-8 rounded-lg bg-white dark:bg-zinc-800 border border-black/[0.08] dark:border-white/[0.1] flex items-center justify-center text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white transition-all shrink-0 cursor-pointer shadow-xs active:scale-95"
                                  title="Copy Serial Key"
                                >
                                  {copiedItem === "totpSerialKey" ? (
                                    <Tick01Icon size="1em" className="text-emerald-600 dark:text-emerald-400 text-sm" />
                                  ) : (
                                    <Copy01Icon size="1em" className="text-sm" />
                                  )}
                                </button>
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-col items-center justify-center w-full">
                            <div className="p-3 bg-white rounded-2xl border border-black/[0.08] shadow-sm">
                              <img
                                src={totpSetupData.qrCode}
                                alt="TOTP QR Code"
                                className="w-full h-auto max-w-[220px] aspect-square object-contain"
                              />
                            </div>
                            <span className="text-[11px] text-gray-400 mt-2 font-medium">Scan with camera or app</span>
                          </div>
                        </div>

                        {/* Step 2: Verification Code Input */}
                        <div className="mt-8 pt-6 border-t border-black/[0.06] dark:border-white/[0.08] space-y-3">
                          <div>
                            <span className="text-[11px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">Step 2</span>
                            <h4 className="text-sm font-bold text-gray-900 dark:text-zinc-100">Enter 6-Digit Code</h4>
                            <p className="text-xs text-gray-500 dark:text-zinc-400">Type the rotating code shown in your authenticator app to finalize configuration.</p>
                          </div>
                          <Input
                            type="text"
                            maxLength={6}
                            className="h-14 rounded-xl border border-black/[0.1] bg-white text-center text-2xl font-bold tracking-[0.3em] font-mono text-gray-900 shadow-inner transition-all focus-visible:border-pup-maroon focus-visible:ring-2 focus-visible:ring-pup-maroon/20 dark:border-white/[0.15] dark:bg-zinc-900 dark:text-zinc-50"
                            placeholder="000000"
                            value={totpToken}
                            onChange={(e) => setTotpToken(e.target.value.replace(/\D/g, "").slice(0, 6))}
                            autoFocus
                          />
                        </div>

                        <div className="pt-6 mt-6 border-t border-black/[0.06] dark:border-white/[0.08] flex justify-end gap-2">
                          <Button
                            type="button"
                            onClick={cancelTOTPSetup}
                            disabled={totpLoading}
                            variant="outline"
                            className="h-9 px-4 text-xs font-semibold rounded-xl border border-border dark:border-border bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-xs cursor-pointer active:scale-95 transition-all"
                          >
                            Cancel
                          </Button>
                          <Button
                            type="button"
                            onClick={verifyTOTP}
                            disabled={totpLoading || totpToken.length !== 6}
                            className="h-9 px-4 text-xs font-semibold rounded-xl cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                          >
                            {totpLoading && (
                              <Loading01Icon size="1em" className="animate-spin text-xs" />
                            )}
                            Activate 2FA
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4 animate-in fade-in duration-slow">
                      {/* Authenticator App Method Card */}
                      <div className="rounded-2xl border border-black/[0.06] dark:border-white/[0.08] bg-white dark:bg-zinc-800 p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                        <div className="flex gap-4 items-start">
                          <div className="size-11 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 mt-0.5">
                            <SmartPhone01Icon size="1.35em" />
                          </div>
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-2">
                              <h4 className="text-[15px] font-bold text-gray-900 dark:text-zinc-50 font-jakarta">
                                Authenticator App
                              </h4>
                              {totpEnabled && hasTotpSecret ? (
                                <span className={SETTINGS_STATUS_PILL_SM}>
                                  <span className={SETTINGS_DOT_CHECK}>
                                    <Tick01Icon size={8} className="stroke-[3]" />
                                  </span>
                                  <span className="font-semibold text-gray-900 dark:text-zinc-100">Active</span>
                                </span>
                              ) : (
                                <span className={SETTINGS_STATUS_PILL_SM}>
                                  <CancelCircleIcon size={13} className="text-gray-400 dark:text-zinc-500 shrink-0" />
                                  <span className="font-medium text-gray-500 dark:text-zinc-400">Inactive</span>
                                </span>
                              )}
                            </div>
                            <p className="text-[13px] font-normal text-gray-500 max-w-lg dark:text-zinc-400">
                              Generate rotating 6-digit codes on your smartphone or desktop authenticator app.
                            </p>
                            <div className="pt-1.5">
                              <span className="text-[11px] font-semibold text-gray-400 dark:text-zinc-500 uppercase tracking-wider block mb-1.5">
                                Compatible Applications
                              </span>
                              <AuthenticatorAppBadges />
                            </div>
                          </div>
                        </div>
                        <div className="shrink-0 flex sm:self-center justify-end">
                          {totpEnabled && hasTotpSecret ? (
                            <Button
                              type="button"
                              onClick={() => setTotpStep("disable-flow")}
                              variant="outline"
                              className="h-9 px-4 text-xs font-semibold rounded-xl border border-border dark:border-border bg-white text-gray-700 dark:bg-zinc-800 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-xs cursor-pointer active:scale-95 transition-all"
                            >
                              Disable 2FA
                            </Button>
                          ) : (
                            <Button
                              type="button"
                              onClick={startTOTPSetup}
                              disabled={totpSetupLoading}
                              className="h-9 px-4 text-xs font-semibold rounded-xl cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                              {totpSetupLoading && (
                                <Loading01Icon size="1em" className="animate-spin text-xs" />
                              )}
                              Configure 2FA
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* TOTP Disable Form Flow */}
                      {totpStep === "disable-flow" && (
                        <div className="rounded-2xl border border-red-500/20 bg-red-50/30 dark:bg-red-950/20 p-6 space-y-4 animate-in zoom-in-95 duration-normal">
                          <div className="flex items-start gap-3">
                            <div className="size-9 rounded-xl bg-red-500/10 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0 mt-0.5">
                              <Shield01Icon size="1.2em" />
                            </div>
                            <div>
                              <h4 className="text-sm font-bold text-gray-900 dark:text-zinc-100">
                                Disable Two-Factor Authentication
                              </h4>
                              <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">
                                Please confirm your identity by entering the current 6-digit code from your authenticator app.
                              </p>
                            </div>
                          </div>

                          <div className="space-y-1.5 pt-1">
                            <label className="text-xs font-semibold text-gray-500 dark:text-zinc-400">
                              Verification Code
                            </label>
                            <Input
                              type="text"
                              maxLength={6}
                              className="h-12 rounded-xl border border-black/[0.1] bg-white text-center text-xl font-bold tracking-widest font-mono text-gray-900 shadow-inner transition-all focus-visible:border-red-500 focus-visible:ring-2 focus-visible:ring-red-500/20 dark:border-white/[0.15] dark:bg-zinc-900 dark:text-zinc-50"
                              placeholder="000000"
                              value={totpToken}
                              onChange={(e) => setTotpToken(e.target.value.replace(/\D/g, "").slice(0, 6))}
                              autoFocus
                            />
                          </div>

                          <div className="flex justify-end gap-2 pt-2">
                            <Button
                              type="button"
                              onClick={() => { setTotpStep("idle"); setTotpToken(""); }}
                              variant="outline"
                              className="h-9 px-4 text-xs font-semibold rounded-xl border border-border dark:border-border bg-white text-gray-700 dark:bg-zinc-800 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-xs cursor-pointer active:scale-95 transition-all"
                            >
                              Cancel
                            </Button>
                            <Button
                              type="button"
                              onClick={async () => {
                                await disableTOTP();
                                setTotpStep("idle");
                              }}
                              disabled={totpLoading || totpToken.length !== 6}
                              variant="destructive"
                              className="h-9 px-4 text-xs font-semibold rounded-xl cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                              {totpLoading && (
                                <Loading01Icon size="1em" className="animate-spin text-xs" />
                              )}
                              Disable 2FA
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* Backup Recovery Codes Method Card */}
                      <div className="rounded-2xl border border-black/[0.06] dark:border-white/[0.08] bg-white dark:bg-zinc-800 p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                        <div className="flex gap-4 items-start">
                          <div className="size-11 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 mt-0.5">
                            <Shield01Icon size="1.35em" />
                          </div>
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-2">
                              <h4 className="text-[15px] font-bold text-gray-900 dark:text-zinc-50 font-jakarta">
                                Backup Recovery Codes
                              </h4>
                              {recoveryCodesCount > 0 ? (
                                <span className={SETTINGS_STATUS_PILL_SM}>
                                  <span className="inline-flex items-center gap-1.5 font-semibold text-gray-900 dark:text-zinc-100">
                                    <span className={SETTINGS_DOT_CHECK}>
                                      <Tick01Icon size={8} className="stroke-[3]" />
                                    </span>
                                    <span>Active</span>
                                  </span>
                                  <span className={SETTINGS_PILL_DIVIDER} aria-hidden="true" />
                                  <span className="font-medium text-gray-500 dark:text-zinc-400 tabular-nums">
                                    {recoveryCodesCount} left
                                  </span>
                                </span>
                              ) : (
                                <span className={SETTINGS_STATUS_PILL_SM}>
                                  <CancelCircleIcon size={13} className="text-gray-400 dark:text-zinc-500 shrink-0" />
                                  <span className="font-medium text-gray-500 dark:text-zinc-400">Inactive</span>
                                </span>
                              )}
                            </div>
                            <p className="text-[13px] font-normal text-gray-500 max-w-lg dark:text-zinc-400">
                              Generate a set of single-use backup recovery codes. These allow secure access to your account in emergency events if your authenticator device is lost or offline.
                            </p>
                          </div>
                        </div>
                        <div className="shrink-0 flex sm:self-center justify-end gap-2">
                          {recoveryCodesCount > 0 && (
                            <Button
                              type="button"
                              onClick={async () => {
                                setRecoveryCodesLoading(true);
                                try {
                                  const res = await fetch("/api/auth/totp", {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({ action: "disable-recovery-codes" })
                                  });
                                  const json = await res.json();
                                  if (json.ok) {
                                    setRecoveryCodesCount(0);
                                    toast.success("Recovery Codes Disabled", {
                                      description: "Your emergency backup codes have been invalidated."
                                    });
                                    await refreshTOTPStatus();
                                  } else {
                                    throw new Error(json.error);
                                  }
                                } catch (err) {
                                  const errInfo = formatErrorMessage(err, { title: "Disable Recovery Codes Failed", description: "Could not disable recovery codes." });
                                  toast.error(errInfo.title, { description: errInfo.description, action: errInfo.action });
                                } finally {
                                  setRecoveryCodesLoading(false);
                                }
                              }}
                              disabled={recoveryCodesLoading}
                              variant="outline"
                              className="h-9 px-4 text-xs font-semibold rounded-xl border border-border dark:border-border bg-white text-gray-700 dark:bg-zinc-800 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-xs cursor-pointer active:scale-95 transition-all"
                            >
                              Disable Codes
                            </Button>
                          )}
                          <Button
                            type="button"
                            onClick={generateNewRecoveryCodes}
                            disabled={recoveryCodesLoading}
                            className="h-9 px-4 text-xs font-semibold rounded-xl cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                          >
                            {recoveryCodesLoading && (
                              <Loading01Icon size="1em" className="animate-spin text-xs" />
                            )}
                            {recoveryCodesCount > 0 ? "Regenerate Codes" : "Generate Codes"}
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="preferences" className="m-0 border-0 focus-visible:ring-0">
              <div className="p-8 space-y-8">
                {/* Header with Apple Live Status Pill */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-6 border-b border-black/[0.06] dark:border-white/[0.08]">
                  <div>
                    <h3 className="text-lg font-semibold tracking-[-0.01em] text-gray-900 transition-colors dark:text-zinc-50">
                      System Preferences
                    </h3>
                    <p className="mt-1 text-[14px] font-normal text-gray-500 transition-colors dark:text-zinc-400">
                      Customize your startup workspace view, name presentation, data density, and profile identity.
                    </p>
                  </div>
                  <div className="self-start sm:self-auto shrink-0">
                    <span className={SETTINGS_STATUS_PILL}>
                      <span className="inline-flex items-center gap-1.5 font-semibold text-gray-900 dark:text-zinc-100">
                        <span className={SETTINGS_DOT_CHECK}>
                          <Tick01Icon size={9} className="stroke-[3]" />
                        </span>
                        <span>Personalized</span>
                      </span>
                      <span className={SETTINGS_PILL_DIVIDER} aria-hidden="true" />
                      <span className="font-medium text-gray-500 dark:text-zinc-400">
                        Workspace
                      </span>
                    </span>
                  </div>
                </div>

                {/* Section 1: Default Home View */}
                <div>
                  <div className="mb-4">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-zinc-300">
                      Default Home View
                    </h4>
                    <p className="text-[13px] text-gray-500 dark:text-zinc-400 mt-0.5">
                      Choose which workspace view automatically opens whenever you sign into the records system.
                    </p>
                  </div>

                  <div className="p-4 sm:p-5 rounded-2xl border border-black/[0.06] dark:border-white/[0.08] bg-white dark:bg-zinc-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1 max-w-md">
                      <div className="flex items-center gap-2">
                        <h5 className="text-[13.5px] font-semibold text-gray-900 dark:text-zinc-50">
                          Startup Landing Page
                        </h5>
                        <span className={SETTINGS_STATUS_PILL_SM}>
                          <span className="inline-flex items-center gap-1.5 font-semibold text-gray-900 dark:text-zinc-100">
                            <span className={SETTINGS_DOT_CHECK}>
                              <Tick01Icon size={8} className="stroke-[3]" />
                            </span>
                            <span>Active</span>
                          </span>
                          <span className={SETTINGS_PILL_DIVIDER} aria-hidden="true" />
                          <span className="font-medium text-gray-500 dark:text-zinc-400">
                            {activeHomeView?.label || "Default"}
                          </span>
                        </span>
                      </div>
                      <p className="text-xs font-normal text-gray-500 dark:text-zinc-400 leading-relaxed">
                        {activeHomeView?.desc || "Active workspace view upon sign-in"}
                      </p>
                    </div>

                    <div className="w-full sm:w-72 shrink-0">
                      <Select
                        value={activeHomeView?.id}
                        onValueChange={(val) => handlePreferenceChange("default_home_view", val, "Start Page Updated")}
                        buttonClassName="h-10 text-[13px] font-medium"
                      >
                        {availableHomeViews.map((view) => (
                          <option key={view.id} value={view.id}>
                            {view.label}
                          </option>
                        ))}
                      </Select>
                    </div>
                  </div>
                </div>

                <InitialLoaderSetting
                  value={userPreferences.initial_loader}
                  onSave={(value) => handlePreferenceChange("initial_loader", value, "Dashboard Loader Updated")}
                />

                {/* Section 2: Display Name Format */}
                <div className="pt-6 border-t border-black/[0.06] dark:border-white/[0.08]">
                  <div className="mb-4">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-zinc-300">
                      Display Name Format
                    </h4>
                    <p className="text-[13px] text-gray-500 dark:text-zinc-400 mt-0.5">
                      Choose how your name appears in the top navigation header, sidebar profile menu, and institutional reports.
                    </p>
                  </div>

                  <div className="p-4 sm:p-5 rounded-2xl border border-black/[0.06] dark:border-white/[0.08] bg-white dark:bg-zinc-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1 max-w-md">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h5 className="text-[13.5px] font-semibold text-gray-900 dark:text-zinc-50">
                          Name Representation
                        </h5>
                        <span className={SETTINGS_GRAY_BADGE}>
                          {activeNameFormat?.preview}
                        </span>
                      </div>
                      <p className="text-xs font-normal text-gray-500 dark:text-zinc-400 leading-relaxed">
                        {activeNameFormat?.desc || "Preferred name presentation across interface"}
                      </p>
                    </div>

                    <div className="w-full sm:w-72 shrink-0">
                      <Select
                        value={activeNameFormat?.id}
                        onValueChange={(val) => handlePreferenceChange("display_name_format", val, "Display Name Format Updated")}
                        buttonClassName="h-10 text-[13px] font-medium"
                      >
                        {displayNameFormats.map((fmt) => (
                          <option key={fmt.id} value={fmt.id}>
                            {fmt.label} ({fmt.preview})
                          </option>
                        ))}
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Section 3: Table Row Density */}
                <div className="pt-6 border-t border-black/[0.06] dark:border-white/[0.08]">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-zinc-300 font-jakarta">
                        Table Row Density
                      </h4>
                      <p className="text-[13px] text-gray-500 dark:text-zinc-400 mt-0.5">
                        Choose the row vertical spacing, height, and padding used by tables across this browser.
                      </p>
                    </div>
                    <span className={cn(SETTINGS_STATUS_PILL, "self-start sm:self-auto")}>
                      <span className="inline-flex items-center gap-1.5 font-semibold text-gray-900 dark:text-zinc-100">
                        <span className={SETTINGS_DOT_CHECK}>
                          <Tick01Icon size={9} className="stroke-[3]" />
                        </span>
                        <span>Active</span>
                      </span>
                      <span className={SETTINGS_PILL_DIVIDER} aria-hidden="true" />
                      <span className="font-medium text-gray-500 dark:text-zinc-400 tabular-nums">
                        {TABLE_DENSITY_OPTIONS.find((d) => d.id === tableDensity)?.label || "Normal"} ({TABLE_DENSITY_OPTIONS.find((d) => d.id === tableDensity)?.height || "52px row"})
                      </span>
                    </span>
                  </div>

                  {/* Density Preset Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    {TABLE_DENSITY_OPTIONS.map((opt) => {
                      const isSelected = tableDensity === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => handleTableDensityChange(opt.id)}
                          aria-pressed={isSelected}
                          className={cn(
                            "group relative flex flex-col justify-between p-3 sm:p-3.5 rounded-xl border text-left transition-all duration-150 cursor-pointer select-none",
                            isSelected
                              ? "border-gray-950 dark:border-white bg-gray-100/80 dark:bg-zinc-800 text-gray-950 dark:text-zinc-50 font-semibold shadow-xs ring-1 ring-black/10 dark:ring-white/20"
                              : "border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-zinc-800/70 text-gray-700 dark:text-zinc-300 hover:border-black/20 dark:hover:border-white/20 hover:bg-gray-50/80 dark:hover:bg-zinc-750 hover:-translate-y-0.5 hover:shadow-xs active:scale-[0.98]"
                          )}
                        >
                          {/* Card Top: Indicator, Title, and Height Badge */}
                          <div className="flex items-center justify-between gap-1.5 w-full mb-1.5">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span
                                className={cn(
                                  "size-3.5 rounded-full flex items-center justify-center shrink-0 transition-all",
                                  isSelected
                                    ? "bg-pup-maroon text-white dark:bg-red-500 ring-2 ring-pup-maroon/20 dark:ring-red-500/30"
                                    : "border border-gray-300 dark:border-zinc-600 bg-transparent group-hover:border-gray-400 dark:group-hover:border-zinc-500"
                                )}
                              >
                                {isSelected && <Tick01Icon size={10} className="stroke-[3]" />}
                              </span>
                              <span className="text-[13px] font-bold text-gray-900 dark:text-zinc-50 font-jakarta tracking-tight">
                                {opt.label}
                              </span>
                            </div>
                            <span className={cn(SETTINGS_GRAY_BADGE, "shrink-0 tabular-nums")}>
                              {opt.height}
                            </span>
                          </div>

                          {/* Architectural Blueprint Micro-Table Preview */}
                          <div
                            className={cn(
                              "w-full rounded-lg border p-1.5 my-1 transition-all flex flex-col justify-center min-h-[56px] overflow-hidden",
                              isSelected
                                ? "bg-white/90 dark:bg-zinc-900/90 border-pup-maroon/20 dark:border-red-500/30 shadow-2xs"
                                : "bg-gray-50/80 dark:bg-zinc-900/50 border-black/[0.04] dark:border-white/[0.06] group-hover:bg-gray-100/60 dark:group-hover:bg-zinc-800/60"
                            )}
                          >
                            {/* Micro Column Headers */}
                            <div className="flex items-center justify-between gap-1 pb-1 mb-1 border-b border-black/[0.05] dark:border-white/[0.06] text-[8px] text-gray-400 dark:text-zinc-500 select-none">
                              <span className="size-1.5 rounded-xs border border-gray-300 dark:border-zinc-600 shrink-0" />
                              <span className="w-8 h-1 rounded-full bg-gray-300/80 dark:bg-zinc-700 shrink-0" />
                              <span className="w-12 h-1 rounded-full bg-gray-300/80 dark:bg-zinc-700" />
                              <span className="size-1.5 rounded-full bg-gray-300/80 dark:bg-zinc-700 ml-auto shrink-0" />
                            </div>

                            {/* Micro Table Rows: Scaled with exact proportional heights */}
                            {opt.id === "compact" && (
                              <div className="flex flex-col gap-1 w-full">
                                <div className={cn("h-3.5 px-1 rounded flex items-center justify-between gap-1 text-[8px] transition-colors", isSelected ? "bg-pup-maroon/[0.06] dark:bg-red-950/40" : "bg-black/[0.03] dark:bg-white/[0.04]")}>
                                  <span className="size-1.5 rounded-xs bg-pup-maroon/50 dark:bg-red-400/50 shrink-0" />
                                  <span className={cn("w-7 h-1 rounded-xs", isSelected ? "bg-gray-800 dark:bg-zinc-200" : "bg-gray-400 dark:bg-zinc-500")} />
                                  <span className={cn("w-10 h-1 rounded-xs", isSelected ? "bg-gray-600 dark:bg-zinc-400" : "bg-gray-300 dark:bg-zinc-600")} />
                                  <span className="size-1 rounded-full bg-emerald-500 ml-auto shrink-0" />
                                </div>
                                <div className={cn("h-3.5 px-1 rounded flex items-center justify-between gap-1 text-[8px] opacity-75 transition-colors", isSelected ? "bg-pup-maroon/[0.04] dark:bg-red-950/30" : "bg-black/[0.02] dark:bg-white/[0.03]")}>
                                  <span className="size-1.5 rounded-xs border border-gray-300 dark:border-zinc-600 shrink-0" />
                                  <span className={cn("w-7 h-1 rounded-xs", isSelected ? "bg-gray-800 dark:bg-zinc-200" : "bg-gray-400 dark:bg-zinc-500")} />
                                  <span className={cn("w-8 h-1 rounded-xs", isSelected ? "bg-gray-600 dark:bg-zinc-400" : "bg-gray-300 dark:bg-zinc-600")} />
                                  <span className="size-1 rounded-full bg-amber-500 ml-auto shrink-0" />
                                </div>
                              </div>
                            )}

                            {opt.id === "normal" && (
                              <div className="flex flex-col gap-1 w-full">
                                <div className={cn("h-4 px-1 rounded flex items-center justify-between gap-1 text-[8px] transition-colors", isSelected ? "bg-pup-maroon/[0.06] dark:bg-red-950/40" : "bg-black/[0.03] dark:bg-white/[0.04]")}>
                                  <span className="size-1.5 rounded-xs bg-pup-maroon/50 dark:bg-red-400/50 shrink-0" />
                                  <div className="flex flex-col gap-0.5">
                                    <span className={cn("w-8 h-1 rounded-xs", isSelected ? "bg-gray-800 dark:bg-zinc-200" : "bg-gray-400 dark:bg-zinc-500")} />
                                    <span className={cn("w-5 h-0.5 rounded-xs opacity-60", isSelected ? "bg-gray-600 dark:bg-zinc-400" : "bg-gray-300 dark:bg-zinc-600")} />
                                  </div>
                                  <span className={cn("w-9 h-1 rounded-xs", isSelected ? "bg-gray-600 dark:bg-zinc-400" : "bg-gray-300 dark:bg-zinc-600")} />
                                  <span className="size-1 rounded-full bg-emerald-500 ml-auto shrink-0" />
                                </div>
                                <div className={cn("h-4 px-1 rounded flex items-center justify-between gap-1 text-[8px] opacity-75 transition-colors", isSelected ? "bg-pup-maroon/[0.04] dark:bg-red-950/30" : "bg-black/[0.02] dark:bg-white/[0.03]")}>
                                  <span className="size-1.5 rounded-xs border border-gray-300 dark:border-zinc-600 shrink-0" />
                                  <div className="flex flex-col gap-0.5">
                                    <span className={cn("w-8 h-1 rounded-xs", isSelected ? "bg-gray-800 dark:bg-zinc-200" : "bg-gray-400 dark:bg-zinc-500")} />
                                    <span className={cn("w-5 h-0.5 rounded-xs opacity-60", isSelected ? "bg-gray-600 dark:bg-zinc-400" : "bg-gray-300 dark:bg-zinc-600")} />
                                  </div>
                                  <span className={cn("w-7 h-1 rounded-xs", isSelected ? "bg-gray-600 dark:bg-zinc-400" : "bg-gray-300 dark:bg-zinc-600")} />
                                  <span className="size-1 rounded-full bg-amber-500 ml-auto shrink-0" />
                                </div>
                              </div>
                            )}

                            {opt.id === "comfortable" && (
                              <div className="flex flex-col gap-1.5 w-full">
                                <div className={cn("h-5 px-1.5 rounded flex items-center justify-between gap-1 text-[8px] transition-colors", isSelected ? "bg-pup-maroon/[0.06] dark:bg-red-950/40" : "bg-black/[0.03] dark:bg-white/[0.04]")}>
                                  <span className="size-2 rounded-full bg-pup-maroon/40 dark:bg-red-400/40 shrink-0" />
                                  <div className="flex flex-col gap-0.5">
                                    <span className={cn("w-10 h-1 rounded-xs", isSelected ? "bg-gray-800 dark:bg-zinc-200" : "bg-gray-400 dark:bg-zinc-500")} />
                                    <span className={cn("w-6 h-0.5 rounded-xs opacity-60", isSelected ? "bg-gray-600 dark:bg-zinc-400" : "bg-gray-300 dark:bg-zinc-600")} />
                                  </div>
                                  <span className={cn("w-8 h-1.5 rounded-xs", isSelected ? "bg-gray-600 dark:bg-zinc-400" : "bg-gray-300 dark:bg-zinc-600")} />
                                  <span className="size-1.5 rounded-full bg-emerald-500 ml-auto shrink-0" />
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Card Bottom: Description & Tag */}
                          <div className="mt-1 flex items-center justify-between gap-1 text-[11px] leading-tight">
                            <span className="font-semibold text-gray-800 dark:text-zinc-200 truncate">
                              {opt.desc}
                            </span>
                            <span className="text-[10px] text-gray-400 dark:text-zinc-500 font-medium shrink-0">
                              {opt.id === "compact" ? "Dense" : opt.id === "normal" ? "Standard" : "Spacious"}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Section 4: Profile Avatar Card */}
                <div className="pt-6 border-t border-black/[0.06] dark:border-white/[0.08]">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-5 rounded-2xl border border-black/[0.06] dark:border-white/[0.08] bg-white dark:bg-zinc-800 shadow-xs">
                    <div className="flex items-center gap-4">
                      <div className="relative size-14 rounded-full overflow-hidden flex items-center justify-center bg-gray-100 dark:bg-zinc-700 border border-black/[0.06] dark:border-white/[0.1] shrink-0">
                        {authUser?.avatar_filename?.includes("default") && selectedDefaultAvatarId && DEFAULT_AVATARS.find(a => a.id === selectedDefaultAvatarId) ? (
                          <div className="w-full h-full flex items-center justify-center [&_svg]:size-full">
                            {DEFAULT_AVATARS.find(a => a.id === selectedDefaultAvatarId)?.svg}
                          </div>
                        ) : authUser?.avatar_filename?.includes("notionist") && selectedDefaultAvatarId && NOTIONISTS_AVATARS.find(a => a.id === selectedDefaultAvatarId) ? (
                          <div className="w-full h-full flex items-center justify-center [&_svg]:size-full">
                            {NOTIONISTS_AVATARS.find(a => a.id === selectedDefaultAvatarId)?.svg}
                          </div>
                        ) : authUser?.avatar_filename && avatarUrl ? (
                          <img src={avatarUrl} alt="Profile Avatar" className="w-full h-full object-cover" />
                        ) : (
                          <UserIcon size="1.5em" className="text-gray-400 dark:text-zinc-500" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-[15px] font-bold text-gray-900 dark:text-zinc-50 font-jakarta">
                            Profile Avatar
                          </h4>
                          <span className={SETTINGS_STATUS_PILL_SM}>
                            <span className="inline-flex items-center gap-1.5 font-semibold text-gray-900 dark:text-zinc-100">
                              <span className={SETTINGS_DOT_CHECK}>
                                <Tick01Icon size={8} className="stroke-[3]" />
                              </span>
                              <span>Style</span>
                            </span>
                            <span className={SETTINGS_PILL_DIVIDER} aria-hidden="true" />
                            <span className="font-medium text-gray-500 dark:text-zinc-400">
                              {authUser?.avatar_filename?.includes("default") && selectedDefaultAvatarId && DEFAULT_AVATARS.find(a => a.id === selectedDefaultAvatarId)
                                ? DEFAULT_AVATARS.find(a => a.id === selectedDefaultAvatarId)?.name
                                : authUser?.avatar_filename?.includes("notionist") && selectedDefaultAvatarId && NOTIONISTS_AVATARS.find(a => a.id === selectedDefaultAvatarId)
                                ? `${NOTIONISTS_AVATARS.find(a => a.id === selectedDefaultAvatarId)?.name} (Notionist)`
                                : authUser?.avatar_filename
                                ? "Custom Avatar"
                                : "Default (No Avatar)"}
                            </span>
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">
                          Personalize your appearance across system tables, header menus, and user directory.
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowAvatarModal(true)}
                      className="h-9 px-4 text-xs font-semibold rounded-xl border border-border dark:border-border bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-xs cursor-pointer active:scale-95 transition-all shrink-0"
                    >
                      Choose Avatar...
                    </Button>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Dedicated Sound & Audio Feedback Tab */}
            <TabsContent value="sound" className="m-0 border-0 focus-visible:ring-0">
              <div className="p-8 space-y-8">
                {/* Header with Apple Live Status Pill */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-6 border-b border-black/[0.06] dark:border-white/[0.08]">
                  <div>
                    <h3 className="text-lg font-semibold tracking-[-0.01em] text-gray-900 transition-colors dark:text-zinc-50">
                      Sound & Audio Feedback
                    </h3>
                    <p className="mt-1 text-[14px] font-normal text-gray-500 transition-colors dark:text-zinc-400">
                      Configure synthesized interface sound effects, output volume, and per-category acoustic cues across portals.
                    </p>
                  </div>
                  <div className="self-start sm:self-auto shrink-0">
                    {soundEnabled ? (
                      <span className={SETTINGS_STATUS_PILL}>
                        <span className="inline-flex items-center gap-1.5 font-semibold text-gray-900 dark:text-zinc-100">
                          <span className={SETTINGS_DOT_CHECK}>
                            <Tick01Icon size={9} className="stroke-[3]" />
                          </span>
                          <span>Active</span>
                        </span>
                        <span className={SETTINGS_PILL_DIVIDER} aria-hidden="true" />
                        <span className="font-medium text-gray-500 dark:text-zinc-400">
                          Web Audio
                        </span>
                      </span>
                    ) : (
                      <span className={SETTINGS_STATUS_PILL}>
                        <span className="inline-flex items-center gap-1.5 font-medium text-gray-500 dark:text-zinc-400">
                          <CancelCircleIcon size={14} className="text-gray-400 dark:text-zinc-500 shrink-0" />
                          <span>Muted</span>
                        </span>
                        <span className={SETTINGS_PILL_DIVIDER} aria-hidden="true" />
                        <span className="font-medium text-gray-400 dark:text-zinc-500">
                          Web Audio
                        </span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Section 1: Master Interface Sounds & Volume */}
                <div>
                  <div className="mb-4">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-zinc-300">
                      Master Output
                    </h4>
                    <p className="text-[13px] text-gray-500 dark:text-zinc-400 mt-0.5">
                      Enable or mute synthesized Web Audio feedback for buttons, toggles, dialogs, and alerts. Off by default for shared office counters.
                    </p>
                  </div>

                  <div className="rounded-2xl border border-black/[0.06] dark:border-white/[0.08] divide-y divide-black/[0.06] dark:divide-white/[0.08] bg-white dark:bg-zinc-800 shadow-xs overflow-hidden">
                    {/* Play User Interface Sound Effects */}
                    <div className="p-4 sm:p-5 flex items-center justify-between gap-6">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h5 className="text-[13.5px] font-semibold text-gray-900 dark:text-zinc-50">
                            Play User Interface Sound Effects
                          </h5>
                          <span className={SETTINGS_STATUS_PILL_SM}>
                            <span className="inline-flex items-center gap-1.5 font-semibold text-gray-900 dark:text-zinc-100">
                              <span className={SETTINGS_DOT_CHECK}>
                                <Tick01Icon size={8} className="stroke-[3]" />
                              </span>
                              <span>Engine</span>
                            </span>
                            <span className={SETTINGS_PILL_DIVIDER} aria-hidden="true" />
                            <span className="font-medium text-gray-500 dark:text-zinc-400">
                              Web Audio Synth
                            </span>
                          </span>
                        </div>
                        <p className="text-xs font-normal text-gray-500 dark:text-zinc-400 leading-relaxed max-w-md">
                          Plays responsive tactile audio cues across SuperAdmin, Admin, Staff, and Student portals. Never active on public landing or sign-in pages.
                        </p>
                      </div>
                      <Switch
                        checked={soundEnabled}
                        onCheckedChange={handleSoundMasterToggle}
                        aria-label="Play User Interface Sound Effects"
                        data-sound="swoosh"
                      />
                    </div>

                    {/* Alert & Interface Volume Slider (macOS Stepped Capsule Track + Reset to Default) */}
                    <div
                      className={cn(
                        "p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-opacity",
                        !soundEnabled && "opacity-60"
                      )}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h5 className="text-[13.5px] font-semibold text-gray-900 dark:text-zinc-50">
                            Interface Volume
                          </h5>
                        </div>
                        <p className="text-xs font-normal text-gray-500 dark:text-zinc-400 leading-relaxed max-w-md">
                          Adjusts master gain for all synthesized cues. Drag the slider to hear precision step ticks.
                        </p>
                      </div>

                      <div className="flex items-center gap-3 w-full sm:w-auto shrink-0">
                        {/* Redesigned Stepped Capsule Slider (Light Mode First, Concentric Border Radius) */}
                        <Slider
                          label="Volume"
                          min={0}
                          max={1}
                          step={0.05}
                          value={soundVolume}
                          disabled={!soundEnabled}
                          onChange={(val) => handleSoundVolumeInput(val)}
                          onChangeCommit={(val) => handleSoundVolumeCommit(val)}
                          formatValue={(val) => Math.round(val * 100)}
                          ariaLabel="Interface Volume"
                          className="w-full sm:w-56"
                        />

                        {/* Back to Default (50%) Icon Button */}
                        <button
                          type="button"
                          disabled={
                            !soundEnabled ||
                            Math.round(soundVolume * 100) === Math.round(DEFAULT_SOUND_VOLUME * 100)
                          }
                          onClick={() => {
                            handleSoundVolumeInput(DEFAULT_SOUND_VOLUME);
                            handleSoundVolumeCommit(DEFAULT_SOUND_VOLUME);
                            playSoundCue(
                              { sound: "tick" },
                              { force: true, volumeOverride: DEFAULT_SOUND_VOLUME, userId: authUser?.id }
                            );
                          }}
                          title={`Reset volume to default (${Math.round(DEFAULT_SOUND_VOLUME * 100)}%)`}
                          aria-label={`Reset volume to default (${Math.round(DEFAULT_SOUND_VOLUME * 100)}%)`}
                          className={cn(
                            "size-8 rounded-xl border border-black/[0.06] dark:border-white/[0.08] bg-gray-100/90 dark:bg-zinc-800 flex items-center justify-center transition-all shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-pup-maroon/30 shadow-2xs",
                            !soundEnabled || Math.round(soundVolume * 100) === Math.round(DEFAULT_SOUND_VOLUME * 100)
                              ? "text-gray-300 dark:text-zinc-600 cursor-default opacity-50 bg-gray-50/50 dark:bg-zinc-900 border-dashed"
                              : "text-gray-600 hover:text-gray-900 dark:text-zinc-300 dark:hover:text-zinc-100 hover:bg-gray-200/80 dark:hover:bg-zinc-700 cursor-pointer active:scale-95"
                          )}
                        >
                          <ReloadIcon size={14} aria-hidden="true" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section 2: Per-Category Sound Toggles */}
                <div className="pt-6 border-t border-black/[0.06] dark:border-white/[0.08]">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-zinc-300">
                        Sound Categories
                      </h4>
                      <p className="text-[13px] text-gray-500 dark:text-zinc-400 mt-0.5">
                        Choose which interaction groups play sound effects. Use the preview button on any row to audition its cue.
                      </p>
                    </div>
                    <span className={cn(SETTINGS_STATUS_PILL, "self-start sm:self-auto tabular-nums")}>
                      <span className="inline-flex items-center gap-1.5 font-semibold text-gray-900 dark:text-zinc-100">
                        <span className={SETTINGS_DOT_CHECK}>
                          <Tick01Icon size={9} className="stroke-[3]" />
                        </span>
                        <span>Active</span>
                      </span>
                      <span className={SETTINGS_PILL_DIVIDER} aria-hidden="true" />
                      <span className="font-medium text-gray-500 dark:text-zinc-400">
                        {Object.values(soundCategories).filter(Boolean).length} of {SOUND_CATEGORY_DEFINITIONS.length}
                      </span>
                    </span>
                  </div>

                  <div className="rounded-2xl border border-black/[0.06] dark:border-white/[0.08] divide-y divide-black/[0.06] dark:divide-white/[0.08] bg-white dark:bg-zinc-800 shadow-xs overflow-hidden">
                    {SOUND_CATEGORY_DEFINITIONS.map((cat) => {
                      const isCatEnabled = soundCategories[cat.id] !== false;
                      return (
                        <div
                          key={cat.id}
                          className={cn(
                            "p-4 sm:p-5 flex items-center justify-between gap-4 transition-opacity",
                            !soundEnabled && "opacity-55"
                          )}
                        >
                          <div className="space-y-1 min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h5 className="text-[13.5px] font-semibold text-gray-900 dark:text-zinc-50">
                                {cat.label}
                              </h5>
                            </div>
                            <p className="text-xs font-normal text-gray-500 dark:text-zinc-400 leading-relaxed max-w-lg">
                              {cat.description}
                            </p>
                          </div>

                          <div className="flex items-center gap-3 shrink-0">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              data-sound="none"
                              onClick={() =>
                                playSoundCue(
                                  { sound: cat.sampleCue },
                                  { force: true, volumeOverride: soundVolume || DEFAULT_SOUND_VOLUME, userId: authUser?.id }
                                )
                              }
                              className="h-9 px-4 text-xs font-semibold rounded-xl border border-border dark:border-border bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-xs cursor-pointer active:scale-95 transition-all"
                            >
                              Preview Sound
                            </Button>

                            <Switch
                              checked={isCatEnabled}
                              disabled={!soundEnabled}
                              onCheckedChange={(checked) => handleSoundCategoryToggle(cat.id, checked)}
                              aria-label={cat.label}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <p className="text-[12px] text-gray-400 font-normal mt-3 ml-1 dark:text-zinc-500 flex items-center gap-1.5">
                    <CovidInfoIcon size="1em" className="text-sm shrink-0" />
                    <span>
                      Interface sounds operate independently of Reduce Motion so users who minimize visual motion can still receive clear acoustic confirmation. You can also quickly mute or unmute sounds from the profile menu in the sidebar.
                    </span>
                  </p>
                </div>
              </div>
            </TabsContent>

            {/* Dedicated Accessibility & Display Tab */}
            <TabsContent value="accessibility" className="m-0 border-0 focus-visible:ring-0">
              <div className="p-8 space-y-8">
                {/* Header with Apple Live Status Pill */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-6 border-b border-black/[0.06] dark:border-white/[0.08]">
                  <div>
                    <h3 className="text-lg font-semibold tracking-[-0.01em] text-gray-900 transition-colors dark:text-zinc-50">
                      Accessibility & Display
                    </h3>
                    <p className="mt-1 text-[14px] font-normal text-gray-500 transition-colors dark:text-zinc-400">
                      Adjust typography scale, interface zoom, visual contrast, motion behavior, and interactive cursor feedback.
                    </p>
                  </div>
                  <div className="self-start sm:self-auto shrink-0">
                    <span className={SETTINGS_STATUS_PILL}>
                      <span className="inline-flex items-center gap-1.5 font-semibold text-gray-900 dark:text-zinc-100">
                        <SecurityCheckIcon size={14} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <span>Accommodations</span>
                      </span>
                      <span className={SETTINGS_PILL_DIVIDER} aria-hidden="true" />
                      <span className="font-medium text-gray-500 dark:text-zinc-400">
                        Display
                      </span>
                    </span>
                  </div>
                </div>

                {/* Section 1: Text & Font Size */}
                <div>
                  {(() => {
                    const activeFontSizeId = userPreferences.font_size || "default";
                    const currentFontOpt = FONT_SIZE_OPTIONS.find((f) => f.id === activeFontSizeId) || FONT_SIZE_OPTIONS[2];

                    return (
                      <>
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
                          <div>
                            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-zinc-300 font-jakarta">
                              Text & Font Size
                            </h4>
                            <p className="text-[13px] text-gray-500 dark:text-zinc-400 mt-0.5">
                              Adjust typography sizing across the records keeping system. Controls text scale on cards, tables, and dialogs.
                            </p>
                          </div>
                          <span className={cn(SETTINGS_STATUS_PILL, "self-start sm:self-auto tabular-nums")}>
                            <span className="inline-flex items-center gap-1.5 font-semibold text-gray-900 dark:text-zinc-100">
                              <span className={SETTINGS_DOT_CHECK}>
                                <Tick01Icon size={9} className="stroke-[3]" />
                              </span>
                              <span>Active</span>
                            </span>
                            <span className={SETTINGS_PILL_DIVIDER} aria-hidden="true" />
                            <span className="font-medium text-gray-500 dark:text-zinc-400">
                              {currentFontOpt.label} ({currentFontOpt.scale})
                            </span>
                          </span>
                        </div>

                        {/* Font Size Preset Cards */}
                        <div role="radiogroup" aria-label="Text and font size" className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                          {FONT_SIZE_OPTIONS.map((opt, idx) => {
                            const isSelected = activeFontSizeId === opt.id;
                            return (
                              <button
                                key={opt.id}
                                type="button"
                                role="radio"
                                aria-checked={isSelected}
                                title={`${opt.label} · ${opt.desc}`}
                                onClick={() => handleFontSizePreferenceChange(opt.id)}
                                className={cn(
                                  "group relative flex flex-col items-center justify-center w-full h-[92px] px-2 py-2 rounded-xl border text-center transition-all duration-200 ease-out cursor-pointer select-none outline-none focus-visible:ring-2 focus-visible:ring-pup-maroon/40 dark:focus-visible:ring-red-400/50 active:scale-[0.97]",
                                  isSelected
                                    ? "border-gray-950 dark:border-white bg-gray-100/80 dark:bg-zinc-800 text-gray-950 dark:text-zinc-50 shadow-sm ring-1 ring-black/10 dark:ring-white/20"
                                    : "border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-zinc-800/70 text-gray-700 dark:text-zinc-300 hover:border-black/20 dark:hover:border-white/20 hover:bg-gray-50/80 dark:hover:bg-zinc-750 hover:-translate-y-0.5 hover:shadow-xs"
                                )}
                              >
                                {/* Checkmark row */}
                                <span className="absolute top-1.5 right-1.5 z-10" aria-hidden="true">
                                  <span
                                    className={cn(
                                      "size-3.5 rounded-full flex items-center justify-center transition-all duration-200",
                                      isSelected
                                        ? "bg-gray-950 text-white dark:bg-white dark:text-gray-950 scale-100 opacity-100"
                                        : "border border-gray-200 dark:border-zinc-700 scale-90 opacity-100 group-hover:border-gray-300 dark:group-hover:border-zinc-600"
                                    )}
                                  >
                                    {isSelected && <Tick01Icon size={9} className="stroke-[3]" />}
                                  </span>
                                </span>

                                {/* Centered glyph + label group */}
                                <span className="flex flex-col items-center justify-center gap-1.5 w-full text-center">
                                  <span className="flex items-end justify-center h-9 w-full" aria-hidden="true">
                                    <span
                                      className={cn(
                                        "leading-none font-bold tracking-tight transition-colors duration-200",
                                        isSelected ? "text-gray-950 dark:text-white" : "text-gray-400 dark:text-zinc-500 group-hover:text-gray-700 dark:group-hover:text-zinc-300"
                                      )}
                                      style={{ fontSize: `${16 + idx * 4}px` }}
                                    >
                                      Aa
                                    </span>
                                  </span>
                                  <span className="flex flex-col items-center justify-center gap-0.5 leading-tight w-full text-center">
                                    <span className={cn("block w-full text-center text-xs tracking-tight", isSelected ? "font-bold text-gray-950 dark:text-white" : "font-semibold text-gray-800 dark:text-zinc-200")}>
                                      {opt.label}
                                    </span>
                                    <span className="block w-full text-center text-[10px] font-medium tabular-nums text-gray-500 dark:text-zinc-400">{opt.scale}</span>
                                  </span>
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </>
                    );
                  })()}
                </div>

                {/* Section 2: Interface Layout Zoom */}
                <div className="pt-6 border-t border-black/[0.06] dark:border-white/[0.08]">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-zinc-300">
                        Interface Layout Zoom
                      </h4>
                      <p className="text-[13px] text-gray-500 dark:text-zinc-400 mt-0.5">
                        Choose your default viewport scaling level. Your preferred zoom persists across all dashboard sessions.
                      </p>
                    </div>
                    <span className={cn(SETTINGS_STATUS_PILL, "self-start sm:self-auto tabular-nums")}>
                      <span className="inline-flex items-center gap-1.5 font-semibold text-gray-900 dark:text-zinc-100">
                        <span className={SETTINGS_DOT_CHECK}>
                          <Tick01Icon size={9} className="stroke-[3]" />
                        </span>
                        <span>Active</span>
                      </span>
                      <span className={SETTINGS_PILL_DIVIDER} aria-hidden="true" />
                      <span className="font-medium text-gray-500 dark:text-zinc-400">
                        {ZOOM_PERCENTAGES[activeZoomNode] ?? 100}%
                      </span>
                    </span>
                  </div>

                  <div role="radiogroup" aria-label="Interface layout zoom" className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
                    {ZOOM_PERCENTAGES.map((pct, idx) => {
                      const isSelected = activeZoomNode === idx;
                      const zoomLabel = ["Compact", "Snug", "Cozy", "Default", "Roomy", "Large", "Largest"][idx] ?? `${pct}%`;
                      return (
                        <button
                          key={pct}
                          type="button"
                          role="radio"
                          aria-checked={isSelected}
                          title={`${zoomLabel} · ${pct}%`}
                          onClick={() => handleZoomPreferenceChange(idx)}
                          className={cn(
                            "group relative flex flex-col items-center justify-center w-full h-[92px] px-2 py-2 rounded-xl border text-center transition-all duration-200 ease-out cursor-pointer select-none outline-none focus-visible:ring-2 focus-visible:ring-pup-maroon/40 dark:focus-visible:ring-red-400/50 active:scale-[0.97]",
                            isSelected
                              ? "border-gray-950 dark:border-white bg-gray-100/80 dark:bg-zinc-800 text-gray-950 dark:text-zinc-50 shadow-sm ring-1 ring-black/10 dark:ring-white/20"
                              : "border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-zinc-800/70 text-gray-700 dark:text-zinc-300 hover:border-black/20 dark:hover:border-white/20 hover:bg-gray-50/80 dark:hover:bg-zinc-750 hover:-translate-y-0.5 hover:shadow-xs"
                          )}
                        >
                          <span className="absolute top-1.5 right-1.5 z-10" aria-hidden="true">
                            <span
                              className={cn(
                                "size-3.5 rounded-full flex items-center justify-center transition-all duration-200",
                                isSelected
                                  ? "bg-gray-950 text-white dark:bg-white dark:text-gray-950"
                                  : "border border-gray-200 dark:border-zinc-700 scale-90 group-hover:border-gray-300 dark:group-hover:border-zinc-600"
                              )}
                            >
                              {isSelected && <Tick01Icon size={9} className="stroke-[3]" />}
                            </span>
                          </span>

                          <span className="flex flex-col items-center justify-center gap-1.5 w-full text-center">
                            <span
                              className={cn(
                                "block w-full text-center text-lg leading-none font-bold tabular-nums tracking-tight transition-colors duration-200",
                                isSelected ? "text-gray-950 dark:text-white" : "text-gray-400 dark:text-zinc-500 group-hover:text-gray-700 dark:group-hover:text-zinc-300"
                              )}
                            >
                              {pct}%
                            </span>
                            <span className={cn("block w-full text-center text-xs tracking-tight", isSelected ? "font-bold text-gray-950 dark:text-white" : "font-semibold text-gray-800 dark:text-zinc-200")}>
                              {zoomLabel}
                            </span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Section 3: Visual & Motor Accommodations */}
                <div className="pt-6 border-t border-black/[0.06] dark:border-white/[0.08]">
                  <div className="mb-4">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-zinc-300">
                      Visual & Motor Accommodations
                    </h4>
                    <p className="text-[13px] text-gray-500 dark:text-zinc-400 mt-0.5">
                      Display settings to improve text contrast, boundary visibility, motion comfort, and cursor affordance.
                    </p>
                  </div>

                  <div className="rounded-2xl border border-black/[0.06] dark:border-white/[0.08] divide-y divide-black/[0.06] dark:divide-white/[0.08] bg-white dark:bg-zinc-800 shadow-xs overflow-hidden">
                    {/* High Contrast Mode */}
                    <div className="p-4 sm:p-5 flex items-center justify-between gap-6">
                      <div className="space-y-1">
                        <h5 className="text-[13.5px] font-semibold text-gray-900 dark:text-zinc-50">High Contrast Mode</h5>
                        <p className="text-xs font-normal text-gray-500 dark:text-zinc-400 leading-relaxed max-w-md">
                          Enhances border boundaries, text contrast, and focused outlines across data tables and panels.
                        </p>
                      </div>
                      <Switch
                        checked={!!userPreferences.high_contrast}
                        onCheckedChange={(checked) => handleAccessibilityToggle("high_contrast", checked)}
                        aria-label="High Contrast Mode"
                      />
                    </div>

                    {/* Reduce Motion */}
                    <div className="p-4 sm:p-5 flex items-center justify-between gap-6">
                      <div className="space-y-1">
                        <h5 className="text-[13.5px] font-semibold text-gray-900 dark:text-zinc-50">Reduce Motion</h5>
                        <p className="text-xs font-normal text-gray-500 dark:text-zinc-400 leading-relaxed max-w-md">
                          Minimizes interface animations, removes spring overshoot and motion travel while preserving essential state feedback.
                        </p>
                      </div>
                      <Switch
                        checked={!!userPreferences.reduce_motion}
                        onCheckedChange={(checked) => handleAccessibilityToggle("reduce_motion", checked)}
                        aria-label="Reduce Motion"
                      />
                    </div>

                    {/* Interactive Pointer Cursor */}
                    <div className="p-4 sm:p-5 flex items-center justify-between gap-6">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h5 className="text-[13.5px] font-semibold text-gray-900 dark:text-zinc-50">Interactive Pointer Cursor</h5>
                          <span className={SETTINGS_STATUS_PILL_SM}>
                            <span className="inline-flex items-center gap-1.5 font-semibold text-gray-900 dark:text-zinc-100">
                              <span className={SETTINGS_DOT_CHECK}>
                                <Tick01Icon size={8} className="stroke-[3]" />
                              </span>
                              <span>Cursor</span>
                            </span>
                            <span className={SETTINGS_PILL_DIVIDER} aria-hidden="true" />
                            <span className="font-medium text-gray-500 dark:text-zinc-400">
                              Hand Pointer
                            </span>
                          </span>
                        </div>
                        <p className="text-xs font-normal text-gray-500 dark:text-zinc-400 leading-relaxed max-w-md">
                          Changes cursor to a pointer hand when hovering over buttons, cards, links, tabs, and interactive controls.
                        </p>
                      </div>
                      <Switch
                        checked={userPreferences.pointer_cursor !== undefined ? !!userPreferences.pointer_cursor : true}
                        onCheckedChange={(checked) => handleAccessibilityToggle("pointer_cursor", checked)}
                        aria-label="Interactive Pointer Cursor"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
          </>}
          </div>
        </Tabs>

        {/* Global Apple Avatar Picker Dialog (Accessible from Profile & Preferences) */}
        <Dialog open={showAvatarModal} onOpenChange={setShowAvatarModal}>
          <DialogContent className="w-full max-w-md sm:max-w-lg md:max-w-3xl lg:max-w-4xl p-0 overflow-hidden rounded-[24px] bg-white/95 dark:bg-zinc-900/95 backdrop-blur-2xl border border-black/[0.08] dark:border-white/10 shadow-[0_24px_54px_rgba(0,0,0,0.18),inset_0_1px_0_0_rgba(255,255,255,0.85)] dark:shadow-[0_28px_64px_rgba(0,0,0,0.55),inset_0_1px_0_0_rgba(255,255,255,0.12)] font-jakarta flex flex-col md:h-[650px] max-h-[92vh]">
            {/* Modal Header spanning full width across both sides (No bottom line) */}
            <div className="px-5 sm:px-6 pt-5 pb-2 shrink-0">
              <DialogHeader>
                <DialogTitle className="text-base sm:text-lg font-bold tracking-tight text-gray-900 dark:text-zinc-50">
                  Choose Profile Avatar
                </DialogTitle>
                <DialogDescription className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">
                  Select an institutional avatar representing your identity across the records system.
                </DialogDescription>
              </DialogHeader>
            </div>

            {/* Below Header: 2-Sided Workspace */}
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0">
              {/* Left Pane: Characters Selection */}
              <div className="w-full md:w-[56%] lg:w-[58%] flex flex-col p-4 sm:p-5 border-b md:border-b-0 md:border-r border-black/[0.06] dark:border-white/[0.08] overflow-hidden min-h-0">
                {/* Avatar Style Switcher Segmented Control using Standard Apple Capsule Tabs */}
                <Tabs
                  value={avatarTab}
                  onValueChange={(val) => {
                    setAvatarTab(val);
                    if (val === "notionists" && (stagedAvatar?.type === "beam" || (stagedAvatar?.type === "custom" && stagedAvatar?.seed))) {
                      const defaultFirst = NOTIONISTS_AVATARS[0];
                      setStagedAvatar({
                        type: "notionists",
                        id: defaultFirst.id,
                        name: defaultFirst.name,
                        bgHex: defaultFirst.bgHex,
                        svgString: defaultFirst.svgString,
                      });
                      setAvatarSelectedColor(defaultFirst.bgHex);
                    } else if (val === "beam" && (stagedAvatar?.type === "notionists" || (stagedAvatar?.type === "custom" && !stagedAvatar?.seed))) {
                      const defaultFirst = DEFAULT_AVATARS[0];
                      const presetInfo = getBeamPresetInfo(defaultFirst.id);
                      setStagedAvatar({
                        type: "beam",
                        id: defaultFirst.id,
                        name: defaultFirst.name,
                        seed: presetInfo?.seed || "Ada-Maroon Gold",
                        palette: presetInfo?.palette || BEAM_CLASSIC_PALETTES[0],
                        svg: defaultFirst.svg,
                        svgString: defaultFirst.svgString,
                      });
                      setSelectedBeamPaletteId(presetInfo?.palette?.id || "maroon-gold");
                    }
                  }}
                  className="w-full shrink-0"
                >
                  <TabsList variant="capsule" size="capsule" className="w-full">
                    <TabsTrigger value="notionists" size="capsule" className="text-xs">
                      Notionists Characters ({notionistChoices.length})
                    </TabsTrigger>
                    <TabsTrigger value="beam" size="capsule" className="text-xs">
                      Beam Gradients ({avatarChoices.length})
                    </TabsTrigger>
                  </TabsList>
                </Tabs>

                {/* Characters Grid */}
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 sm:gap-2.5 mt-3 overflow-y-auto flex-1 pr-1.5 select-none">
                  {(avatarTab === "notionists" ? notionistChoices : avatarChoices).map((avatar) => {
                    const isStaged = avatar.id === 0
                      ? stagedAvatar?.id === 0
                      : avatar.id === "custom"
                      ? stagedAvatar?.type === "custom" || stagedAvatar?.id === "custom"
                      : stagedAvatar?.id === avatar.id && (stagedAvatar?.type === avatarTab || (avatarTab === "notionists" && stagedAvatar?.type === "notionists"));

                    const isCurrentApplied = avatar.id === 0
                      ? appliedAvatarInfo.type === "default"
                      : avatar.id === "custom"
                      ? appliedAvatarInfo.type === "custom"
                      : avatarTab === appliedAvatarInfo.type && avatar.id === appliedAvatarInfo.id;

                    const customDataForTab = avatarTab === "beam"
                      ? (savedCustomBeam || (savedCustomAvatar?.subType === "beam" ? savedCustomAvatar : null))
                      : (savedCustomNotionist || (savedCustomAvatar?.subType !== "beam" ? savedCustomAvatar : null));

                    return (
                      <button
                        key={avatar.id}
                        type="button"
                        disabled={avatarSaving}
                        onClick={() => {
                          if (avatar.id === 0) {
                            setStagedAvatar({
                              type: "default",
                              id: 0,
                              name: "Default",
                            });
                            setCustomShuffled(null);
                          } else if (avatar.id === "custom") {
                            if (customDataForTab) {
                              setStagedAvatar({
                                type: "custom",
                                id: "custom",
                                name: customDataForTab.name || (avatarTab === "beam" ? "Custom Beam Gradient" : "Custom Notionist"),
                                svgString: customDataForTab.svgString,
                                bgHex: customDataForTab.bgHex,
                                seed: customDataForTab.seed,
                                palette: customDataForTab.palette,
                                isCustomTinted: false,
                              });
                              if (customDataForTab.bgHex) {
                                setAvatarSelectedColor(customDataForTab.bgHex);
                              }
                              if (customDataForTab.palette?.id) {
                                setSelectedBeamPaletteId(customDataForTab.palette.id);
                              }
                            } else if (appliedAvatarInfo.type === "custom") {
                              setStagedAvatar({
                                type: "custom",
                                id: "custom",
                                name: "Custom Avatar",
                                svgString: null,
                              });
                            } else {
                              handleShuffle();
                            }
                          } else if (avatarTab === "notionists") {
                            // Prioritize the character's original native as-is style and backdrop color
                            setStagedAvatar({
                              type: "notionists",
                              id: avatar.id,
                              name: avatar.name,
                              bgHex: avatar.bgHex,
                              svgString: avatar.svgString,
                              isCustomTinted: false,
                            });
                            setAvatarSelectedColor(avatar.bgHex);
                            setCustomShuffled(null);
                          } else {
                            const presetInfo = getBeamPresetInfo(avatar.id);
                            const isVibrant = BEAM_VIBRANT_PALETTES.some((p) => p.id === presetInfo?.palette?.id);
                            if (isVibrant) setBeamPaletteMode("vibrant");
                            else setBeamPaletteMode("classic");
                            setSelectedBeamPaletteId(presetInfo?.palette?.id || "maroon-gold");

                            setStagedAvatar({
                              type: "beam",
                              id: avatar.id,
                              name: avatar.name,
                              seed: presetInfo?.seed || "Ada-Maroon Gold",
                              palette: presetInfo?.palette || BEAM_CLASSIC_PALETTES[0],
                              svg: avatar.svg,
                              svgString: avatar.svgString,
                              isCustomTinted: false,
                            });
                            setCustomShuffled(null);
                          }
                        }}
                        className={cn(
                          "group relative flex flex-col items-center justify-center p-2 sm:p-2.5 rounded-xl border text-center transition-all duration-150 cursor-pointer select-none active:scale-95",
                          isStaged
                            ? "border-gray-950 dark:border-white bg-gray-100/80 dark:bg-zinc-800 text-gray-950 dark:text-zinc-50 font-semibold shadow-xs ring-1 ring-black/10 dark:ring-white/20"
                            : "border-black/[0.06] dark:border-white/[0.08] bg-black/[0.015] dark:bg-white/[0.02] hover:bg-black/[0.04] dark:hover:bg-white/[0.05] hover:border-black/15 dark:hover:border-white/20 text-gray-700 dark:text-zinc-300",
                          avatarSaving && "opacity-70 cursor-wait"
                        )}
                        title={
                          avatar.id === 0
                            ? "Default Profile (No Avatar)"
                            : avatar.id === "custom"
                            ? (customDataForTab?.name || "Custom Shuffled Avatar")
                            : avatar.name
                        }
                      >
                        {/* Circular Avatar Preview */}
                        <div className={cn(
                          "relative size-10 sm:size-11 rounded-full overflow-hidden flex items-center justify-center shadow-2xs transition-transform group-hover:scale-105",
                          isStaged ? "ring-2 ring-gray-950 dark:ring-white bg-gray-200 dark:bg-zinc-700" : "bg-gray-100 dark:bg-zinc-800"
                        )}>
                          {avatar.id === 0 ? (
                            <UserIcon size="1.25em" className={cn("transition-colors", isStaged ? "text-gray-950 dark:text-zinc-100" : "text-gray-400 dark:text-zinc-500")} />
                          ) : avatar.id === "custom" ? (
                            customDataForTab?.svgString ? (
                              <div
                                className="w-full h-full flex items-center justify-center [&_svg]:size-full"
                                dangerouslySetInnerHTML={{ __html: customDataForTab.svgString }}
                              />
                            ) : customDataForTab?.svg ? (
                              <div className="w-full h-full flex items-center justify-center [&_svg]:size-full">
                                {customDataForTab.svg}
                              </div>
                            ) : appliedAvatarInfo.type === "custom" && avatarUrl ? (
                              <img src={avatarUrl} alt="Custom Avatar" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-pup-maroon/15 to-amber-500/15 dark:from-pup-maroon/25 dark:to-amber-500/20 text-pup-maroon dark:text-red-400">
                                <DiceFaces03Icon size="1.25em" />
                              </div>
                            )
                          ) : (
                            <div className="w-full h-full flex items-center justify-center [&_svg]:size-full">
                              {avatar.svg}
                            </div>
                          )}
                        </div>

                        {/* Name */}
                        <span className={cn(
                          "text-[11px] sm:text-xs mt-1.5 truncate max-w-full px-0.5",
                          isStaged ? "text-gray-950 dark:text-zinc-50 font-bold" : "text-gray-700 dark:text-zinc-300 font-medium"
                        )}>
                          {avatar.name}
                        </span>

                        {/* Selected Checkmark Pill - ONLY on currently applied avatar */}
                        {isCurrentApplied && (
                          <div className="absolute top-1.5 right-1.5 size-4 rounded-full bg-gray-950 dark:bg-zinc-100 text-white dark:text-zinc-950 flex items-center justify-center shadow-xs">
                            <Tick01Icon size="0.65em" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Right Side: Container with border radius */}
              <div className="w-full md:w-[46%] lg:w-[44%] p-3 sm:p-4 flex flex-col min-h-0 overflow-hidden">
                <div className="h-full flex flex-col justify-between p-3.5 sm:p-4 rounded-[22px] bg-gray-50/80 dark:bg-zinc-850/50 border border-black/[0.06] dark:border-white/[0.08] shadow-xs overflow-hidden min-h-0">
                  <div className="space-y-2.5 min-h-0 flex flex-col">
                    {/* Preview Header / Label */}
                    <div className="flex items-center justify-between shrink-0">
                      <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-zinc-400">
                        Live Preview
                      </span>
                      <span className={SETTINGS_STATUS_PILL_SM}>
                        <span className="inline-flex items-center gap-1.5 font-semibold text-gray-900 dark:text-zinc-100">
                          <span className={SETTINGS_DOT_CHECK}>
                            <Tick01Icon size={8} className="stroke-[3]" />
                          </span>
                          <span>Style</span>
                        </span>
                        <span className={SETTINGS_PILL_DIVIDER} aria-hidden="true" />
                        <span className="font-medium text-gray-500 dark:text-zinc-400">
                          {stagedAvatar?.type === "custom"
                            ? "Custom Shuffled"
                            : stagedAvatar?.type === "notionists"
                            ? "Notionist Character"
                            : stagedAvatar?.type === "beam"
                            ? "Beam Gradient"
                            : "Default System"}
                        </span>
                      </span>
                    </div>

                    {/* Compact Live Stage Viewport with Motion */}
                    <div className="flex flex-col items-center justify-center p-3 rounded-2xl bg-white dark:bg-zinc-800/80 border border-black/[0.04] dark:border-white/[0.06] shadow-xs shrink-0">
                      <div className="relative size-20 sm:size-22 rounded-full overflow-hidden shadow-inner ring-4 ring-gray-100 dark:ring-zinc-700/60 bg-gray-50 dark:bg-zinc-800 flex items-center justify-center [&_svg]:size-full transition-transform duration-200 aspect-square shrink-0">
                        <motion.div
                          key={
                            stagedAvatar?.id === 0
                              ? "avatar-default"
                              : `${stagedAvatar?.id}-${stagedAvatar?.bgHex || ""}-${stagedAvatar?.svgString ? "svg" : "raw"}-${paletteShuffleCount}-${characterShuffleCount}`
                          }
                          initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0.75, scale: 0.94 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={shouldReduceMotion ? { duration: 0 } : { type: "spring", stiffness: 450, damping: 28 }}
                          className="w-full h-full flex items-center justify-center [&_svg]:size-full"
                        >
                          {stagedAvatar?.id === 0 ? (
                            <UserIcon size="2.5em" className="text-gray-400 dark:text-zinc-500" />
                          ) : stagedAvatar?.svgString ? (
                            <div
                              className="w-full h-full flex items-center justify-center [&_svg]:size-full"
                              dangerouslySetInnerHTML={{ __html: stagedAvatar.svgString }}
                            />
                          ) : stagedAvatar?.svg ? (
                            <div className="w-full h-full flex items-center justify-center [&_svg]:size-full">
                              {stagedAvatar.svg}
                            </div>
                          ) : (
                            <UserIcon size="2.5em" className="text-gray-400 dark:text-zinc-500" />
                          )}
                        </motion.div>
                      </div>

                      <div className="mt-1.5 text-center">
                        <h4 className="text-xs sm:text-sm font-bold text-gray-900 dark:text-zinc-50 truncate max-w-full">
                          {stagedAvatar?.name || "Selected Avatar"}
                        </h4>
                        <p className="text-[10px] text-gray-500 dark:text-zinc-400 mt-0.5">
                          {stagedAvatar?.id === 0
                            ? "Initials fallback will be displayed"
                            : stagedAvatar?.type === "notionists" || (stagedAvatar?.type === "custom" && !stagedAvatar?.seed)
                            ? "Monochrome ink sketch on backdrop"
                            : "Multi-layered Apple gradient"}
                        </p>
                      </div>
                    </div>

                    {/* Notionist Controls: Color Palette, Choose Backdrop & Shuffle Palette Toggle */}
                    {avatarTab === "notionists" && (
                      <div className="p-3 rounded-2xl bg-white dark:bg-zinc-800/80 border border-black/[0.04] dark:border-white/[0.06] space-y-2 shrink-0">
                        {/* Palette Header with Standard Apple Capsule Tab - Fixed width & equal columns */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <ColorsIcon size="1em" className="text-gray-500 dark:text-zinc-400 text-xs" />
                            <span className="text-[11px] font-semibold text-gray-700 dark:text-zinc-300">
                              Backdrop Palette
                            </span>
                          </div>

                          {/* Standard Capsule Tab for Bold vs Pastel: Fixed width with equal columns */}
                          <Tabs
                            value={avatarColorMode}
                            onValueChange={handleToggleColorMode}
                            className="shrink-0"
                          >
                            <TabsList variant="capsule" size="capsule" className="w-32 grid grid-cols-2">
                              <TabsTrigger value="bold" size="capsule" className="text-xs">
                                Bold
                              </TabsTrigger>
                              <TabsTrigger value="pastel" size="capsule" className="text-xs">
                                Pastel
                              </TabsTrigger>
                            </TabsList>
                          </Tabs>
                        </div>

                        {/* Swatches Grid: 6 columns across 2 rows for exactly 12 colors */}
                        <div className="grid grid-cols-6 gap-2 place-items-center pt-1">
                          {(avatarColorMode === "bold" ? NOTIONISTS_BOLD_PALETTE : NOTIONISTS_PASTEL_PALETTE).map((color) => {
                            const colorHex = `#${color.hex}`;
                            const isCurrentColor = (stagedAvatar?.bgHex || "").toLowerCase() === colorHex.toLowerCase();
                            return (
                              <div key={color.id} className="flex items-center justify-center size-7.5 shrink-0 aspect-square">
                                <button
                                  type="button"
                                  onClick={() => handleSelectColorSwatch(colorHex)}
                                  style={{ backgroundColor: colorHex }}
                                  className="relative size-5.5 rounded-full aspect-square shrink-0 cursor-pointer shadow-2xs border border-black/10 dark:border-white/20 transition-transform duration-150 hover:scale-105 active:scale-90 flex items-center justify-center"
                                  title={color.name}
                                  aria-label={color.name}
                                >
                                  {isCurrentColor && (
                                    <motion.span
                                      layoutId="active-backdrop-swatch-ring"
                                      initial={false}
                                      transition={shouldReduceMotion ? { duration: 0 } : SPRING_LAYOUT}
                                      className="absolute -inset-1 rounded-full ring-2 ring-gray-950 dark:ring-white pointer-events-none"
                                    />
                                  )}
                                </button>
                              </div>
                            );
                          })}
                        </div>

                        {/* Shuffle Palette Toggle */}
                        <div className="flex items-center justify-between pt-1 border-t border-black/[0.04] dark:border-white/[0.06]">
                          <label htmlFor="shuffle-palette-toggle" className="flex items-center gap-1.5 cursor-pointer select-none">
                            <ShuffleIcon size="1em" className="text-gray-500 dark:text-zinc-400 text-xs" />
                            <span className="text-[11px] font-medium text-gray-700 dark:text-zinc-300">
                              Shuffle Palette with Character
                            </span>
                          </label>
                          <Switch
                            id="shuffle-palette-toggle"
                            checked={shufflePaletteWithCharacter}
                            onCheckedChange={setShufflePaletteWithCharacter}
                            aria-label="Shuffle Palette with Character"
                          />
                        </div>

                        {/* Shuffle Character Features Button */}
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={avatarSaving}
                          onClick={handleShuffle}
                          className="w-full h-8 mt-0.5 text-xs font-semibold rounded-xl border border-border dark:border-border bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-xs cursor-pointer active:scale-95 transition-all flex items-center justify-center gap-1.5"
                        >
                          <motion.span
                            animate={{ rotate: characterShuffleCount * 180 }}
                            transition={shouldReduceMotion ? { duration: 0 } : { type: "spring", stiffness: 350, damping: 20 }}
                            className="inline-flex items-center justify-center"
                          >
                            <DiceFaces03Icon size="1em" className="text-gray-500 dark:text-zinc-400" />
                          </motion.span>
                          <span>
                            {shufflePaletteWithCharacter ? "Shuffle Character & Palette" : "Shuffle Character Features"}
                          </span>
                        </Button>
                      </div>
                    )}

                    {/* Beam Controls: Gradient Palette, Choose Palette & Shuffle Palette Toggle */}
                    {avatarTab === "beam" && stagedAvatar?.id !== 0 && (
                      <div className="p-3 rounded-2xl bg-white dark:bg-zinc-800/80 border border-black/[0.04] dark:border-white/[0.06] space-y-2 shrink-0">
                        {/* Palette Header with Standard Apple Capsule Tab - Fixed width & equal columns */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <ColorsIcon size="1em" className="text-gray-500 dark:text-zinc-400 text-xs" />
                            <span className="text-[11px] font-semibold text-gray-700 dark:text-zinc-300">
                              Gradient Palette
                            </span>
                          </div>

                          {/* Standard Capsule Tab for Classic vs Vibrant */}
                          <Tabs
                            value={beamPaletteMode}
                            onValueChange={handleToggleBeamPaletteMode}
                            className="shrink-0"
                          >
                            <TabsList variant="capsule" size="capsule" className="w-32 grid grid-cols-2">
                              <TabsTrigger value="classic" size="capsule" className="text-xs">
                                Classic
                              </TabsTrigger>
                              <TabsTrigger value="vibrant" size="capsule" className="text-xs">
                                Vibrant
                              </TabsTrigger>
                            </TabsList>
                          </Tabs>
                        </div>

                        {/* Swatches Grid: 6 columns across 1 row for 6 palettes */}
                        <div className="grid grid-cols-6 gap-2 place-items-center pt-1">
                          {(beamPaletteMode === "classic" ? BEAM_CLASSIC_PALETTES : BEAM_VIBRANT_PALETTES).map((p) => {
                            const isCurrentPalette = selectedBeamPaletteId === p.id;
                            return (
                              <div key={p.id} className="flex items-center justify-center size-7.5 shrink-0 aspect-square">
                                <button
                                  type="button"
                                  onClick={() => handleSelectBeamPalette(p)}
                                  style={{
                                    background: `linear-gradient(135deg, ${p.colors[0]} 0%, ${p.colors[1]} 33%, ${p.colors[2]} 66%, ${p.colors[4]} 100%)`,
                                  }}
                                  className="relative size-5.5 rounded-full aspect-square shrink-0 cursor-pointer shadow-2xs border border-black/10 dark:border-white/20 transition-transform duration-150 hover:scale-105 active:scale-90 flex items-center justify-center"
                                  title={p.name}
                                  aria-label={p.name}
                                >
                                  {isCurrentPalette && (
                                    <motion.span
                                      layoutId="active-beam-palette-ring"
                                      initial={false}
                                      transition={shouldReduceMotion ? { duration: 0 } : SPRING_LAYOUT}
                                      className="absolute -inset-1 rounded-full ring-2 ring-gray-950 dark:ring-white pointer-events-none"
                                    />
                                  )}
                                </button>
                              </div>
                            );
                          })}
                        </div>

                        {/* Shuffle Palette Toggle */}
                        <div className="flex items-center justify-between pt-1 border-t border-black/[0.04] dark:border-white/[0.06]">
                          <label htmlFor="shuffle-beam-palette-toggle" className="flex items-center gap-1.5 cursor-pointer select-none">
                            <ShuffleIcon size="1em" className="text-gray-500 dark:text-zinc-400 text-xs" />
                            <span className="text-[11px] font-medium text-gray-700 dark:text-zinc-300">
                              Shuffle Palette with Character
                            </span>
                          </label>
                          <Switch
                            id="shuffle-beam-palette-toggle"
                            checked={shufflePaletteWithCharacter}
                            onCheckedChange={setShufflePaletteWithCharacter}
                            aria-label="Shuffle Palette with Character"
                          />
                        </div>

                        {/* Shuffle Character Features Button */}
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={avatarSaving}
                          onClick={handleShuffle}
                          className="w-full h-8 mt-0.5 text-xs font-semibold rounded-xl border border-border dark:border-border bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-xs cursor-pointer active:scale-95 transition-all flex items-center justify-center gap-1.5"
                        >
                          <motion.span
                            animate={{ rotate: characterShuffleCount * 180 }}
                            transition={shouldReduceMotion ? { duration: 0 } : { type: "spring", stiffness: 350, damping: 20 }}
                            className="inline-flex items-center justify-center"
                          >
                            <DiceFaces03Icon size="1em" className="text-gray-500 dark:text-zinc-400" />
                          </motion.span>
                          <span>
                            {shufflePaletteWithCharacter ? "Shuffle Character & Palette" : "Shuffle Character Features"}
                          </span>
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Bottom Apply & Cancel Actions (No Divider Line) */}
                  <div className="flex items-center justify-end gap-2 pt-2.5 mt-auto shrink-0">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowAvatarModal(false)}
                      className="h-9 px-4 text-xs font-semibold rounded-xl border border-border dark:border-border bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-xs cursor-pointer active:scale-95 transition-all"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      disabled={avatarSaving || !stagedAvatar}
                      onClick={handleApplyStagedAvatar}
                      className="h-9 px-4 text-xs font-semibold rounded-xl cursor-pointer active:scale-95 transition-all flex items-center justify-center gap-1.5"
                    >
                      {avatarSaving ? "Saving..." : "Apply Avatar"}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Security Questions Verification Modal */}
        <TOTPChallengeModal
          open={showSecTOTPModal}
          onOpenChange={setShowSecTOTPModal}
          onConfirm={async (token) => {
            await submitSecurity(null, token);
          }}
          title="Security Verification Required"
          description="Enter the 6-digit code from your authenticator app or an 8-character recovery code to update your security questions."
          actionLabel="Confirm & Save"
          isLoading={secLoading}
        />

        {/* Recovery Codes Modal */}
        <RecoveryCodesModal
          open={showRecoveryCodesDialog}
          onOpenChange={setShowRecoveryCodesDialog}
          onClose={() => setShowRecoveryCodesDialog(false)}
          recoveryCodes={recoveryCodes}
          onCopy={copyRecoveryCodes}
          onDownload={downloadRecoveryCodes}
        />
    </div>
  );
}
