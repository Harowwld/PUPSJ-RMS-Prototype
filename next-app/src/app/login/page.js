"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Select } from "@/components/ui/select";
import { toast } from "sonner";
import { PageTransition } from "@/components/ui/motion";
import { TooltipProvider } from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { isSystemAdminRole, isAdminRole, canAccessPage } from "@/lib/roleUtils";
import { invalidateClientSession, getClientSession } from "@/lib/clientAuth";
import { fetchJsonOnce } from "@/lib/clientRequest";
import { LoginIdentifierSchema, PersonNameSchema } from "@/lib/validationSchemas";
import { formatErrorMessage } from "@/lib/errorUtils";
import { Alert01Icon, ArrowRight02Icon, CovidInfoIcon, Loading01Icon, UserSearch01Icon } from "hugeicons-react";
import AppIcon from "@/components/ui/app-icon";
const DEMO_ACCOUNTS = [
  {
    name: "Ramon Villanueva",
    title: "System Administrator",
    department: "Institutional IT & Systems",
    email: "superadmin@pup.com",
    badge: "Global",
    icon: "Shield01Icon",
    accent: "text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800/80 border-slate-200/80 dark:border-slate-700",
    badgeColor: "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300",
  },
  {
    name: "Elias Austria",
    title: "Head Registrar Administrator",
    department: "Academic Records & Approvals",
    email: "admin.registrar@pup.com",
    badge: "Registrar",
    icon: "Contact01Icon",
    accent: "text-amber-800 dark:text-amber-200 bg-amber-50 dark:bg-amber-950/40 border-amber-200/80 dark:border-amber-900/60",
    badgeColor: "bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300",
  },
  {
    name: "Marcus Reyes",
    title: "Records Keeping Personnel",
    department: "Archives, Scanning & Drawer Filing",
    email: "staff.registrar@pup.com",
    badge: "Records",
    icon: "Folder01Icon",
    accent: "text-orange-800 dark:text-orange-200 bg-orange-50 dark:bg-orange-950/40 border-orange-200/80 dark:border-orange-900/60",
    badgeColor: "bg-orange-100 dark:bg-orange-900/60 text-orange-700 dark:text-orange-300",
  },
  {
    name: "Sandra Gomez",
    title: "Student Affairs Administrator",
    department: "Good Moral & Clearance Approvals",
    email: "admin.osas@pup.com",
    badge: "OSAS",
    icon: "UserSearch01Icon",
    accent: "text-blue-800 dark:text-blue-200 bg-blue-50 dark:bg-blue-950/40 border-blue-200/80 dark:border-blue-900/60",
    badgeColor: "bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300",
  },
  {
    name: "Juanito Rizal",
    title: "Student Affairs Personnel",
    department: "Event Proposals & Organization Monitoring",
    email: "staff.osas@pup.com",
    badge: "OSAS",
    icon: "StudentIcon",
    accent: "text-sky-800 dark:text-sky-200 bg-sky-50 dark:bg-sky-950/40 border-sky-200/80 dark:border-sky-900/60",
    badgeColor: "bg-sky-100 dark:bg-sky-900/60 text-sky-700 dark:text-sky-300",
  },
  {
    name: "Juan Dela Cruz",
    title: "Undergraduate Student",
    department: "ODRS Online Document Requests",
    email: "student@pup.com",
    password: "student123",
    badge: "Student",
    icon: "GraduationScrollIcon",
    accent: "text-emerald-800 dark:text-emerald-200 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200/80 dark:border-emerald-900/60",
    badgeColor: "bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300",
  },
  {
    name: "Maria Clara Santos",
    title: "Undergraduate Student (BSIT)",
    department: "ODRS Online Document Requests",
    email: "test.student@pup.com",
    password: "student123",
    badge: "Student",
    icon: "GraduationScrollIcon",
    accent: "text-emerald-800 dark:text-emerald-200 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200/80 dark:border-emerald-900/60",
    badgeColor: "bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300",
  },
];

export default function Home() {
  const router = useRouter();
  const [view, setView] = useState("login"); // "login" or "forgot"
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [staffVerificationEmail, setStaffVerificationEmail] = useState("");
  const [staffEmailCode, setStaffEmailCode] = useState("");
  const [staffCodeMessage, setStaffCodeMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [demoOpen, setDemoOpen] = useState(false);
  const [demoAccountsEnabled, setDemoAccountsEnabled] = useState(false);

  function resetStaffVerification() {
    setStaffVerificationEmail("");
    setStaffEmailCode("");
    setStaffCodeMessage("");
  }

  const handleSelectDemoAccount = (acc) => {
    setView("login");
    setUsername(acc.email);
    setPassword("");
    resetStaffVerification();
    setEmailError("");
    setPasswordError("");
    setError("");
    setDemoOpen(false);
    handleLogin(acc.email, "", true);
  };

  // 2FA State
  const [show2FAModal, setShow2FAModal] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [twoFactorLoading, setTwoFactorLoading] = useState(false);
  const [tempToken, setTempToken] = useState("");
  const [studentSignup, setStudentSignup] = useState({ firstName: "", middleName: "", lastName: "", email: "", password: "", confirmPassword: "" });
  const [studentSignupError, setStudentSignupError] = useState("");
  const [pendingSignupAction, setPendingSignupAction] = useState(null);
  const studentSignupLoading = pendingSignupAction !== null;
  const [signupChallengeId, setSignupChallengeId] = useState("");
  const [signupCode, setSignupCode] = useState("");
  const [signupResendAt, setSignupResendAt] = useState(0);
  const [signupResendSeconds, setSignupResendSeconds] = useState(0);
  const [signupResendError, setSignupResendError] = useState("");
  const [firstNameFocused, setFirstNameFocused] = useState(false);
  const [middleNameFocused, setMiddleNameFocused] = useState(false);
  const [lastNameFocused, setLastNameFocused] = useState(false);
  const [emailSignupFocused, setEmailSignupFocused] = useState(false);
  const [signupPassFocused, setSignupPassFocused] = useState(false);
  const [signupConfirmFocused, setSignupConfirmFocused] = useState(false);
  const [showSignupPassword, setShowSignupPassword] = useState(false);

  useEffect(() => {
    if (!signupResendAt) return;
    const updateCountdown = () => {
      const remaining = Math.max(0, Math.ceil((signupResendAt - Date.now()) / 1000));
      setSignupResendSeconds(remaining);
      if (!remaining) setSignupResendAt(0);
    };
    updateCountdown();
    const timer = window.setInterval(updateCountdown, 1000);
    return () => window.clearInterval(timer);
  }, [signupResendAt]);

  const startSignupResendCountdown = (seconds) => {
    setSignupResendSeconds(seconds);
    setSignupResendAt(Date.now() + seconds * 1000);
  };

  const resetStudentSignupState = () => {
    setStudentSignup({ firstName: "", middleName: "", lastName: "", email: "", password: "", confirmPassword: "" });
    setStudentSignupError("");
    setPendingSignupAction(null);
    setSignupChallengeId("");
    setSignupCode("");
    setSignupResendAt(0);
    setSignupResendSeconds(0);
    setSignupResendError("");
    setFirstNameFocused(false);
    setMiddleNameFocused(false);
    setLastNameFocused(false);
    setEmailSignupFocused(false);
    setSignupPassFocused(false);
    setSignupConfirmFocused(false);
    setShowSignupPassword(false);
  };

  // Forgot Password State
  const [forgotStep, setForgotStep] = useState(1);
  const [forgotIdentifier, setForgotIdentifier] = useState("");
  const [forgotMethod, setForgotMethod] = useState("email");
  const [forgotAccountId, setForgotAccountId] = useState("");
  const [forgotQuestions, setForgotQuestions] = useState([]);
  const [forgotQuestionId, setForgotQuestionId] = useState("");
  const [forgotAnswer, setForgotAnswer] = useState("");
  const [forgotNewPassword, setForgotNewPassword] = useState("");
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState("");
  const [forgotMessage, setForgotMessage] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState("");
  const [forgotIdentifierFocused, setForgotIdentifierFocused] = useState(false);

  useEffect(() => {
    // Clear logout sync flag when on login page
    localStorage.removeItem("pup-logout");

    if (typeof window !== "undefined") {
      document.documentElement.style.setProperty("--brand-accent", "#800000");
      document.documentElement.style.setProperty("--brand-foreground", "#ffffff");
      document.documentElement.removeAttribute("data-brand-accent");
      document.documentElement.removeAttribute("data-brand-foreground");
    }

    // Dynamic favicon swap for login page
    const link = document.querySelector("link[rel*='icon']") || document.createElement('link');
    link.type = 'image/png';
    link.rel = 'shortcut icon';
    link.href = '/assets/branding/black-icon.png';
    document.getElementsByTagName('head')[0].appendChild(link);
  }, []);

  useEffect(() => {
    let active = true;
    fetch("/api/auth/login-options", { cache: "no-store" })
      .then((response) => response.json())
      .then((result) => {
        if (active) setDemoAccountsEnabled(result?.ok === true && result?.data?.showDemoAccounts === true);
      })
      .catch(() => {
        if (active) setDemoAccountsEnabled(false);
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const session = await getClientSession();
        if (active && session?.ok && session?.data) {
          const role = String(session.data.role || "");
          let redirectPath = null;
          if (typeof window !== "undefined") {
            redirectPath = new URLSearchParams(window.location.search).get("redirect");
          }
          if (redirectPath && canAccessPage(redirectPath, role)) {
            router.replace(redirectPath);
            return;
          }
          if (isSystemAdminRole(role)) {
            router.replace("/systemadmin");
            return;
          }
          if (isAdminRole(role)) {
            router.replace("/admin");
            return;
          }
          if (role.toLowerCase() === "student") {
            router.replace("/student");
            return;
          }
          router.replace("/staff");
        }
      } catch {
        // Unauthenticated or network error; keep user on login page
      }
    })();
    return () => { active = false; };
  }, [router]);

  const resetForgotState = () => {
    setForgotStep(1);
    setForgotIdentifier("");
    setForgotMethod("email");
    setForgotAccountId("");
    setForgotQuestions([]);
    setForgotQuestionId("");
    setForgotAnswer("");
    setForgotNewPassword("");
    setForgotConfirmPassword("");
    setForgotMessage("");
    setForgotError("");
    setForgotLoading(false);
    resetStaffVerification();
    setForgotIdentifierFocused(false);
  };

  const handleForgotIdentify = async (e) => {
    e.preventDefault();
    if (!forgotIdentifier.trim()) {
      setForgotError("Please enter your Email or Staff ID.");
      return;
    }
    setForgotError("");
    setForgotLoading(true);
    try {
      const res = await fetch(forgotMethod === "questions" ? "/api/auth/forgot-password/security-questions" : "/api/auth/forgot-password/identify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: forgotIdentifier.trim() })
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Failed to identify account.");
      }
      if (forgotMethod === "questions") {
        if (!json.data?.id || !json.data?.questions?.length) {
          throw new Error("Security question recovery is unavailable. Use an email reset link instead.");
        }
        setForgotAccountId(json.data.id);
        setForgotQuestions(json.data.questions);
        setForgotQuestionId(String(json.data.questions[0].id));
        setForgotStep(3);
      } else {
        setForgotMessage(json.data?.message || "If an eligible account exists, a password reset link has been sent to its registered email.");
        setForgotStep(2);
      }
    } catch (err) {
      setForgotError(err.message);
    } finally {
      setForgotLoading(false);
    }
  };

  const handleForgotQuestionReset = async (e) => {
    e.preventDefault();
    if (!forgotAnswer.trim() || !forgotNewPassword || !forgotConfirmPassword) {
      setForgotError("Please fill all fields.");
      return;
    }
    if (forgotNewPassword !== forgotConfirmPassword) {
      setForgotError("Passwords do not match.");
      return;
    }
    if (forgotNewPassword.length < 8) {
      setForgotError("New password must be at least 8 characters.");
      return;
    }
    setForgotError("");
    setForgotLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: forgotAccountId, questionId: Number(forgotQuestionId), answer: forgotAnswer.trim(), newPassword: forgotNewPassword })
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Failed to reset password.");
      toast.success("Password Reset Successful", { description: "You can now log in with your new password." });
      resetForgotState();
      setView("login");
    } catch (err) {
      setForgotError(err.message);
    } finally {
      setForgotLoading(false);
    }
  };

  const validateEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    const identifier = username.trim();
    if (!identifier) {
      setEmailError("Enter your email address or student number.");
      return;
    }
    const check = LoginIdentifierSchema.safeParse(identifier);
    if (!check.success) {
      setEmailError(check.error.issues[0]?.message || "Please enter a valid institutional email, Student Number, or Staff ID.");
      return;
    }
    setEmailError("");
    if (!password) {
      setPasswordError("Enter your password.");
      return;
    }
    setPasswordError("");
    handleLogin();
  };

  function handleLogin(usernameValue = username, passwordValue = password, isDemo = false, resendStaffEmailCode = false) {
    if (isLoading) return;

    const usernameInput = usernameValue.trim();
    const passwordInput = passwordValue;

    setError("");
    setIsLoading(true);

    (async () => {
      try {
        const res = await fetch(isDemo ? "/api/auth/demo-login" : "/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(isDemo ? { username: usernameInput } : {
            username: usernameInput,
            password: passwordInput,
            ...(staffVerificationEmail && !resendStaffEmailCode ? { staffEmailCode } : {}),
            ...(resendStaffEmailCode ? { resendStaffEmailCode: true } : {}),
          }),
        });
        const json = await res.json();
        if (!res.ok || !json?.ok) {
          throw new Error(json?.error || "Failed to verify your identity. Try again.");
        }

        if (json.data.staffEmailVerificationRequired) {
          setStaffVerificationEmail(json.data.email);
          setStaffCodeMessage("");
          const delivery = json.data.delivery;
          if (delivery?.sent) {
            setStaffEmailCode("");
            setStaffCodeMessage("A new code was sent to your email.");
          } else if (delivery) {
            setError(delivery.reason === "cooldown"
              ? "Wait one minute before requesting another code."
              : "The code couldn’t be sent. Try again or contact your administrator.");
          }
          setIsLoading(false);
          return;
        }
        resetStaffVerification();

        if (json.data.totpRequired) {
          setTempToken(json.data.tempToken);
          setShow2FAModal(true);
          setIsLoading(false);
          return;
        }

        const role = String(json?.data?.role || "");

        invalidateClientSession();
        
        // Signal other tabs to clear "Session Expired" modal
        localStorage.setItem("pup-session-recovered", Date.now().toString());
        localStorage.removeItem("pup-logout");

        // Check for redirect param from middleware
        let redirectPath = null;
        if (typeof window !== "undefined") {
          redirectPath = new URLSearchParams(window.location.search).get("redirect");
        }
        if (redirectPath && canAccessPage(redirectPath, role)) {
          router.replace(redirectPath);
          return;
        }

        if (isSystemAdminRole(role)) {
          router.replace("/systemadmin");
          return;
        }
        if (isAdminRole(role)) {
          router.replace("/admin");
          return;
        }
        if (role.toLowerCase() === "student") {
          router.replace("/student");
          return;
        }

        router.replace("/staff");
      } catch (err) {
        setError(err?.message || "Invalid username or password.");
        setIsLoading(false);
      }
    })();
  }

  async function handleStudentSignup(e) {
    e.preventDefault();
    if (!studentSignup.firstName.trim() || !studentSignup.lastName.trim()) {
      setStudentSignupError("First name and last name are required.");
      return;
    }
    const firstCheck = PersonNameSchema("First name").safeParse(studentSignup.firstName);
    if (!firstCheck.success) {
      setStudentSignupError(firstCheck.error.issues[0]?.message);
      return;
    }
    const lastCheck = PersonNameSchema("Last name").safeParse(studentSignup.lastName);
    if (!lastCheck.success) {
      setStudentSignupError(lastCheck.error.issues[0]?.message);
      return;
    }
    if (!studentSignup.email.trim() || !validateEmail(studentSignup.email.trim())) {
      setStudentSignupError("A valid email address is required.");
      return;
    }
    if (studentSignup.password.length < 8) {
      setStudentSignupError("Password must be at least 8 characters.");
      return;
    }
    if (studentSignup.password !== studentSignup.confirmPassword) {
      setStudentSignupError("Passwords do not match.");
      return;
    }

    await submitSignupStep("send");
  }

  async function submitSignupStep(action) {
    if (studentSignupLoading) return;
    if (action === "send" && signupResendAt > Date.now()) return;
    setStudentSignupError("");
    setSignupResendError("");
    setPendingSignupAction(action);
    let isResending = action === "send" && Boolean(signupChallengeId);
    try {
      const { firstName, middleName, lastName, password } = studentSignup;
      const payload = {
        action,
        email: studentSignup.email.trim().toLowerCase(),
        firstName,
        middleName,
        lastName,
        password,
        ...(action === "verify" ? { challengeId: signupChallengeId, code: signupCode } : {}),
      };
      const result = await fetchJsonOnce("/api/auth/student/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!result.ok || !result.body?.ok || !result.data) {
        if (action === "send" && result.status === 429 && Number.isInteger(result.body?.retryAfter) && result.body.retryAfter > 0) {
          startSignupResendCountdown(result.body.retryAfter);
          setPendingSignupAction(null);
          return;
        }
        if (result.status === 409) {
          isResending = false;
          setSignupChallengeId("");
          setSignupCode("");
        }
        const fallback = action === "send"
          ? "Unable to send the verification code."
          : "Unable to verify the code.";
        throw new Error(result.error || `${fallback} The server returned an unexpected response (HTTP ${result.status}).`);
      }
      if (action === "send") {
        if (signupChallengeId) toast.success("Verification Code Sent");
        startSignupResendCountdown(result.data.retryAfter);
        setSignupChallengeId(result.data.challengeId);
        setSignupCode("");
        setPendingSignupAction(null);
        return;
      }

      invalidateClientSession();
      localStorage.setItem("pup-session-recovered", Date.now().toString());
      localStorage.removeItem("pup-logout");
      router.replace("/student");
    } catch (err) {
      const message = err?.message || "Unable to create student account.";
      if (isResending) setSignupResendError(message);
      else setStudentSignupError(message);
      setPendingSignupAction(null);
    }
  }

  const isVerifyingSignup = view === "student-signup" && Boolean(signupChallengeId);

  const handle2FAVerify = async (e) => {
    e.preventDefault();
    if (!twoFactorCode || twoFactorCode.length < 6) {
      toast.error("Invalid Code Length", {
        description: "Please enter the 6-digit verification code, recovery code, or serial key.",
      });
      return;
    }
    setTwoFactorLoading(true);
    try {
      const res = await fetch("/api/auth/login/verify-2fa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tempToken,
          code: twoFactorCode.trim()
        })
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Verification failed.");
      }

      toast.success("Verification Successful", { description: "Logging you in..." });

      invalidateClientSession();
      
      // Signal other tabs to clear "Session Expired" modal
      localStorage.setItem("pup-session-recovered", Date.now().toString());
      localStorage.removeItem("pup-logout");

      const role = String(json?.data?.role || "");

      if (isSystemAdminRole(role)) {
        router.replace("/systemadmin");
      } else if (isAdminRole(role)) {
        router.replace("/admin");
      } else if (role.toLowerCase() === "student") {
        router.replace("/student");
      } else {
        router.replace("/staff");
      }
    } catch (err) {
      const errInfo = formatErrorMessage(err, "Verification Failed");
      toast.error(errInfo.title, { description: errInfo.description, action: errInfo.action });
    } finally {
      setTwoFactorLoading(false);
    }
  };

  return (
    <TooltipProvider delay={200}>
      <PageTransition className={`min-h-screen w-full flex items-center justify-center relative bg-[#eef0f6] dark:bg-zinc-950 font-sans overflow-y-auto ${isVerifyingSignup ? "px-2 py-10 sm:px-8" : "p-8"}`}>
        {/* Dynamic Liquid Glass Background Blobs */}
        

        {/* Top-Left Brand Logo & Name */}
        <div 
          onClick={() => router.push("/")}
          className="absolute top-[6px] left-3 sm:left-4 flex items-center gap-0.5 select-none z-20 cursor-pointer"
        >
          <img src="/assets/branding/black-icon.png" alt="eManage Logo" className="w-[26px] h-[26px] shrink-0 object-contain p-0.5 dark:hidden" />
          <img src="/assets/branding/white-icon.png" alt="eManage Logo" className="w-[26px] h-[26px] shrink-0 object-contain p-0.5 hidden dark:block" />
          <span className="text-[22px] font-bold text-[#1D1D1F] dark:text-zinc-50 tracking-tight leading-none">eManage</span>
        </div>

        <div className="w-full max-w-[550px] p-4 z-10">
          <div
            className="bg-white rounded-[2.5rem] shadow-xl dark:bg-zinc-900 flex flex-col items-center w-full relative transition-all duration-300 border border-border"
            style={{
              padding: isVerifyingSignup ? "40px clamp(16px, 5vw, 48px)" : "48px 48px",
              minHeight: isVerifyingSignup ? "auto" : "630px",
            }}
          >
            {/* APP ICON WITH CONCENTRIC CIRCLES */}
            {view !== "student-signup" && (
              <div
                className="relative flex items-center justify-center select-none shrink-0 transition-all duration-300 w-[160px] h-[160px] mb-3"
                style={{
                  width: "160px",
                  height: "160px",
                  flexShrink: 0,
                }}
              >
                <svg className="absolute w-full h-full inset-0 pointer-events-none" viewBox="0 0 160 160">
                  {[
                    { r: 72, count: 24, size: 4.2 },
                    { r: 63, count: 24, size: 3.4 },
                    { r: 54, count: 24, size: 2.8 },
                    { r: 45, count: 24, size: 2.2 }
                  ].map((ring, rIdx) => {
                    const dots = [];
                    for (let i = 0; i < ring.count; i++) {
                      const angle = (i * 2 * Math.PI) / ring.count + (rIdx * 0.25);
                      const cx = Number((80 + ring.r * Math.cos(angle)).toFixed(4));
                      const cy = Number((80 + ring.r * Math.sin(angle)).toFixed(4));
                      // Maroon Gradient Palette
                      // Hues around 345 (deep ruby) to 5 (warm dark red)
                      const hue = 355 + (Math.sin(angle - (rIdx * 0.5)) * 10);
                      
                      // Rich saturation, darker lightness for maroon
                      const sat = 85 - (rIdx * 2);
                      const light = 42 - (rIdx * 6) + (Math.cos(angle * 2) * 5);
                      
                      const color = `hsl(${hue}, ${sat}%, ${light}%)`;
                      dots.push(
                        <circle
                          key={i}
                          cx={cx}
                          cy={cy}
                          r={ring.size}
                          fill={color}
                        />
                      );
                    }
                    return (
                      <g 
                        key={rIdx} 
                        className="origin-center"
                        style={{ 
                          transformOrigin: '80px 80px',
                          animation: `intelligenceBloom 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards`,
                          animationDelay: `${(3 - rIdx) * 0.08 + 0.2}s`,
                          opacity: 0,
                          transform: 'scale(0.2)'
                        }}
                      >
                        {dots}
                      </g>
                    );
                  })}
                </svg>
              <style dangerouslySetInnerHTML={{__html: `
                @keyframes intelligenceBloom {
                  0% { opacity: 0; transform: scale(0.4); }
                  100% { opacity: 1; transform: scale(1); }
                }
                @keyframes logoPop {
                  0% { opacity: 0; transform: scale(0.6); }
                  100% { opacity: 1; transform: scale(1); }
                }
              `}} />
              <img 
                src="/assets/branding/black-icon.png" 
                alt="eManage Logo" 
                className="shrink-0 object-contain p-[2px] z-10 dark:hidden w-[30px] h-[30px]" 
                style={{
                  animation: `logoPop 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards`,
                  opacity: 0,
                  transform: 'scale(0.6)'
                }}
              />
              <img 
                src="/assets/branding/white-icon.png" 
                alt="eManage Logo" 
                className="shrink-0 object-contain p-[2px] z-10 hidden dark:block w-[30px] h-[30px]" 
                style={{
                  animation: `logoPop 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards`,
                  opacity: 0,
                  transform: 'scale(0.6)'
                }}
              />
              </div>
            )}

            {view === "login" ? (
              <div className="w-full text-center flex-1 flex flex-col">
                <h1 className="login-title text-3xl font-bold text-[#111] dark:text-zinc-50 tracking-tight mb-8">
                  Sign in with eManage Account
                </h1>

                <form onSubmit={handleFormSubmit} className="flex w-full flex-1 flex-col">
                  <div className="w-full text-left">
                    {/* Merged Field Container */}
                    <div className={`merged-container bg-white dark:bg-zinc-800 ${
                      emailError || passwordError || error ? "has-error" : ""
                    }`}>
                      {/* EMAIL FIELD (top half) */}
                      <div className={`field-wrapper border-b border-border dark:border-border/50 ${emailFocused || username.length > 0 ? "active" : ""}`}>
                        <label htmlFor="username">Email Address, Student Number, or Staff ID</label>
                        <Input variant="floating"
                          type="text"
                          id="username"
                          name="username"
                          autoComplete="username"
                          aria-required="true"
                          placeholder=" "
                          className="pr-11 focus-visible:ring-0 focus-visible:ring-offset-0"
                          autoFocus
                          value={username}
                          onFocus={() => setEmailFocused(true)}
                          onBlur={() => setEmailFocused(false)}
                          onChange={(e) => {
                            setUsername(e.target.value);
                            resetStaffVerification();
                            if (emailError) setEmailError("");
                            if (error) setError("");
                          }}
                        />
                      </div>

                      {/* PASSWORD FIELD (bottom half) */}
                      <div className={`field-wrapper ${passwordFocused || password.length > 0 ? "active" : ""}`}>
                        <label htmlFor="password">Password</label>
                        <Input variant="floating"
                          type={showPassword ? "text" : "password"}
                          id="password"
                          name="password"
                          autoComplete="current-password"
                          aria-required="true"
                          placeholder=" "
                          className="pr-11 focus-visible:ring-0 focus-visible:ring-offset-0"
                          value={password}
                          onFocus={() => setPasswordFocused(true)}
                          onBlur={() => setPasswordFocused(false)}
                          onChange={(e) => {
                            setPassword(e.target.value);
                            resetStaffVerification();
                            if (passwordError) setPasswordError("");
                            if (error) setError("");
                          }}
                        />
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center">
                          <button
                            type="button"
                            aria-label={showPassword ? "Hide password" : "Show password"}
                            onClick={() => setShowPassword(!showPassword)}
                            className="w-7 h-7 flex items-center justify-center text-[#8E8E93] hover:text-[#1D1D1F] focus:outline-none dark:text-zinc-400 dark:hover:text-zinc-200"
                          >
                            <AppIcon  className={` ${showPassword ? "ViewOffIcon" : "ViewIcon"} text-[16px]`}></AppIcon>
                          </button>
                        </div>
                      </div>
                    </div>

                    {staffVerificationEmail && (
                      <div className="mt-5 space-y-2 text-left">
                        <label htmlFor="staff-email-code" className="text-xs font-semibold block">Email verification code</label>
                        <p className="text-xs text-muted-foreground">Enter the six-digit code for {staffVerificationEmail}.</p>
                        <Input
                          id="staff-email-code"
                          inputMode="numeric"
                          autoComplete="one-time-code"
                          autoFocus
                          pattern="[0-9]{6}"
                          required
                          value={staffEmailCode}
                          onChange={(event) => setStaffEmailCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                          disabled={isLoading}
                        />
                        <button
                          type="button"
                          className="text-sm text-blue-600 hover:underline disabled:opacity-50"
                          disabled={isLoading}
                          onClick={() => handleLogin(username, password, false, true)}
                        >
                          Resend Code
                        </button>
                        {staffCodeMessage && <p role="status" className="text-xs text-muted-foreground">{staffCodeMessage}</p>}
                      </div>
                    )}

                    <div className="flex items-center justify-between w-full mt-6 select-none animate-in fade-in duration-200">
                      {emailError || passwordError || error ? (
                        <div role="alert" aria-live="polite" className="flex items-center gap-1.5 text-[#E5484D] animate-in fade-in duration-200 text-left pr-2">
                          <Alert01Icon size="1em"  className="text-[14px] shrink-0 mt-[1px]"></Alert01Icon>
                          <p className="text-[12px] font-normal leading-none">
                            {emailError || passwordError || error}
                          </p>
                        </div>
                      ) : (
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            className="w-4 h-4 m-0 shrink-0 align-middle rounded-full border-border text-blue-600 focus:ring-blue-600 accent-blue-600"
                          />
                          <span className="text-[13px] text-[#1D1D1F] dark:text-zinc-300">Keep me signed in</span>
                        </label>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          resetForgotState();
                          setView("forgot");
                        }}
                        className="text-[13px] text-[#0A84FF] hover:underline focus:outline-none shrink-0 font-normal"
                      >
                        Forgot Password?
                      </button>
                    </div>
                  </div>

                  <div className="mt-6">
                    <Button
                      type="submit"
                      disabled={isLoading || (Boolean(staffVerificationEmail) && staffEmailCode.length !== 6)}
                      className="w-full h-10 disabled:opacity-50 flex items-center justify-center"
                    >
                      {isLoading ? (
                        <Loading01Icon size="1em"  className="animate-spin text-lg flex items-center justify-center"></Loading01Icon>
                      ) : (
                        <span>{staffVerificationEmail ? "Verify Email" : "Sign In"}</span>
                      )}
                    </Button>
                  </div>

                  {!staffVerificationEmail && (
                    <>
                      <button
                        type="button"
                        disabled={isLoading}
                        onClick={() => {
                          resetStudentSignupState();
                          setView("student-signup");
                        }}
                        className="mt-4 self-center text-sm font-semibold text-foreground hover:underline focus-visible:underline disabled:opacity-50"
                      >
                        Create your eManage Account
                      </button>
                      <div className="mt-auto pt-8 text-left text-muted-foreground">
                        <UserSearch01Icon size={20} aria-hidden="true" className="mb-2" />
                        <p className="text-[11px] leading-normal">
                          Your eManage account provides secure access to the digitization process and administrative tools. Account activity is logged for security and auditing purposes.
                        </p>
                      </div>
                    </>
                  )}
                </form>
              </div>
            ) : view === "forgot" ? (
              <div className="w-full text-center flex-1 flex flex-col animate-in fade-in duration-300">
                <h1 className="login-title text-[25px] font-bold text-[#1D1D1F] dark:text-zinc-50 tracking-tight mb-5">
                  Account Recovery
                </h1>

                {forgotStep === 1 ? (
                  <form onSubmit={handleForgotIdentify} className="w-full flex-1 flex flex-col justify-between">
                    <div className="w-full text-left">
                      {/* Merged Field Container */}
                      <div className={`merged-container bg-white dark:bg-zinc-800 ${
                        forgotError ? "has-error" : ""
                      }`}>
                        <div className={`field-wrapper ${forgotIdentifierFocused || forgotIdentifier.length > 0 ? "active" : ""}`}>
                          <label htmlFor="forgotIdentifier">{forgotMethod === "questions" ? "Email Address or Staff ID" : "Email Address, Student Number, or Staff ID"}</label>
                          <Input variant="floating"
                            type="text"
                            id="forgotIdentifier"
                            disabled={forgotLoading}
                            placeholder=" "
                            className="pr-11 focus-visible:ring-0 focus-visible:ring-offset-0"
                            autoFocus
                            value={forgotIdentifier}
                            onFocus={() => setForgotIdentifierFocused(true)}
                            onBlur={() => setForgotIdentifierFocused(false)}
                            onChange={(e) => {
                              setForgotIdentifier(e.target.value);
                              if (forgotError) setForgotError("");
                            }}
                          />
                        </div>
                      </div>

                      <p className="mt-4 text-[13px] text-gray-500 dark:text-zinc-400">
                        {forgotMethod === "questions" ? "Answer a security question you previously set up to reset your password." : "Receive a reset link at your registered email address."}
                      </p>
                      <button
                        type="button"
                        disabled={forgotLoading}
                        onClick={() => {
                          const nextMethod = forgotMethod === "email" ? "questions" : "email";
                          resetForgotState();
                          setForgotMethod(nextMethod);
                        }}
                        className="mt-2 text-[13px] text-[#0A84FF] hover:underline focus-visible:underline disabled:opacity-50 font-normal"
                      >
                        {forgotMethod === "email" ? "Use security questions" : "Use an email reset link"}
                      </button>

                      {forgotError && (
                        <div role="alert" className="mt-1.5 text-left flex items-start gap-1.5 text-[#E5484D] animate-in fade-in duration-200">
                          <Alert01Icon size="1em"  className="text-[14px] shrink-0 mt-[1px]"></Alert01Icon>
                          <p className="text-[12px] font-normal leading-snug">
                            {forgotError}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Request Button (Always visible at the bottom) */}
                    <div className="absolute bottom-[64px] left-[52px] right-[52px]">
                      <Button
                        type="submit"
                        disabled={forgotLoading || !forgotIdentifier.trim()}
                        title="Request Password Reset"
                        className="w-full h-10 disabled:opacity-50 flex items-center justify-center"
                      >
                        {forgotLoading ? (
                          <Loading01Icon size="1em"  className="animate-spin text-lg flex items-center justify-center"></Loading01Icon>
                        ) : (
                          <span>Request</span>
                        )}
                      </Button>
                    </div>

                    {/* Back to Login Link */}
                    <div className="absolute bottom-[38px] left-[52px] right-[52px] text-center">
                      <button
                        type="button"
                        disabled={forgotLoading}
                        onClick={() => {
                          setView("login");
                          resetForgotState();
                        }}
                        className="text-[13px] text-[#0A84FF] hover:underline focus:outline-none font-normal"
                      >
                        Back
                      </button>
                    </div>
                  </form>
                ) : forgotStep === 3 ? (
                  <form onSubmit={handleForgotQuestionReset} className="w-full flex-1 flex flex-col pb-24">
                    <div className="w-full text-left space-y-3">
                      <div>
                        <label htmlFor="forgotQuestionId" className="text-xs font-semibold block mb-1 text-gray-500 dark:text-zinc-400">Security Question</label>
                        <Select
                          id="forgotQuestionId"
                          aria-label="Security Question"
                          value={forgotQuestionId}
                          disabled={forgotLoading}
                          onChange={(e) => { setForgotQuestionId(String(e.target.value)); setForgotAnswer(""); setForgotError(""); }}
                          className="h-10 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 text-xs font-normal text-gray-700 dark:text-zinc-200 shadow-none"
                        >
                          {forgotQuestions.map((question) => <option key={question.id} value={String(question.id)}>{question.question}</option>)}
                        </Select>
                      </div>
                      <div>
                        <label htmlFor="forgotAnswer" className="text-xs font-semibold block mb-1 text-gray-500 dark:text-zinc-400">Security Answer</label>
                        <Input id="forgotAnswer" type="password" autoComplete="off" required disabled={forgotLoading} value={forgotAnswer} onChange={(e) => { setForgotAnswer(e.target.value); setForgotError(""); }} className="h-10 rounded-xl" />
                      </div>
                      <div>
                        <label htmlFor="forgotNewPassword" className="text-xs font-semibold block mb-1 text-gray-500 dark:text-zinc-400">New Password</label>
                        <PasswordInput id="forgotNewPassword" label="new password" autoComplete="new-password" minLength={8} maxLength={128} required disabled={forgotLoading} value={forgotNewPassword} onChange={(e) => { setForgotNewPassword(e.target.value); setForgotError(""); }} className="h-10 rounded-xl" />
                      </div>
                      <div>
                        <label htmlFor="forgotConfirmPassword" className="text-xs font-semibold block mb-1 text-gray-500 dark:text-zinc-400">Confirm Password</label>
                        <PasswordInput id="forgotConfirmPassword" label="password confirmation" autoComplete="new-password" minLength={8} maxLength={128} required disabled={forgotLoading} value={forgotConfirmPassword} onChange={(e) => { setForgotConfirmPassword(e.target.value); setForgotError(""); }} className="h-10 rounded-xl" />
                      </div>
                      {forgotError && <p role="alert" className="text-[12px] text-[#E5484D]">{forgotError}</p>}
                    </div>
                    <div className="absolute bottom-[64px] left-[52px] right-[52px]">
                      <Button type="submit" disabled={forgotLoading || !forgotQuestionId || !forgotAnswer.trim() || !forgotNewPassword || !forgotConfirmPassword} className="w-full h-10 disabled:opacity-50">
                        {forgotLoading ? <Loading01Icon size="1em" className="animate-spin text-lg" /> : "Reset Password"}
                      </Button>
                    </div>
                    <div className="absolute bottom-[38px] left-[52px] right-[52px] text-center">
                      <button type="button" disabled={forgotLoading} onClick={resetForgotState} className="text-[13px] text-[#0A84FF] hover:underline focus-visible:underline font-normal">Back</button>
                    </div>
                  </form>
                ) : (
                  <div className="w-full flex-1 flex flex-col justify-between">
                    <div className="w-full text-left" role="status">
                      <p className="text-[16px] font-semibold text-[#1D1D1F] dark:text-zinc-50 mb-3">Check your email</p>
                      <p className="text-[13px] text-gray-500 dark:text-zinc-400">
                        {forgotMessage} Open the email and click Reset Password. The link expires in 15 minutes. Check spam too.
                      </p>
                    </div>
                    <div className="absolute bottom-[64px] left-[52px] right-[52px]">
                      <Button type="button" onClick={() => { setView("login"); resetForgotState(); }} className="w-full h-10">
                        Done
                      </Button>
                    </div>
                    <div className="absolute bottom-[38px] left-[52px] right-[52px] text-center">
                      <button type="button" onClick={resetForgotState} className="text-[13px] text-[#0A84FF] hover:underline focus:outline-none font-normal">
                        Request a new link
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : isVerifyingSignup ? (
              <form
                aria-busy={studentSignupLoading}
                className="mx-auto flex w-full max-w-sm flex-col items-center text-center"
                onSubmit={(event) => {
                  event.preventDefault();
                  if (signupCode.length === 6 && !studentSignupLoading) submitSignupStep("verify");
                }}
              >
                <img src="/assets/branding/black-icon.png" alt="" width={40} height={40} className="mb-5 dark:hidden" />
                <img src="/assets/branding/white-icon.png" alt="" width={40} height={40} className="mb-5 hidden dark:block" />
                <h1 className="text-2xl font-bold tracking-tight text-foreground">Verify your email</h1>
                <p id="signup-code-instructions" className="mt-2 w-full text-sm leading-relaxed text-muted-foreground">
                  Enter the six-digit code sent to{" "}
                  <strong className="break-all font-semibold text-foreground">{studentSignup.email.trim()}</strong>.
                </p>

                <label className="text-xs font-semibold mt-6 block w-full">
                  <span className="sr-only">Email verification code</span>
                  <span data-otp-input className="relative grid grid-cols-6 gap-1.5 sm:gap-2">
                    <input
                      autoFocus
                      type="text"
                      autoComplete="one-time-code"
                      inputMode="numeric"
                      pattern="[0-9]{6}"
                      required
                      aria-invalid={Boolean(studentSignupError)}
                      aria-describedby={studentSignupError ? "signup-code-instructions signup-code-error" : "signup-code-instructions"}
                      value={signupCode}
                      readOnly={studentSignupLoading}
                      onChange={(event) => {
                        setSignupCode(event.target.value.replace(/\D/g, "").slice(0, 6));
                        setStudentSignupError("");
                      }}
                      className="peer absolute inset-0 z-10 h-full w-full cursor-text opacity-0 text-base"
                    />
                    {Array.from({ length: 6 }, (_, index) => (
                      <span
                        key={index}
                        aria-hidden="true"
                        data-otp-cell
                        className={`flex h-12 min-w-0 items-center justify-center rounded-xl border bg-muted/45 text-xl font-semibold tabular-nums text-foreground motion-safe:transition-colors sm:h-14 sm:text-2xl border-border ${index === Math.min(signupCode.length, 5) ? "peer-focus:border-pup-maroon peer-focus:ring-1 peer-focus:ring-pup-maroon" : ""}`}
                      >
                        {signupCode[index] || <span className="size-1.5 rounded-full bg-muted-foreground/40" />}
                      </span>
                    ))}
                  </span>
                </label>

                {studentSignupError && <p id="signup-code-error" role="alert" className="mt-3 text-sm text-destructive">{studentSignupError}</p>}

                <Button type="submit" className="mt-5 h-11 w-full" disabled={studentSignupLoading || signupCode.length !== 6}>
                  {pendingSignupAction === "verify" ? (
                    <>
                      <Loading01Icon size={16} aria-hidden="true" className="motion-safe:animate-spin" />
                      Verifying Email…
                    </>
                  ) : "Verify Email"}
                </Button>
                {signupResendError && <p role="alert" className="mt-2 text-sm text-destructive">{signupResendError}</p>}
                <div className="mt-2 flex w-full justify-center">
                  <Button type="button" variant="ghost" className="h-11 px-3 text-xs tabular-nums" disabled={studentSignupLoading || signupResendSeconds > 0} onClick={() => submitSignupStep("send")}>
                    {pendingSignupAction === "send" ? "Sending Code…" : signupResendSeconds > 0 ? `Resend Code in ${signupResendSeconds}s` : "Resend Code"}
                  </Button>
                </div>
              </form>
            ) : (
              <div className="w-full text-center flex-1 flex flex-col justify-center animate-in fade-in duration-300">
                <div className="flex justify-center w-full mb-4">
                  <img src="/assets/branding/black-icon.png" alt="eManage Logo" className="w-[40px] h-[40px] object-contain dark:hidden" />
                  <img src="/assets/branding/white-icon.png" alt="eManage Logo" className="w-[40px] h-[40px] object-contain hidden dark:block" />
                </div>
                <h1 className="login-title text-[24px] font-bold text-[#1D1D1F] dark:text-zinc-50 tracking-tight mb-1">
                  Create Your eManage Account
                </h1>
                <p className="text-[12px] text-gray-500 dark:text-zinc-400 mb-1 font-normal">
                  One eManage Account is all you need to access all eManage services.
                </p>
                <div className="flex items-center justify-center gap-1.5 text-[12px] mb-4">
                  <span className="text-gray-500 dark:text-zinc-400 font-normal">Already have an eManage Account?</span>
                  <button 
                    type="button" 
                    onClick={() => { resetStudentSignupState(); setView("login"); }} 
                    className="text-[#007AFF] hover:underline focus:outline-none font-medium"
                  >
                    Sign In
                  </button>
                </div>

                <form onSubmit={handleStudentSignup} className="w-full flex flex-col mt-2">
                  <div className="w-full text-left">
                    {/* Merged Field Container */}
                    <div className={`merged-container bg-white dark:bg-zinc-800 ${
                      studentSignupError ? "has-error" : ""
                    }`}>
                      {/* First Name & Last Name (2 columns) */}
                      <div className="flex w-full border-b border-border dark:border-border/50 divide-x divide-border dark:divide-border/50">
                        <div className="flex-1 min-w-0">
                          <div className={`field-wrapper ${firstNameFocused || studentSignup.firstName.length > 0 ? "active" : ""}`}>
                            <label>First Name</label>
                            <Input variant="floating"
                              type="text"
                              placeholder=" "
                              className="focus-visible:ring-0 focus-visible:ring-offset-0"
                              value={studentSignup.firstName}
                              onFocus={() => setFirstNameFocused(true)}
                              onBlur={() => setFirstNameFocused(false)}
                              onChange={(e) => {
                                setStudentSignup(cur => ({ ...cur, firstName: e.target.value }));
                                if (studentSignupError) setStudentSignupError("");
                              }}
                              required
                            />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className={`field-wrapper ${lastNameFocused || studentSignup.lastName.length > 0 ? "active" : ""}`}>
                            <label>Last Name</label>
                            <Input variant="floating"
                              type="text"
                              placeholder=" "
                              className="focus-visible:ring-0 focus-visible:ring-offset-0"
                              value={studentSignup.lastName}
                              onFocus={() => setLastNameFocused(true)}
                              onBlur={() => setLastNameFocused(false)}
                              onChange={(e) => {
                                setStudentSignup(cur => ({ ...cur, lastName: e.target.value }));
                                if (studentSignupError) setStudentSignupError("");
                              }}
                              required
                            />
                          </div>
                        </div>
                      </div>

                      {/* Middle Name (optional) */}
                      <div className={`field-wrapper border-b border-border dark:border-border/50 ${middleNameFocused || studentSignup.middleName.length > 0 ? "active" : ""}`}>
                        <label>Middle Name <span className="normal-case tracking-normal opacity-70">(optional)</span></label>
                        <Input variant="floating"
                          type="text"
                          placeholder=" "
                          className="pr-11 focus-visible:ring-0 focus-visible:ring-offset-0"
                          value={studentSignup.middleName}
                          onFocus={() => setMiddleNameFocused(true)}
                          onBlur={() => setMiddleNameFocused(false)}
                          onChange={(e) => {
                            setStudentSignup(cur => ({ ...cur, middleName: e.target.value }));
                            if (studentSignupError) setStudentSignupError("");
                          }}
                        />
                      </div>

                      {/* Email Address */}
                      <div className={`field-wrapper border-b border-border dark:border-border/50 ${emailSignupFocused || studentSignup.email.length > 0 ? "active" : ""}`}>
                        <label>Email Address</label>
                        <Input variant="floating"
                          type="email"
                          placeholder=" "
                          className="pr-11 focus-visible:ring-0 focus-visible:ring-offset-0"
                          value={studentSignup.email}
                          onFocus={() => setEmailSignupFocused(true)}
                          onBlur={() => setEmailSignupFocused(false)}
                          onChange={(e) => {
                            setStudentSignup(cur => ({ ...cur, email: e.target.value }));
                            if (studentSignupError) setStudentSignupError("");
                          }}
                          required
                        />
                      </div>

                      {/* Password & Confirm Password (2 columns) */}
                      <div className="flex w-full divide-x divide-border dark:divide-border/50">
                        <div className="flex-1 min-w-0">
                          <div className={`field-wrapper ${signupPassFocused || studentSignup.password.length > 0 ? "active" : ""}`}>
                            <label>Password (8+ chars)</label>
                            <Input variant="floating"
                              type={showSignupPassword ? "text" : "password"}
                              placeholder=" "
                              className="pr-9 focus-visible:ring-0 focus-visible:ring-offset-0"
                              value={studentSignup.password}
                              onFocus={() => setSignupPassFocused(true)}
                              onBlur={() => setSignupPassFocused(false)}
                              onChange={(e) => {
                                setStudentSignup(cur => ({ ...cur, password: e.target.value }));
                                if (studentSignupError) setStudentSignupError("");
                              }}
                              required
                            />
                            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center">
                              <button
                                type="button"
                                onClick={() => setShowSignupPassword(!showSignupPassword)}
                                className="w-6 h-6 flex items-center justify-center text-[#8E8E93] hover:text-[#1D1D1F] focus:outline-none dark:text-zinc-400 dark:hover:text-zinc-200"
                              >
                                <AppIcon  className={` ${showSignupPassword ? "ViewOffIcon" : "ViewIcon"} text-[14px]`}></AppIcon>
                              </button>
                            </div>
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className={`field-wrapper ${signupConfirmFocused || studentSignup.confirmPassword.length > 0 ? "active" : ""}`}>
                            <label>Confirm Password</label>
                            <Input variant="floating"
                              type={showSignupPassword ? "text" : "password"}
                              placeholder=" "
                              className="focus-visible:ring-0 focus-visible:ring-offset-0"
                              value={studentSignup.confirmPassword}
                              onFocus={() => setSignupConfirmFocused(true)}
                              onBlur={() => setSignupConfirmFocused(false)}
                              onChange={(e) => {
                                setStudentSignup(cur => ({ ...cur, confirmPassword: e.target.value }));
                                if (studentSignupError) setStudentSignupError("");
                              }}
                              required
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Error message */}
                    {studentSignupError && (
                      <div className="h-5 mt-1.5 text-left flex items-center gap-1.5 text-[#E5484D] animate-in fade-in duration-200">
                        <Alert01Icon size="1em"  className="text-[14px] shrink-0 mt-[1px]"></Alert01Icon>
                        <p className="text-[12px] font-normal leading-none">
                          {studentSignupError}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="w-full mt-8 space-y-3">
                    <Button
                      type="submit"
                      disabled={studentSignupLoading || signupResendSeconds > 0}
                      className="w-full h-10 disabled:opacity-50 flex items-center justify-center"
                    >
                      {studentSignupLoading ? (
                        <Loading01Icon size="1em"  className="animate-spin text-lg flex items-center justify-center"></Loading01Icon>
                      ) : (
                        <span>{signupResendSeconds > 0 ? `Try Again in ${signupResendSeconds}s` : "Send Verification Code"}</span>
                      )}
                    </Button>
                    <div className="text-center">
                      <button
                        type="button"
                        onClick={() => {
                          resetStudentSignupState();
                          setView("login");
                        }}
                        className="text-[13px] text-[#0A84FF] hover:underline focus:outline-none font-normal"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            )}
          </div>

          {/* Demo Accounts Popover Trigger (Understated & Non-Distracting) */}
          {demoAccountsEnabled && <div className="mt-3 w-full flex justify-center select-none pb-6">
            <Popover open={demoOpen} onOpenChange={setDemoOpen}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/70 dark:bg-zinc-900/70 border border-black/[0.06] dark:border-white/[0.08] shadow-[0_2px_8px_rgba(0,0,0,0.04)] dark:shadow-none hover:bg-white dark:hover:bg-zinc-800 text-gray-500 dark:text-zinc-400 hover:text-gray-800 dark:hover:text-zinc-100 text-[11px] font-medium backdrop-blur-xl transition-all duration-200 active:scale-[0.97] cursor-pointer group"
                >
                  
                  <span>Demo Accounts</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-gray-100 dark:bg-zinc-800 text-gray-400 dark:text-zinc-400 group-hover:text-gray-700 dark:group-hover:text-zinc-200 transition-colors">
                    {DEMO_ACCOUNTS.length}
                  </span>
                  <AppIcon  className={` ArrowUp01Icon text-[10px] text-gray-400 group-hover:text-gray-600 dark:group-hover:text-zinc-300 transition-transform duration-200 ${demoOpen ? "rotate-180" : ""}`}></AppIcon>
                </button>
              </PopoverTrigger>

              <PopoverContent
                side="top"
                sideOffset={10}
                align="center"
                className="w-80 p-0 rounded-2xl bg-white/95 dark:bg-zinc-900/95 backdrop-blur-2xl border-[0.5px] border-border dark:border-white/10 shadow-[0_24px_48px_-12px_rgba(0,0,0,0.18)] dark:shadow-[0_24px_48px_-12px_rgba(0,0,0,0.4)] overflow-hidden animate-in fade-in-0 zoom-in-95 duration-200"
              >
                {/* Header */}
                <div className="px-4.5 py-2.5 border-b border-black/[0.06] dark:border-white/10 flex items-center justify-between bg-black/[0.02] dark:bg-white/[0.02]">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-400 border border-amber-500/20 shrink-0">
                      <AppIcon className=" FlashIcon text-xs" fallback="UserSearch01Icon" />
                    </div>
                    <div>
                      <h4 className="text-xs font-semibold text-gray-900 dark:text-zinc-100 tracking-tight leading-none">
                        Demo Personas
                      </h4>
                      <p className="text-[10px] text-gray-500 dark:text-zinc-400 mt-0.5">
                        Select an account to sign in immediately
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] text-gray-500 dark:text-zinc-400">Server-seeded demo sign-in</span>
                </div>

                {/* Account List */}
                <div className="p-1.5 space-y-1">
                  {DEMO_ACCOUNTS.map((acc) => (
                    <button
                      key={acc.email}
                      type="button"
                      onClick={() => handleSelectDemoAccount(acc)}
                      disabled={isLoading}
                      className="w-full flex items-center gap-2.5 p-2 rounded-xl text-left hover:bg-gray-100/80 dark:hover:bg-zinc-800/80 transition-all duration-150 active:scale-[0.98] cursor-pointer group disabled:opacity-50 disabled:cursor-wait"
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border ${acc.accent}`}>
                        <AppIcon className={` ${acc.icon} text-xs`} fallback="UserSearch01Icon" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1.5">
                          <span className="text-xs font-semibold text-gray-800 dark:text-zinc-100 group-hover:text-[#800000] dark:group-hover:text-red-400 transition-colors truncate">
                            {acc.name}
                          </span>
                          <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full shrink-0 ${acc.badgeColor}`}>
                            {acc.badge}
                          </span>
                        </div>
                        <p className="text-[10px] text-gray-500 dark:text-zinc-400 truncate mt-0.5">
                          {acc.title}
                        </p>
                        <p className="text-[9.5px] text-gray-400 dark:text-zinc-400 font-sans tabular-nums truncate">
                          {acc.email}
                        </p>
                      </div>
                      <ArrowRight02Icon size="1em"  className="text-xs text-gray-300 dark:text-zinc-600 group-hover:text-gray-700 dark:group-hover:text-zinc-200 group-hover:translate-x-0.5 transition-all"></ArrowRight02Icon>
                    </button>
                  ))}
                </div>

                {/* Footer info tip */}
                <div className="px-3.5 py-2 bg-gray-50/70 dark:bg-zinc-800/40 border-t-[0.5px] border-border dark:border-white/10 flex items-center justify-between text-[10px] text-gray-400 dark:text-zinc-400">
                  <span className="flex items-center gap-1">
                    <CovidInfoIcon size="1em"  className="text-xs"></CovidInfoIcon>
                    1-click instant fill & sign in
                  </span>
                  <span className="font-sans tabular-nums text-[9px] text-gray-400">
                    {DEMO_ACCOUNTS.length} mock accounts
                  </span>
                </div>
              </PopoverContent>
            </Popover>
          </div>}
        </div>

        {/* FIXED FOOTER */}
        <div className="absolute bottom-0 left-0 right-0 bg-[#f2f2f7] dark:bg-zinc-900 border-t border-border dark:border-border py-6 px-8 flex justify-center text-[11px] text-[#8E8E93] select-none font-sans z-0">
          <div className="w-full max-w-[980px] flex justify-center items-center text-center">
            <span>© 2026 Polytechnic University of the Philippines. All rights reserved.</span>
          </div>
        </div>

        {/* 2FA Modal */}
        <Dialog open={show2FAModal} onOpenChange={(open) => {
          if (!twoFactorLoading) setShow2FAModal(open);
        }}>
          <DialogContent className="max-w-md rounded-2xl border-border bg-white dark:border-border dark:bg-zinc-900">
            <DialogHeader>
              <DialogTitle>
                Two-Factor Authentication
              </DialogTitle>
              <DialogDescription>
                Enter the 6-digit code from your authenticator app, a recovery code, or your Serial key.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handle2FAVerify} className="space-y-4 mt-2">
              <div className="space-y-2">
                <label htmlFor="twoFactorCode" className="block text-xs font-semibold text-gray-700 tracking-wide ml-1 dark:text-zinc-200">
                  Verification Code
                </label>
                <Input
                  variant="verification"
                  type="text"
                  id="twoFactorCode"
                  name="twoFactorCode"
                  autoComplete="one-time-code"
                  inputMode="text"
                  autoCapitalize="characters"
                  aria-label="Two-factor verification code"
                  placeholder="000000, Recovery Code, or Serial key"
                  value={twoFactorCode}
                  onChange={(e) => setTwoFactorCode(e.target.value)}
                  autoFocus
                  required
                />
              </div>

              <div className="flex flex-col gap-2 pt-2">
                <Button
                  type="submit"
                  size="sm"
                  disabled={twoFactorLoading}
                  title="Verify & Log In"
                  className="w-full h-9 disabled:opacity-50 group"
                >
                  {twoFactorLoading ? (
                    <>
                      <Loading01Icon size={16}  className="animate-spin"></Loading01Icon>
                      Verifying...
                    </>
                  ) : (
                    "Verify & Log In"
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShow2FAModal(false);
                    setTwoFactorCode("");
                    setTwoFactorError("");
                  }}
                  className="w-full h-9 px-4 text-xs font-semibold rounded-xl border border-pup-maroon/70 dark:border-red-500/80 bg-white dark:bg-zinc-800 text-pup-maroon dark:text-red-400 hover:bg-pup-maroon/5 dark:hover:bg-red-500/10 shadow-xs cursor-pointer active:scale-95 transition-all"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>


      </PageTransition>
    </TooltipProvider>
  );
}
