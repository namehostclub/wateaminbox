import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowRight,
  BarChart3,
  CheckCheck,
  CircleAlert,
  Eye,
  EyeOff,
  Layers,
  LoaderCircle,
  Lock,
  Mail,
  MailCheck,
  MoreVertical,
  QrCode,
  ShieldCheck,
  Star,
  User,
  UserCheck,
  Users,
  Zap,
} from "lucide-react";
import QRCode from "qrcode";
import * as React from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router";
import {
  AppleStoreIcon,
  GooglePlayIcon,
} from "../components/brand/MobileAppDownloadBadges";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import { useAuth } from "../contexts/auth-context";
import { useWorkspace } from "../contexts/workspace-context";
import { resendVerification } from "../lib/api";
import {
  buildAuthUrl,
  getAuthRedirectFromState,
  getInvitationTokenFromRedirect,
  getSafeAuthRedirect,
} from "../lib/auth-redirect";
import { isEmailVerificationRequiredError } from "../lib/email-verification";
import { productAnalytics } from "../lib/product-analytics";
import { type LoginFormData, loginSchema } from "../lib/schemas";
import { workspacePath } from "../lib/workspace-routes";

export function LoginPage() {
  const { t } = useTranslation();

  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const redirectTo =
    getSafeAuthRedirect(searchParams.get("redirect")) ??
    getAuthRedirectFromState(location.state);
  const invitationToken = getInvitationTokenFromRedirect(redirectTo);
  const suggestedEmail = searchParams.get("email") ?? "";
  const { login, isLoading, error, clearError, isAuthenticated, user } = useAuth();
  const {
    activeWorkspaceId,
    isLoading: isWorkspaceLoading,
    needsWorkspaceSetup,
    needsWorkspaceChoice,
  } = useWorkspace();

  const [verificationRequired, setVerificationRequired] = React.useState(false);
  const [isResending, setIsResending] = React.useState(false);
  const [resendMessage, setResendMessage] = React.useState<string | null>(null);
  const [resendError, setResendError] = React.useState<string | null>(null);
  const [showPassword, setShowPassword] = React.useState(false);

  // Mobile App Download Dialog & QR State
  const [qrModalOpen, setQrModalOpen] = React.useState(false);
  const [selectedPlatform, setSelectedPlatform] = React.useState<"android" | "ios">("android");
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);

  const rawAndroidUrl =
    import.meta.env.VITE_ANDROID_APP_URL || "/downloads/android";
  const rawIosUrl =
    import.meta.env.VITE_IOS_APP_URL || "/downloads/ios";

  const getAbsoluteUrl = (url: string) => {
    if (typeof window !== "undefined" && url.startsWith("/")) {
      return `${window.location.origin}${url}`;
    }
    return url;
  };

  const androidUrl = getAbsoluteUrl(rawAndroidUrl);
  const iosUrl = getAbsoluteUrl(rawIosUrl);
  const currentUrl = selectedPlatform === "android" ? androidUrl : iosUrl;

  const isMobileBrowser =
    typeof navigator !== "undefined" &&
    /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent,
    );

  React.useEffect(() => {
    if (!qrModalOpen || !canvasRef.current) return;
    QRCode.toCanvas(canvasRef.current, currentUrl, {
      width: 220,
      margin: 2,
      color: {
        dark: "#0b141a",
        light: "#ffffff",
      },
    }).catch(() => {
      // ignore
    });
  }, [qrModalOpen, selectedPlatform, currentUrl]);

  const handleBadgeClick = (
    e: React.MouseEvent,
    platform: "android" | "ios",
    url: string,
  ) => {
    if (isMobileBrowser) {
      window.location.href = url;
      return;
    }
    e.preventDefault();
    setSelectedPlatform(platform);
    setQrModalOpen(true);
  };

  const {
    register,
    getValues,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: suggestedEmail,
      password: "",
    },
  });
  const currentEmail = watch("email");

  React.useEffect(() => {
    if (!isAuthenticated || isWorkspaceLoading) return;
    if (redirectTo) {
      const isSuper =
        user?.email?.toLowerCase().trim() === "info@namehostclub.com" &&
        user?.isSuperAdmin === true;
      if (redirectTo.startsWith("/admin") && !isSuper) {
        if (needsWorkspaceSetup) {
          navigate("/company-setup", { replace: true });
        } else if (needsWorkspaceChoice || !activeWorkspaceId) {
          navigate("/workspaces", { replace: true });
        } else {
          navigate(workspacePath(activeWorkspaceId), { replace: true });
        }
      } else {
        navigate(redirectTo, { replace: true });
      }
    } else if (needsWorkspaceSetup) {
      navigate("/company-setup", { replace: true });
    } else if (needsWorkspaceChoice || !activeWorkspaceId) {
      navigate("/workspaces", { replace: true });
    } else {
      navigate(workspacePath(activeWorkspaceId), { replace: true });
    }
  }, [
    activeWorkspaceId,
    isAuthenticated,
    isWorkspaceLoading,
    navigate,
    needsWorkspaceChoice,
    needsWorkspaceSetup,
    redirectTo,
    user,
  ]);

  const onSubmit = async (data: LoginFormData) => {
    clearError();
    setVerificationRequired(false);
    setResendMessage(null);
    setResendError(null);
    try {
      await login(data.email, data.password);
      productAnalytics.track("login", { method: "email" });
    } catch (loginError) {
      if (isEmailVerificationRequiredError(loginError)) {
        setVerificationRequired(true);
      }
    }
  };

  const resendVerificationEmail = async () => {
    const { email, password } = getValues();
    setIsResending(true);
    setResendMessage(null);
    setResendError(null);
    try {
      const response = await resendVerification(
        email,
        password,
        invitationToken,
      );
      setResendMessage(response.message);
    } catch (resendFailure) {
      setResendError(
        resendFailure instanceof Error
          ? resendFailure.message
          : t(
              "auth.resendVerificationFailed",
              "Could not resend the verification email",
            ),
      );
    } finally {
      setIsResending(false);
    }
  };

  const clearLoginFeedback = () => {
    if (error) clearError();
    if (verificationRequired) setVerificationRequired(false);
    setResendMessage(null);
    setResendError(null);
  };

  return (
    <div className="relative min-h-screen w-full overflow-x-hidden bg-[#F9FCFB] text-slate-900 font-sans selection:bg-[#D8FADE] selection:text-[#006C46]">
      {/* Background Decorative Mint Circles and Gradients */}
      <div
        className="pointer-events-none absolute -left-28 -top-28 h-[540px] w-[540px] rounded-full bg-[#34D399]/14 blur-3xl"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute right-[-5%] top-[18%] h-[680px] w-[680px] rounded-full bg-[#10B981]/10 blur-3xl"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute bottom-[-10%] right-[-10%] h-[560px] w-[560px] rounded-full bg-[#059669]/10 blur-3xl"
        aria-hidden="true"
      />

      {/* Subtle Dot Grids */}
      <div
        className="pointer-events-none absolute top-8 right-12 hidden lg:grid grid-cols-6 gap-3.5 opacity-25"
        aria-hidden="true"
      >
        {Array.from({ length: 30 }).map((_, i) => (
          <div key={i} className="h-1 w-1 rounded-full bg-[#008E56]" />
        ))}
      </div>
      <div
        className="pointer-events-none absolute bottom-12 left-10 hidden lg:grid grid-cols-5 gap-3.5 opacity-25"
        aria-hidden="true"
      >
        {Array.from({ length: 25 }).map((_, i) => (
          <div key={i} className="h-1 w-1 rounded-full bg-[#008E56]" />
        ))}
      </div>

      {/* Main Page Layout Container */}
      <main className="relative mx-auto flex min-h-screen w-full max-w-[1440px] items-center px-4 py-8 sm:px-8 lg:px-12 lg:py-10">
        <div className="grid w-full grid-cols-1 items-center gap-10 lg:grid-cols-[490px_1fr] xl:grid-cols-[515px_1fr] xl:gap-16">
          {/* ========================================================= */}
          {/* LEFT: Elevated White Login Card                           */}
          {/* ========================================================= */}
          <section
            aria-labelledby="login-heading"
            className="relative mx-auto w-full max-w-[515px] rounded-[30px] border border-slate-200/70 bg-white p-7 shadow-[0_20px_55px_-12px_rgba(0,60,35,0.08),0_6px_20px_-6px_rgba(0,0,0,0.03)] sm:p-9 lg:p-10"
          >
            {/* Brand Header */}
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#00A86B] to-[#007B4A] shadow-sm shadow-[#007B4A]/25">
                <svg
                  className="h-5 w-5 text-white"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM8 12c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm4 0c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm4 0c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z" />
                </svg>
              </div>
              <span className="text-[21px] font-black tracking-[-0.03em] text-slate-900">
                WATeamInbox
              </span>
            </div>

            {/* Welcome Pill & Heading */}
            <div className="mt-6 sm:mt-7">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-[#E8F8F0] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-[#00875A]">
                <span>{t("auth.welcomeBack", "WELCOME BACK")}</span>
                <span className="text-xs" aria-hidden="true">✨</span>
              </div>
              <h1
                id="login-heading"
                className="mt-2.5 text-3xl font-black tracking-[-0.04em] text-slate-950 sm:text-[38px] sm:leading-[1.08]"
              >
                Sign in to your
                <br />
                team inbox
              </h1>
              <p className="mt-2 text-xs leading-relaxed text-slate-500 sm:text-[13.5px]">
                {t(
                  "auth.loginSubtitle",
                  "Manage customer conversations, assignments, and context — all in one place with your team.",
                )}
              </p>
            </div>

            {/* Conditional Login Error Alert */}
            {error && (
              <div
                role="alert"
                aria-live="polite"
                className="mt-4 flex items-start gap-2.5 rounded-xl border border-[#FFB9BD] bg-[#FFF1F2] px-3.5 py-2.5 text-xs text-[#DC1414]"
              >
                <CircleAlert
                  className="mt-0.5 h-4 w-4 shrink-0 text-[#DC1414]"
                  aria-hidden="true"
                />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{error}</p>
                  {verificationRequired && (
                    <button
                      type="button"
                      onClick={resendVerificationEmail}
                      disabled={isResending || Boolean(resendMessage)}
                      className="mt-1.5 inline-flex items-center gap-1.5 font-bold underline hover:text-red-800 disabled:opacity-60"
                    >
                      {isResending ? (
                        <LoaderCircle
                          className="h-3.5 w-3.5 animate-spin"
                          aria-hidden="true"
                        />
                      ) : (
                        <MailCheck className="h-3.5 w-3.5" aria-hidden="true" />
                      )}
                      {isResending
                        ? t("auth.sending", "Sending…")
                        : t(
                            "auth.resendVerification",
                            "Resend verification email",
                          )}
                    </button>
                  )}
                  {resendMessage && (
                    <p className="mt-1 font-semibold text-emerald-700">
                      {resendMessage}
                    </p>
                  )}
                  {resendError && (
                    <p className="mt-1 font-medium">{resendError}</p>
                  )}
                </div>
              </div>
            )}

            {/* Login Form */}
            <form
              onSubmit={handleSubmit(onSubmit)}
              onChange={clearLoginFeedback}
              className="mt-5 space-y-4"
              aria-busy={isLoading}
              noValidate
            >
              {/* Work email input */}
              <div>
                <label
                  htmlFor="email"
                  className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-slate-800"
                >
                  <Mail className="h-3.5 w-3.5 text-slate-700" aria-hidden="true" />
                  {t("auth.workEmail", "Work email")}
                </label>
                <div className="relative">
                  <input
                    id="email"
                    type="email"
                    autoComplete="username"
                    autoFocus
                    placeholder="admin@ayyansystems.com"
                    {...register("email")}
                    className="h-11 w-full rounded-xl border border-[#DDE5EA] bg-white px-3.5 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm transition-all focus:border-[#008E56] focus:outline-none focus:ring-2 focus:ring-[#008E56]/15"
                  />
                </div>
                {errors.email && (
                  <p className="mt-1 text-xs font-semibold text-red-600">
                    {errors.email.message}
                  </p>
                )}
              </div>

              {/* Password input */}
              <div>
                <label
                  htmlFor="password"
                  className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-slate-800"
                >
                  <Lock className="h-3.5 w-3.5 text-slate-700" aria-hidden="true" />
                  {t("auth.password", "Password")}
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="••••••••••••"
                    {...register("password")}
                    className="h-11 w-full rounded-xl border border-[#DDE5EA] bg-white px-3.5 pr-10 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm transition-all focus:border-[#008E56] focus:outline-none focus:ring-2 focus:ring-[#008E56]/15"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 transition-colors hover:text-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#008E56] rounded-md"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" aria-hidden="true" />
                    ) : (
                      <Eye className="h-4 w-4" aria-hidden="true" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p className="mt-1 text-xs font-semibold text-red-600">
                    {errors.password.message}
                  </p>
                )}
                <div className="mt-1.5 flex justify-end">
                  <Link
                    to={buildAuthUrl("/forgot-password", redirectTo, currentEmail)}
                    className="text-xs font-bold text-[#008E56] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#008E56] rounded-sm"
                  >
                    {t("auth.forgotPasswordLink", "Forgot password?")}
                  </Link>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="mt-1 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#007B4A] to-[#008E56] text-sm font-bold text-white shadow-md shadow-[#008E56]/25 transition-all duration-150 hover:from-[#006C46] hover:to-[#007B4A] hover:shadow-lg active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#008E56] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 sm:h-12 sm:text-base"
              >
                {isLoading ? (
                  <>
                    <LoaderCircle
                      className="h-4 w-4 animate-spin"
                      aria-hidden="true"
                    />
                    <span>{t("auth.signingIn", "Signing in…")}</span>
                  </>
                ) : (
                  <>
                    <span>Sign in to WATeamInbox</span>
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </>
                )}
              </button>
            </form>

            {/* Security Note Box */}
            <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-[#D3EEDF] bg-[#F2FAF6] p-3 text-slate-600">
              <ShieldCheck
                className="mt-0.5 h-4 w-4 shrink-0 text-[#008E56]"
                aria-hidden="true"
              />
              <p className="text-[11.5px] leading-snug">
                {t(
                  "auth.loginPrivacyNote",
                  "Your sign-in is protected, and workspace access stays private to approved team members.",
                )}
              </p>
            </div>

            {/* Registration Link */}
            <p className="mt-4 text-center text-xs text-slate-600">
              {t("auth.newToApp", "New to WATeamInbox?")}{" "}
              <Link
                to={buildAuthUrl("/register", redirectTo, currentEmail)}
                className="font-bold text-[#008E56] underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#008E56] rounded-sm"
              >
                {t("auth.createAccountLink", "Create an account")}
              </Link>
            </p>

            {/* Mobile App Download Section */}
            <div className="mt-4 border-t border-slate-100 pt-3.5">
              <p className="mb-2.5 text-center text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
                {t("auth.getMobileApp", "GET THE MOBILE APP")}
              </p>
              <div className="flex w-full items-center justify-center gap-2">
                {/* Google Play */}
                <a
                  href={androidUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => handleBadgeClick(e, "android", androidUrl)}
                  className="group flex h-[42px] flex-1 max-w-[155px] items-center gap-2 rounded-xl border border-[#DDE5EA] bg-white px-2.5 shadow-sm transition-all hover:bg-slate-50/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                  title="Get it on Google Play"
                >
                  <GooglePlayIcon className="h-5 w-5 shrink-0" />
                  <div className="flex min-w-0 flex-col overflow-hidden text-left">
                    <span className="text-[8px] font-bold uppercase tracking-wider text-slate-400 leading-none">
                      GET IT ON
                    </span>
                    <span className="truncate text-[11.5px] font-bold text-slate-800 leading-tight">
                      Google Play
                    </span>
                  </div>
                </a>

                {/* App Store */}
                <a
                  href={iosUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => handleBadgeClick(e, "ios", iosUrl)}
                  className="group flex h-[42px] flex-1 max-w-[155px] items-center gap-2 rounded-xl border border-[#DDE5EA] bg-white px-2.5 shadow-sm transition-all hover:bg-slate-50/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                  title="Download on the App Store"
                >
                  <AppleStoreIcon className="h-5 w-5 shrink-0 text-slate-900" />
                  <div className="flex min-w-0 flex-col overflow-hidden text-left">
                    <span className="text-[8px] font-bold uppercase tracking-wider text-slate-400 leading-none">
                      DOWNLOAD ON THE
                    </span>
                    <span className="truncate text-[11.5px] font-bold text-slate-800 leading-tight">
                      App Store
                    </span>
                  </div>
                </a>

                {/* QR Toggle Button */}
                {!isMobileBrowser && (
                  <button
                    type="button"
                    onClick={() => setQrModalOpen(true)}
                    className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-xl border border-[#DDE5EA] bg-white text-slate-600 shadow-sm transition-colors hover:text-[#008E56] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                    title="Scan QR Code to install on mobile phone"
                    aria-label="Scan QR Code to install on mobile phone"
                  >
                    <QrCode className="h-4 w-4" aria-hidden="true" />
                  </button>
                )}
              </div>

              {/* Bottom Security Caption */}
              <div className="mt-3 flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
                <Lock className="h-3 w-3 shrink-0" aria-hidden="true" />
                <span>Secure login · Your data stays private and encrypted.</span>
              </div>
            </div>
          </section>

          {/* ========================================================= */}
          {/* RIGHT: Marketing Hero & Collaborative Inbox Illustration   */}
          {/* ========================================================= */}
          <section className="relative flex flex-col justify-center py-4 lg:py-0">
            {/* Top Headline */}
            <div className="max-w-xl">
              <h2 className="text-3xl font-black tracking-[-0.035em] text-slate-950 sm:text-4xl lg:text-[44px] lg:leading-[1.12]">
                Keep every customer
                <br />
                conversation{" "}
                <span className="relative inline-flex items-center">
                  <span className="rounded-full bg-[#D8FADE] px-3.5 py-0.5 font-bold italic text-[#006C46]">
                    in sync
                  </span>
                  {/* Decorative Green Accent Strokes */}
                  <svg
                    className="absolute -right-6 -top-1 h-5 w-5 text-[#00A86B]"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    aria-hidden="true"
                  >
                    <path d="M13 5l3 3M17 12h-4M13 19l3-3" />
                  </svg>
                </span>
                <br />
                with your team
              </h2>
              <p className="mt-3 max-w-lg text-sm leading-relaxed text-slate-600 sm:text-base">
                A shared team inbox for faster replies, clear ownership, and complete customer context.
              </p>
            </div>

            {/* Collaborative Product Mockup & Avatars Floating Container */}
            <div className="relative mt-8 max-w-[620px] pb-6 pt-4 lg:mt-10">
              {/* Dotted Green Connector Arcs in Background */}
              <svg
                className="pointer-events-none absolute inset-0 h-full w-full"
                aria-hidden="true"
              >
                {/* Arc from Top-Left Avatar to Window */}
                <path
                  d="M 50 40 Q 110 -10, 190 30"
                  fill="none"
                  stroke="#34D399"
                  strokeWidth="1.5"
                  strokeDasharray="4 4"
                  opacity="0.8"
                />
                {/* Arc from Bottom-Left Avatar to Window */}
                <path
                  d="M 45 285 Q 120 330, 240 280"
                  fill="none"
                  stroke="#34D399"
                  strokeWidth="1.5"
                  strokeDasharray="4 4"
                  opacity="0.8"
                />
              </svg>

              {/* Avatar 1: Top Left */}
              <div
                className="absolute -left-5 top-2 z-20 hidden sm:block"
                aria-hidden="true"
              >
                <img
                  src="/avatars/avatar-1.png"
                  alt=""
                  className="h-12 w-12 rounded-full object-cover shadow-md shadow-emerald-950/10 ring-2 ring-white"
                />
              </div>

              {/* Avatar 2: Bottom Left */}
              <div
                className="absolute -left-6 bottom-6 z-20 hidden sm:block"
                aria-hidden="true"
              >
                <img
                  src="/avatars/avatar-2.png"
                  alt=""
                  className="h-12 w-12 rounded-full object-cover shadow-md shadow-emerald-950/10 ring-2 ring-white"
                />
              </div>

              {/* Avatar 3: Far Right */}
              <div
                className="absolute -right-4 top-[40%] z-20 hidden sm:block"
                aria-hidden="true"
              >
                <img
                  src="/avatars/avatar-3.png"
                  alt=""
                  className="h-12 w-12 rounded-full object-cover shadow-md shadow-emerald-950/10 ring-2 ring-white"
                />
              </div>

              {/* Floating "Your team is waiting" Pill */}
              <div
                className="absolute -top-3 right-6 z-20 flex items-center gap-2 rounded-full border border-emerald-200/90 bg-white/95 px-3.5 py-1.5 shadow-md shadow-emerald-900/5 backdrop-blur"
                aria-hidden="true"
              >
                <Users className="h-4 w-4 text-[#00A86B]" />
                <span className="text-xs font-bold text-slate-800">
                  Your team is waiting
                </span>
              </div>

              {/* Floating WhatsApp Tile at Bottom Right */}
              <div
                className="absolute -bottom-2 -right-2 z-20 hidden sm:block"
                aria-hidden="true"
              >
                <div className="relative">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#25D366] text-white shadow-lg shadow-[#25D366]/40">
                    <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
                    </svg>
                  </div>
                  {/* Radiating Accent Rays */}
                  <svg
                    className="absolute -right-3 -top-2.5 h-4 w-4 text-[#00A86B]"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  >
                    <path d="M12 3v3M19 6l-2 2M21 12h-3" />
                  </svg>
                </div>
              </div>

              {/* Main Floating Window Shell */}
              <div
                className="overflow-hidden rounded-[24px] border border-slate-200/90 bg-white shadow-[0_24px_55px_-15px_rgba(0,100,50,0.12),0_8px_20px_-8px_rgba(0,0,0,0.04)] lg:-rotate-[1.2deg] transition-transform duration-300 hover:rotate-0"
                aria-hidden="true"
              >
                {/* Window Top Bar with macOS Dots */}
                <div className="flex h-8 items-center gap-1.5 border-b border-slate-100 bg-slate-50/60 px-4">
                  <div className="h-2.5 w-2.5 rounded-full bg-[#FF5F56]" />
                  <div className="h-2.5 w-2.5 rounded-full bg-[#FFBD2E]" />
                  <div className="h-2.5 w-2.5 rounded-full bg-[#27C93F]" />
                </div>

                {/* Inner Window Grid */}
                <div className="grid grid-cols-[145px_1fr] min-h-[290px]">
                  {/* Left Rail within Mockup */}
                  <div className="border-r border-slate-100 bg-slate-50/40 p-3 flex flex-col justify-between">
                    <div>
                      {/* Logo in Mockup */}
                      <div className="flex items-center gap-1.5 pb-3">
                        <div className="flex h-5 w-5 items-center justify-center rounded-md bg-[#00A86B] text-white">
                          <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" />
                          </svg>
                        </div>
                        <span className="text-[11px] font-bold text-slate-800">
                          WATeamInbox
                        </span>
                      </div>

                      {/* Mockup Navigation List */}
                      <div className="space-y-1 pt-1">
                        <div className="flex items-center justify-between rounded-lg bg-[#E8F8F0] px-2 py-1 text-[11px] font-bold text-[#00875A]">
                          <div className="flex items-center gap-1.5">
                            <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5v-3h14v3zm0-5H5V5h14v9z" />
                            </svg>
                            <span>Inbox</span>
                          </div>
                          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#00875A] text-[9px] font-bold text-white">
                            12
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 px-2 py-1 text-[11px] font-medium text-slate-500">
                          <User className="h-3 w-3" />
                          <span>Assigned to me</span>
                        </div>

                        <div className="flex items-center gap-1.5 px-2 py-1 text-[11px] font-medium text-slate-500">
                          <Users className="h-3 w-3" />
                          <span>Team</span>
                        </div>

                        <div className="flex items-center gap-1.5 px-2 py-1 text-[11px] font-medium text-slate-500">
                          <UserCheck className="h-3 w-3" />
                          <span>Customers</span>
                        </div>

                        <div className="flex items-center gap-1.5 px-2 py-1 text-[11px] font-medium text-slate-500">
                          <BarChart3 className="h-3 w-3" />
                          <span>Analytics</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Chat Pane within Mockup */}
                  <div className="flex flex-col justify-between bg-white p-3.5">
                    {/* Chat Header */}
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                      <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#25D366] text-white">
                          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981z" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-900 leading-tight">
                            Sara Mitchell
                          </p>
                          <p className="text-[10px] text-slate-400">
                            Online now · Acme & Co.
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-300">
                        <Star className="h-3.5 w-3.5" />
                        <MoreVertical className="h-3.5 w-3.5" />
                      </div>
                    </div>

                    {/* Chat Bubbles */}
                    <div className="my-2 space-y-2.5">
                      {/* Incoming Customer Message */}
                      <div className="max-w-[270px] rounded-2xl rounded-tl-sm border border-slate-100 bg-white p-2.5 shadow-sm">
                        <p className="text-xs leading-snug text-slate-800">
                          Thanks! Could you send the updated quote before 3pm?
                        </p>
                        <span className="mt-1 block text-right text-[9px] text-slate-400">
                          10:42
                        </span>
                      </div>

                      {/* Outgoing Team Reply Message */}
                      <div className="ml-auto max-w-[290px] rounded-2xl rounded-br-sm bg-[#D8FADE] p-2.5 shadow-sm">
                        <p className="text-xs leading-snug text-[#064E3B]">
                          Absolutely—Maya is preparing it now. We’ll send it shortly.
                        </p>
                        <div className="mt-1 flex items-center justify-end gap-1 text-[9px] font-semibold text-[#00875A]">
                          <span>10:43</span>
                          <CheckCheck className="h-3 w-3" />
                        </div>
                      </div>
                    </div>

                    {/* Assigned Status Footer */}
                    <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-1.5">
                      <div className="flex items-center gap-1.5 text-xs text-slate-600">
                        <User className="h-3 w-3 text-slate-400" />
                        <span className="text-[11px] font-medium">Assigned to Maya</span>
                      </div>
                      <span className="rounded-full bg-[#D8FADE] px-2 py-0.5 text-[9.5px] font-bold text-[#006C46]">
                        In progress
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Benefits Row */}
            <div className="mt-8 grid grid-cols-1 gap-4 border-t border-slate-200/60 pt-6 sm:grid-cols-3 lg:gap-6 max-w-2xl">
              {/* Feature 1 */}
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#E7F9EF] text-[#008E56]">
                  <Zap className="h-4 w-4" aria-hidden="true" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900">
                    Reply faster together
                  </h3>
                  <p className="mt-0.5 text-[11px] leading-normal text-slate-500">
                    Collaborate and resolve queries as a team.
                  </p>
                </div>
              </div>

              {/* Feature 2 */}
              <div className="flex items-start gap-3 sm:border-l sm:border-slate-200/60 sm:pl-4 lg:pl-6">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#E7F9EF] text-[#008E56]">
                  <Users className="h-4 w-4" aria-hidden="true" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900">
                    Clear ownership & handoffs
                  </h3>
                  <p className="mt-0.5 text-[11px] leading-normal text-slate-500">
                    Assign, track, and never lose context.
                  </p>
                </div>
              </div>

              {/* Feature 3 */}
              <div className="flex items-start gap-3 sm:border-l sm:border-slate-200/60 sm:pl-4 lg:pl-6">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#E7F9EF] text-[#008E56]">
                  <Layers className="h-4 w-4" aria-hidden="true" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900">
                    Full conversation history
                  </h3>
                  <p className="mt-0.5 text-[11px] leading-normal text-slate-500">
                    Keep the complete customer journey in one place.
                  </p>
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>

      {/* QR Code & Direct Download Dialog for Desktop */}
      <Dialog open={qrModalOpen} onOpenChange={setQrModalOpen}>
        <DialogContent className="bg-white text-slate-900 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center text-lg font-bold">
              Scan to Install Mobile App
            </DialogTitle>
            <DialogDescription className="text-center text-xs text-slate-500">
              Point your smartphone camera at the QR code to install the WATeamInbox app on your device.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center py-4">
            <div className="flex gap-2 rounded-lg bg-slate-100 p-1 mb-4">
              <button
                type="button"
                onClick={() => setSelectedPlatform("android")}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                  selectedPlatform === "android"
                    ? "bg-white text-emerald-700 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Android APK
              </button>
              <button
                type="button"
                onClick={() => setSelectedPlatform("ios")}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                  selectedPlatform === "ios"
                    ? "bg-white text-emerald-700 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Apple iOS
              </button>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-inner">
              <canvas ref={canvasRef} className="block" />
            </div>
            <p className="mt-3 text-center text-xs text-slate-400">
              Direct download URL:{" "}
              <a
                href={currentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-emerald-600 hover:underline break-all"
              >
                {currentUrl}
              </a>
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
