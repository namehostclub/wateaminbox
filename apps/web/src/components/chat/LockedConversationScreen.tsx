import { Eye, EyeOff, Lock, ShieldAlert, Sparkles } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { IdentityAvatarFallback } from "@/components/ui/identity-avatar-fallback";
import { useConversationLock } from "@/hooks/useConversationLock";
import type { Contact } from "@wateaminbox/shared";

interface LockedConversationScreenProps {
  contact: Contact;
  onUnlocked?: () => void;
}

export function LockedConversationScreen({
  contact,
  onUnlocked,
}: LockedConversationScreenProps) {
  const { t } = useTranslation();
  const [passcode, setPasscode] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { unlock, isLoading, error, setError, remainingAttempts } =
    useConversationLock();

  useEffect(() => {
    setError(null);
    setPasscode("");
    inputRef.current?.focus();
  }, [contact.id, setError]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passcode.trim() || isLoading) return;

    const success = await unlock(contact.id, passcode.trim());
    if (success) {
      setPasscode("");
      onUnlocked?.();
    } else {
      inputRef.current?.select();
    }
  };

  const displayName =
    contact.customName ||
    contact.name ||
    contact.phoneNumber ||
    contact.jid ||
    t("chat.unknownContact", "Unknown");

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 bg-[#efeae2]/40 dark:bg-dark-primary/60 relative overflow-hidden select-none">
      {/* Background ambient pattern */}
      <div className="absolute inset-0 bg-repeat opacity-15 pointer-events-none dark:invert" />

      <div className="relative w-full max-w-md mx-auto bg-white/90 dark:bg-dark-secondary/90 backdrop-blur-md rounded-2xl shadow-xl border border-gray-200/80 dark:border-dark-border p-6 sm:p-8 flex flex-col items-center text-center animate-in fade-in zoom-in-95 duration-200">
        {/* Padlock Badge */}
        <div className="relative mb-5">
          <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-700/60 flex items-center justify-center shadow-inner">
            <Lock className="w-8 h-8 text-emerald-600 dark:text-emerald-400 stroke-[2.2]" />
          </div>
          <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-white dark:bg-dark-elevated shadow border border-gray-200 dark:border-dark-border flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          </div>
        </div>

        {/* Contact Info Header */}
        <div className="flex items-center gap-2.5 mb-2">
          <div className="w-7 h-7 rounded-full overflow-hidden bg-gray-200 dark:bg-dark-tertiary shrink-0">
            {contact.avatarUrl ? (
              <img
                src={contact.avatarUrl}
                alt={displayName}
                className="w-full h-full object-cover"
              />
            ) : (
              <IdentityAvatarFallback
                displayName={displayName}
                identity={contact.jid || contact.phoneNumber || contact.id}
                className="text-xs"
              />
            )}
          </div>
          <h2 className="text-base font-semibold text-gray-900 dark:text-dark-text-primary truncate max-w-[240px]">
            {displayName}
          </h2>
        </div>

        <h3 className="text-xl font-bold text-gray-900 dark:text-dark-text-primary tracking-tight mb-1.5">
          {t("chat.lockedTitle", "Conversation Protected")}
        </h3>
        <p className="text-sm text-gray-600 dark:text-dark-text-secondary max-w-sm mb-6">
          {t(
            "chat.lockedDescription",
            "This chat is secured with a security passcode. Enter the code to view messages and history.",
          )}
        </p>

        {/* Form Input */}
        <form onSubmit={handleSubmit} className="w-full space-y-4">
          <div className="relative w-full">
            <input
              ref={inputRef}
              type={showPassword ? "text" : "password"}
              value={passcode}
              onChange={(e) => {
                setPasscode(e.target.value);
                if (error) setError(null);
              }}
              placeholder={t("chat.enterPasscode", "Enter conversation passcode")}
              autoComplete="current-password"
              className="w-full pl-4 pr-11 py-3 bg-gray-50 dark:bg-dark-tertiary/70 border border-gray-300 dark:border-dark-border rounded-xl text-gray-900 dark:text-dark-text-primary text-center tracking-widest text-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 dark:focus:ring-emerald-400/40 transition-all placeholder:tracking-normal placeholder:text-sm placeholder:text-gray-400 dark:placeholder:text-gray-500"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-dark-text-primary p-1 focus:outline-none"
              tabIndex={-1}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <EyeOff className="w-5 h-5" />
              ) : (
                <Eye className="w-5 h-5" />
              )}
            </button>
          </div>

          {/* Hint if configured */}
          {contact.lockHint && (
            <div className="text-xs text-gray-500 dark:text-dark-text-secondary bg-gray-100/70 dark:bg-dark-tertiary/40 py-1.5 px-3 rounded-lg border border-gray-200/50 dark:border-dark-border/40 inline-block">
              <span className="font-medium text-gray-700 dark:text-dark-text-primary">
                {t("chat.lockHintLabel", "Hint:")}
              </span>{" "}
              {contact.lockHint}
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="flex items-center justify-center gap-1.5 text-xs font-medium text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 py-2 px-3 rounded-xl animate-in fade-in duration-150">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>{error}</span>
              {typeof remainingAttempts === "number" && (
                <span>({remainingAttempts} attempts left)</span>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={!passcode.trim() || isLoading}
            className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-xl shadow-sm hover:shadow transition-all flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <Lock className="w-4 h-4 stroke-[2.2]" />
                <span>{t("chat.unlockButton", "Unlock Conversation")}</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

