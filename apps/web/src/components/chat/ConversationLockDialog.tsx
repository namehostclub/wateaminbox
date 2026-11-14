import { KeyRound, Lock, ShieldCheck, Trash2 } from "lucide-react";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useConversationLock } from "@/hooks/useConversationLock";
import { removeContactLock, setContactLock } from "@/lib/api/contacts";
import type { Contact } from "@wateaminbox/shared";

export type LockDialogMode = "set" | "change" | "remove";

interface ConversationLockDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contact: Contact;
  initialMode?: LockDialogMode;
  onSuccess?: (isPasswordProtected: boolean, hint?: string | null) => void;
}

export function ConversationLockDialog({
  open,
  onOpenChange,
  contact,
  initialMode = "set",
  onSuccess,
}: ConversationLockDialogProps) {
  const { t } = useTranslation();
  const [mode, setMode] = useState<LockDialogMode>(initialMode);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [hint, setHint] = useState(contact.lockHint || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { registerToken, lockNow } = useConversationLock();

  // Reset form when dialog opens/mode changes
  React.useEffect(() => {
    if (open) {
      setMode(initialMode);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setHint(contact.lockHint || "");
      setError(null);
    }
  }, [open, initialMode, contact.lockHint]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (mode === "remove") {
      setIsSubmitting(true);
      try {
        await removeContactLock(contact.id, {
          currentPassword: currentPassword.trim() || undefined,
        });
        lockNow(contact.id);
        onSuccess?.(false, null);
        onOpenChange(false);
      } catch (err: any) {
        setError(err?.message || err?.error || "Failed to remove protection");
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    // Set or Change Mode
    if (newPassword.length < 4) {
      setError(t("chat.passcodeMinLength", "Passcode must be at least 4 characters"));
      return;
    }

    if (newPassword !== confirmPassword) {
      setError(t("chat.passcodesDoNotMatch", "Passcodes do not match"));
      return;
    }

    if (mode === "change" && !currentPassword.trim()) {
      setError(t("chat.currentPasscodeRequired", "Current passcode is required"));
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await setContactLock(contact.id, {
        password: newPassword,
        hint: hint.trim() || null,
        currentPassword: mode === "change" ? currentPassword.trim() : undefined,
      });

      if (response.unlockToken) {
        registerToken(contact.id, response.unlockToken);
      }

      onSuccess?.(true, hint.trim() || null);
      onOpenChange(false);
    } catch (err: any) {
      setError(err?.message || err?.error || "Failed to save passcode");
    } finally {
      setIsSubmitting(false);
    }
  };

  const displayName =
    contact.customName || contact.name || contact.phoneNumber || "Contact";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              {mode === "remove" ? (
                <Trash2 className="w-4 h-4 text-rose-500" />
              ) : mode === "change" ? (
                <KeyRound className="w-4 h-4" />
              ) : (
                <Lock className="w-4 h-4" />
              )}
            </div>
            <DialogTitle>
              {mode === "remove"
                ? t("chat.removeProtectionTitle", "Remove Passcode Protection")
                : mode === "change"
                  ? t("chat.changePasscodeTitle", "Change Passcode")
                  : t("chat.setPasscodeTitle", "Protect Conversation")}
            </DialogTitle>
          </div>
          <DialogDescription>
            {mode === "remove"
              ? t(
                  "chat.removeProtectionDesc",
                  "Anyone with inbox access will be able to view this conversation without entering a passcode.",
                )
              : t(
                  "chat.setPasscodeDesc",
                  "Set a security passcode to protect messages with {{name}}.",
                  { name: displayName },
                )}
          </DialogDescription>
        </DialogHeader>

        {/* Mode Switcher Tabs if already protected */}
        {contact.isPasswordProtected && (
          <div className="flex rounded-lg bg-gray-100 dark:bg-dark-tertiary p-1 mb-2">
            <button
              type="button"
              onClick={() => {
                setMode("change");
                setError(null);
              }}
              className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${
                mode === "change"
                  ? "bg-white dark:bg-dark-secondary shadow-sm text-gray-900 dark:text-dark-text-primary"
                  : "text-gray-500 dark:text-dark-text-secondary hover:text-gray-900"
              }`}
            >
              {t("chat.changePasscodeTab", "Change Passcode")}
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("remove");
                setError(null);
              }}
              className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${
                mode === "remove"
                  ? "bg-white dark:bg-dark-secondary shadow-sm text-rose-600 dark:text-rose-400"
                  : "text-gray-500 dark:text-dark-text-secondary hover:text-gray-900"
              }`}
            >
              {t("chat.removePasscodeTab", "Remove Protection")}
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Current Password Field (for Change or Remove) */}
          {(mode === "change" || mode === "remove") && (
            <div className="space-y-1.5">
              <Label htmlFor="current-passcode">
                {t("chat.currentPasscode", "Current Passcode")}
              </Label>
              <Input
                id="current-passcode"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder={t("chat.enterCurrentPasscode", "Enter current passcode")}
                autoFocus
                required
              />
            </div>
          )}

          {/* New Password & Confirmation (for Set or Change) */}
          {mode !== "remove" && (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="new-passcode">
                  {mode === "change"
                    ? t("chat.newPasscode", "New Passcode")
                    : t("chat.passcode", "Security Passcode")}
                </Label>
                <Input
                  id="new-passcode"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder={t(
                    "chat.enterNewPasscode",
                    "Enter at least 4 digits or characters",
                  )}
                  autoFocus={mode === "set"}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="confirm-passcode">
                  {t("chat.confirmPasscode", "Confirm Passcode")}
                </Label>
                <Input
                  id="confirm-passcode"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder={t(
                    "chat.reEnterPasscode",
                    "Re-enter security passcode",
                  )}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="hint-passcode">
                  {t("chat.hintOptional", "Passcode Hint (Optional)")}
                </Label>
                <Input
                  id="hint-passcode"
                  type="text"
                  value={hint}
                  onChange={(e) => setHint(e.target.value)}
                  placeholder={t(
                    "chat.hintPlaceholder",
                    "e.g. VIP client phone last 4 digits",
                  )}
                  maxLength={80}
                />
                <p className="text-[11px] text-gray-500 dark:text-dark-text-secondary">
                  {t(
                    "chat.hintExplanation",
                    "This hint is displayed on the lock screen to assist authorized teammates.",
                  )}
                </p>
              </div>
            </>
          )}

          {error && (
            <div className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-xs font-medium text-rose-600 dark:text-rose-400">
              {error}
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              {t("common.cancel", "Cancel")}
            </Button>
            <Button
              type="submit"
              variant={mode === "remove" ? "destructive" : "default"}
              disabled={isSubmitting}
              className={
                mode !== "remove"
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                  : ""
              }
            >
              {isSubmitting ? (
                <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              ) : mode === "remove" ? (
                t("chat.removeProtectionButton", "Remove Protection")
              ) : mode === "change" ? (
                t("chat.updatePasscodeButton", "Update Passcode")
              ) : (
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4" />
                  {t("chat.lockConversationButton", "Lock Conversation")}
                </span>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

