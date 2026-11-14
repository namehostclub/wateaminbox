import type { Contact, WhatsAppConnectionIdentity } from "@wateaminbox/shared";
import { formatLastSeen, isChannel } from "@wateaminbox/shared";
import { ArrowLeft, Info, KeyRound, Lock, LockOpen, Phone, Search, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { CONVERSATION_HEADER_INSET_CLASS } from "@/components/layout/conversation-chrome";
import { useOptionalMobileLayout } from "@/components/layout/MobileLayout";
import { IdentityAvatarFallback } from "@/components/ui/identity-avatar-fallback";
import { EllipsisMenu, type EllipsisMenuItem } from "@/components/ui/ellipsis-menu";
import { useConversationLock } from "@/hooks/useConversationLock";
import { useGroup } from "@/hooks/useGroups";
import { cn, formatPhoneLikeText } from "@/lib/utils";
import type { CustomerChat } from "@/lib/api/contacts";
import { CallActionModal } from "./CallActionModal";
import { ChannelBadge, channelLabel } from "./ChannelIdentity";
import {
  ChannelRoute,
  ConnectionBadge,
  ConnectionRoute,
} from "./ConnectionIdentity";
import {
  ConversationLockDialog,
  type LockDialogMode,
} from "./ConversationLockDialog";

interface MessageHeaderProps {
  contact: Contact | undefined;
  onOpenProfile?: () => void;
  onSearch?: () => void;
  onMore?: () => void;
  /**
   * Force the back button on. Left unset, it appears automatically inside the
   * mobile view stack, where the thread covers the conversation list.
   */
  showBackButton?: boolean;
  /**
   * Callback when back button is pressed; defaults to popping the mobile view
   * stack. Tablet has no view stack to pop, so `ChatPage` supplies a handler
   * that deselects the conversation instead - which is the only way back to
   * the list route, and therefore to the bottom navigation, now that the bar
   * is withdrawn everywhere below `lg`.
   */
  onBack?: () => void;
  /** Whether the contact is currently typing */
  isTyping?: boolean;
  /**
   * The thread actually on screen, when the customer has more than one.
   *
   * The header's name is the customer's, but everything to the right of it -
   * the network, the account, the address a reply leaves from - belongs to
   * one thread, and a merged customer has several. Answering those from the
   * surviving contact described whichever record happened to survive, not the
   * conversation being read.
   */
  thread?: CustomerChat;
  /** How many threads this customer has; more than one only after a merge. */
  threadCount?: number;
  /** Callback when conversation lock status is updated */
  onLockStatusChange?: (isProtected: boolean, hint?: string | null) => void;
}

/**
 * Touch action button. 44px hit target on phones - the header is the densest
 * row in the conversation and the one most often mis-tapped while scrolling.
 */
const actionButtonClass =
  "grid size-11 shrink-0 touch-manipulation place-items-center rounded-full text-[#54656f] transition-colors hover:bg-black/[0.055] active:bg-black/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00a884]/40 dark:text-dark-text-secondary dark:hover:bg-white/[0.06] dark:active:bg-white/10 md:size-10";

export function MessageHeader({
  contact,
  onOpenProfile,
  onSearch,
  onMore,
  showBackButton,
  onBack,
  isTyping = false,
  thread,
  threadCount = 1,
  onLockStatusChange,
}: MessageHeaderProps) {
  const { t } = useTranslation();
  const [isCallMenuOpen, setIsCallMenuOpen] = useState(false);
  const [isLockDialogOpen, setIsLockDialogOpen] = useState(false);
  const [lockDialogMode, setLockDialogMode] = useState<LockDialogMode>("set");
  const { isUnlocked, lockNow } = useConversationLock();

  const isProtected = Boolean(contact?.isPasswordProtected);
  const unlocked = isUnlocked(contact?.id);

  const ellipsisMenuItems = useMemo<EllipsisMenuItem[]>(() => {
    const items: EllipsisMenuItem[] = [];

    if (isProtected) {
      if (unlocked) {
        items.push({
          id: "lock-now",
          label: t("chat.lockNow", "Lock Chat Now"),
          icon: Lock,
          onClick: () => {
            if (contact) lockNow(contact.id);
          },
        });
      }
      items.push({
        id: "change-lock",
        label: t("chat.changePasscode", "Change Passcode"),
        icon: KeyRound,
        onClick: () => {
          setLockDialogMode("change");
          setIsLockDialogOpen(true);
        },
      });
      items.push({
        id: "remove-lock",
        label: t("chat.removeProtection", "Remove Protection"),
        icon: Trash2,
        destructive: true,
        onClick: () => {
          setLockDialogMode("remove");
          setIsLockDialogOpen(true);
        },
      });
    } else {
      items.push({
        id: "set-lock",
        label: t("chat.lockConversation", "Lock Conversation"),
        icon: Lock,
        onClick: () => {
          setLockDialogMode("set");
          setIsLockDialogOpen(true);
        },
      });
    }

    if (onMore) {
      items.push({
        id: "more-options",
        label: t("common.moreOptions", "More options"),
        onClick: onMore,
      });
    }

    return items;
  }, [isProtected, unlocked, contact, lockNow, onMore, t]);

  const { data: group } = useGroup(contact?.isGroup ? contact.id : null);
  // Null on desktop, where the list and the thread are both on screen.
  const mobileLayout = useOptionalMobileLayout();
  const canGoBack = showBackButton ?? mobileLayout !== null;
  const handleBack = onBack ?? mobileLayout?.goBack;

  if (!contact) {
    return null;
  }

  const displayName = formatPhoneLikeText(
    contact.customName || contact.name || contact.jid || "Unknown",
  );
  // The thread is the authority on where this conversation runs; the contact
  // is the fallback for a chat the switcher has not described.
  const channel = thread?.channel ?? contact.channel;
  const connection = thread?.connection
    ? {
        id: thread.connection.id,
        name: thread.connection.name,
        phoneNumber: thread.connection.phoneNumber,
        // The switcher types the status as the string the API sent; the
        // badge wants the union, and an unknown value reads as offline.
        status: thread.connection
          .status as WhatsAppConnectionIdentity["status"],
      }
    : contact.connection;
  const isMerged = threadCount > 1;
  const lastSeenText = contact.isGroup
    ? group?.participantCount
      ? t("chat.participantCount", {
          defaultValue: "{{count}} participants",
          count: group.participantCount,
        })
      : t("chat.group", "Group")
    : formatLastSeen(contact.lastSeen, contact.isOnline, t);
  const statusText = isTyping ? t("chat.typingShort", "typing") : lastSeenText;

  return (
    // Same surface as the composer at the other end of the column, so the
    // message canvas reads as one inset panel between two pieces of chrome.
    // The workspace header is withdrawn on this route, so this bar is the top
    // of the screen and owns the notch inset (height included, not eaten).
    <header
      className={cn(
        "flex shrink-0 items-center gap-0.5 border-b border-black/[0.06] bg-[#f0f2f5] px-1 dark:border-white/[0.06] dark:bg-dark-secondary md:gap-2 md:px-3",
        CONVERSATION_HEADER_INSET_CLASS,
      )}
    >
      {canGoBack && handleBack && (
        <button
          type="button"
          onClick={handleBack}
          // Runs to `lg`, not `md`: below `lg` this is the only control that
          // returns to the conversation list, and desktop shows the list in
          // its own column so it needs no back control at all.
          className={cn(actionButtonClass, "lg:hidden")}
          aria-label={t("common.goBack", "Go back")}
        >
          <ArrowLeft className="size-6" strokeWidth={2} aria-hidden="true" />
        </button>
      )}

      {/* Avatar and identity - opens the contact/group profile. */}
      <button
        type="button"
        onClick={onOpenProfile}
        className="flex min-w-0 flex-1 items-center gap-2.5 rounded-xl px-1 py-1 text-left transition-colors hover:bg-black/[0.04] active:bg-black/[0.07] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00a884]/40 dark:hover:bg-white/[0.05] dark:active:bg-white/[0.08] md:gap-3 md:px-2"
      >
        <span className="relative shrink-0">
          <span className="block size-10 overflow-hidden rounded-full bg-gray-300 dark:bg-dark-tertiary">
            {contact.avatarUrl ? (
              <img
                src={contact.avatarUrl}
                alt=""
                className="size-full object-cover"
              />
            ) : (
              <IdentityAvatarFallback
                displayName={displayName}
                identity={contact.jid || contact.phoneNumber || contact.id}
                kind={contact.isGroup ? "group" : "user"}
                className="text-lg"
              />
            )}
          </span>
          {contact.isOnline && (
            <span className="absolute bottom-0 right-0 size-3 rounded-full bg-whatsapp-green ring-2 ring-[#f0f2f5] dark:ring-dark-secondary" />
          )}
        </span>

        <span className="flex min-w-0 flex-1 flex-col">
          <span className="flex min-w-0 items-center gap-2">
            <h2 className="truncate text-[16px] font-semibold leading-5 tracking-[-0.01em] text-[#111b21] dark:text-dark-text-primary">
              {displayName}
            </h2>
            {isProtected && (
              <span
                className={`inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-[11px] font-medium shrink-0 ${
                  unlocked
                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                    : "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400"
                }`}
                title={
                  unlocked
                    ? t("chat.protectedUnlocked", "Protected (Unlocked)")
                    : t("chat.protectedLocked", "Protected (Locked)")
                }
              >
                {unlocked ? (
                  <LockOpen className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <Lock className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                )}
              </span>
            )}
            {/* The account pill needs room to stay legible; on a phone the
                same routing is carried by the status line below instead. */}
            {(channel || connection) && (
              <>
                <ChannelBadge
                  channel={channel && isChannel(channel) ? channel : "whatsapp"}
                  compact
                  iconOnly
                  className="hidden md:inline-flex"
                />
                {connection ? (
                  <ConnectionBadge
                    connection={connection}
                    compact
                    className="hidden max-w-[110px] shrink md:inline-flex"
                  />
                ) : (
                  thread?.accountName && (
                    <span className="hidden max-w-[110px] shrink truncate rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-gray-700 dark:bg-dark-tertiary dark:text-dark-text-primary md:inline-flex">
                      {thread.accountName}
                    </span>
                  )
                )}
              </>
            )}
            {/* One customer, several threads: said here because the header is
                where an operator checks who they are talking to before
                replying, and the badges above describe only the open one. */}
            {isMerged && (
              <span className="hidden shrink-0 whitespace-nowrap text-[11px] text-[#667781] dark:text-dark-text-secondary md:inline">
                {t("chat.mergedThreadCount", {
                  count: threadCount,
                  defaultValue: "· {{count}} chats",
                })}
              </span>
            )}
          </span>

          <span className="mt-0.5 flex min-w-0 items-center gap-1.5 text-[12px] leading-4">
            {isTyping ? (
              <span className="shrink-0 font-medium text-whatsapp-green">
                <span className="typing-indicator">
                  {t("chat.typingShort", "typing")}
                  <span className="typing-dots" />
                </span>
              </span>
            ) : (
              statusText && (
                <span className="truncate text-[#667781] dark:text-dark-text-secondary">
                  {statusText}
                </span>
              )
            )}
            {(connection || thread?.accountName) && (
              <>
                {(isTyping || statusText) && (
                  <span
                    className="size-0.5 shrink-0 rounded-full bg-[#aebac1] dark:bg-dark-border"
                    aria-hidden="true"
                  />
                )}
                {/* Phones get the account name only; the number returns
                    from `sm` up, where the line has room for both. */}
                {connection ? (
                  <ConnectionRoute
                    connection={connection}
                    mode="receiving"
                    compact
                    className="min-w-0 truncate text-[12px]"
                  />
                ) : (
                  // A Telegram thread has no linked device to name, and
                  // saying nothing left the line claiming the conversation
                  // arrived nowhere.
                  <ChannelRoute
                    label={thread!.accountName!}
                    address={channelLabel(channel)}
                    className="min-w-0 truncate text-[12px]"
                  />
                )}
              </>
            )}
          </span>
        </span>
      </button>

      <div className="flex shrink-0 items-center">
        {/* Tapping the header opens the profile on every layout, but that is
            not discoverable without a hover cursor - touch layouts get an
            explicit control. */}
        {onOpenProfile && (
          <button
            type="button"
            onClick={onOpenProfile}
            className={cn(actionButtonClass, "lg:hidden")}
            aria-label={t("chat.contactInfo", "Contact info")}
          >
            <Info className="size-5.5" strokeWidth={1.9} aria-hidden="true" />
          </button>
        )}

        {/* Voice Call Option */}
        {!contact.isGroup && (
          <button
            type="button"
            onClick={() => setIsCallMenuOpen(true)}
            className={actionButtonClass}
            aria-label={t("chat.voiceCall", "Call contact")}
            title={t("chat.voiceCall", "Call contact")}
          >
            <Phone className="size-5" strokeWidth={1.9} aria-hidden="true" />
          </button>
        )}

        {/* Quick Lock Now Button */}
        {isProtected && unlocked && (
          <button
            type="button"
            onClick={() => contact && lockNow(contact.id, contact.conversationId)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 mr-1 rounded-md text-xs font-semibold bg-amber-50 hover:bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800 transition-colors shadow-xs"
            aria-label={t("chat.lockNow", "Lock Chat Now")}
            title={t("chat.lockNow", "Lock Chat Now")}
          >
            <Lock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            <span>{t("chat.lockNow", "Lock")}</span>
          </button>
        )}

        <button
          type="button"
          onClick={onSearch}
          className={actionButtonClass}
          aria-label={t(
            "search.inConversationAria",
            "Search messages in conversation",
          )}
        >
          <Search className="size-5.5" strokeWidth={1.9} aria-hidden="true" />
        </button>

        {/* More options menu with chat lock actions */}
        <EllipsisMenu
          items={ellipsisMenuItems}
          triggerClassName={actionButtonClass}
          align="right"
        />
      </div>

      {/* Voice Call Action Modal */}
      {!contact.isGroup && (
        <CallActionModal
          open={isCallMenuOpen}
          onOpenChange={setIsCallMenuOpen}
          contactName={displayName}
          phoneNumber={contact.phoneNumber}
          jid={contact.jid}
          avatarUrl={contact.avatarUrl}
          contactId={contact.id}
        />
      )}

      {/* Conversation Lock Dialog */}
      {contact && (
        <ConversationLockDialog
          open={isLockDialogOpen}
          onOpenChange={setIsLockDialogOpen}
          contact={contact}
          initialMode={lockDialogMode}
          onSuccess={(newProtected, newHint) => {
            onLockStatusChange?.(newProtected, newHint);
          }}
        />
      )}
    </header>
  );
}

export default MessageHeader;
