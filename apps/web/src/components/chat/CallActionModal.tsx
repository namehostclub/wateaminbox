import { useState } from "react";
import { Copy, Check, ExternalLink, Phone, PhoneCall } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { IdentityAvatarFallback } from "@/components/ui/identity-avatar-fallback";

interface CallActionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contactName: string;
  phoneNumber?: string | null;
  jid?: string | null;
  avatarUrl?: string | null;
  contactId?: string;
}

export function CallActionModal({
  open,
  onOpenChange,
  contactName,
  phoneNumber,
  jid,
  avatarUrl,
  contactId,
}: CallActionModalProps) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  // Extract clean numerical phone number
  const rawNumber = phoneNumber || (jid ? jid.split("@")[0].replace(/:\d+$/, "") : "");
  const cleanNumber = rawNumber ? rawNumber.replace(/[^0-9+]/g, "") : "";
  const displayFormattedPhone = cleanNumber.startsWith("+")
    ? cleanNumber
    : cleanNumber
      ? `+${cleanNumber}`
      : "";

  const handleCopy = async () => {
    if (!cleanNumber) return;
    try {
      await navigator.clipboard.writeText(displayFormattedPhone || cleanNumber);
      setCopied(true);
      toast.success(t("chat.phoneCopied", "Phone number copied to clipboard"));
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(t("chat.copyFailed", "Could not copy phone number"));
    }
  };

  const handleWhatsAppCall = () => {
    if (!cleanNumber) return;
    const digitsOnly = cleanNumber.replace(/\+/g, "");
    window.open(`https://wa.me/${digitsOnly}`, "_blank", "noopener,noreferrer");
    onOpenChange(false);
  };

  const handleTelephonyCall = () => {
    if (!cleanNumber) return;
    window.location.href = `tel:${displayFormattedPhone || cleanNumber}`;
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-white dark:bg-dark-secondary dark:border-dark-border text-slate-900 dark:text-dark-text-primary p-6">
        <DialogHeader className="flex flex-col items-center text-center">
          {/* Contact Avatar */}
          <div className="relative mb-2">
            <div className="h-16 w-16 overflow-hidden rounded-full border-2 border-emerald-500/20 bg-slate-100 shadow-md dark:bg-dark-tertiary">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={contactName}
                  className="h-full w-full object-cover"
                />
              ) : (
                <IdentityAvatarFallback
                  displayName={contactName}
                  identity={cleanNumber || contactId || contactName}
                  kind="user"
                  className="text-2xl"
                />
              )}
            </div>
            <div className="absolute bottom-0 right-0 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-white shadow ring-2 ring-white dark:ring-dark-secondary">
              <Phone className="h-2.5 w-2.5" />
            </div>
          </div>

          <DialogTitle className="text-base font-bold text-slate-900 dark:text-white">
            {t("chat.callContact", { name: contactName, defaultValue: `Call ${contactName}` })}
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500 dark:text-dark-text-tertiary mt-0.5">
            {displayFormattedPhone || t("chat.noPhoneAvailable", "No direct phone number")}
          </DialogDescription>
        </DialogHeader>

        {cleanNumber ? (
          <div className="mt-4 flex flex-col gap-2.5">
            {/* 1. Call on WhatsApp */}
            <button
              type="button"
              onClick={handleWhatsAppCall}
              className="group flex w-full items-center justify-between rounded-xl border border-emerald-200/90 bg-emerald-50/60 p-3.5 text-left transition-all hover:bg-emerald-100/70 hover:border-emerald-300 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:hover:bg-emerald-950/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500 text-white shadow-sm shadow-emerald-500/30">
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                    {t("chat.callOnWhatsApp", "Call on WhatsApp")}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-dark-text-tertiary">
                    {t("chat.openWhatsAppClient", "Open WhatsApp app to voice call")}
                  </p>
                </div>
              </div>
              <ExternalLink className="h-4 w-4 text-emerald-600 dark:text-emerald-400 group-hover:translate-x-0.5 transition-transform" />
            </button>

            {/* 2. Standard Phone / Cellular Call */}
            <button
              type="button"
              onClick={handleTelephonyCall}
              className="group flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white p-3.5 text-left transition-all hover:bg-slate-50 dark:border-dark-border dark:bg-dark-tertiary dark:hover:bg-dark-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700 dark:bg-dark-secondary dark:text-dark-text-primary">
                  <PhoneCall className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                    {t("chat.dialPhoneNumber", "Dial Phone Number")}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-dark-text-tertiary">
                    {t("chat.callViaSoftphone", "Dial via FaceTime, Phone, or softphone")}
                  </p>
                </div>
              </div>
              <ExternalLink className="h-4 w-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
            </button>

            {/* 3. Copy Phone Number */}
            <button
              type="button"
              onClick={handleCopy}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50/70 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors dark:border-dark-border dark:bg-dark-tertiary dark:text-dark-text-secondary dark:hover:bg-dark-elevated"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                  <span className="text-emerald-600 font-bold">{t("common.copied", "Copied")}</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  <span>{t("chat.copyNumber", "Copy Phone Number")}</span>
                </>
              )}
            </button>
          </div>
        ) : (
          <div className="mt-3 text-center text-xs text-slate-500 dark:text-dark-text-secondary py-4">
            {t("chat.noPhoneNotice", "This contact does not have a valid direct phone number to call.")}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

