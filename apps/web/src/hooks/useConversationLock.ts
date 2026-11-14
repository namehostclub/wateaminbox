import { useCallback, useEffect, useState } from "react";
import { unlockContact } from "@/lib/api/contacts";

const STORAGE_KEY = "conv_lock_tokens_v1";

// Purge any stale tokens from browser sessionStorage on startup so that
// conversations are strictly locked by default on every page load/refresh.
if (typeof window !== "undefined") {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore storage errors
  }
}

// Global in-memory subscribers so multiple components stay in sync
type Listener = () => void;
const listeners = new Set<Listener>();

// Unlock tokens are strictly in-memory per active app session.
// Refreshing the browser or reopening a tab safely resets all locks to LOCKED.
let memoryTokens: Record<string, string> = {};

function notifyAll() {
  for (const listener of listeners) {
    listener();
  }
}

export function getConversationUnlockToken(id: string | undefined | null): string | null {
  if (!id) return null;
  return memoryTokens[id] ?? null;
}

export function registerConversationToken(
  contactId: string,
  token: string,
  conversationId?: string | null,
): void {
  const next = { ...memoryTokens, [contactId]: token };
  if (conversationId && conversationId !== contactId) {
    next[conversationId] = token;
  }
  memoryTokens = next;
  notifyAll();
}

export function lockConversationNow(
  contactId: string | undefined | null,
  conversationId?: string | null,
): void {
  const next = { ...memoryTokens };
  if (contactId) delete next[contactId];
  if (conversationId) delete next[conversationId];
  memoryTokens = next;
  notifyAll();
}

export function useConversationLock() {
  const [, setTick] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [remainingAttempts, setRemainingAttempts] = useState<number | null>(null);

  useEffect(() => {
    const forceUpdate = () => setTick((prev) => prev + 1);
    listeners.add(forceUpdate);
    return () => {
      listeners.delete(forceUpdate);
    };
  }, []);

  const isUnlocked = useCallback((id: string | undefined | null): boolean => {
    if (!id) return false;
    return Boolean(memoryTokens[id]);
  }, []);

  const getUnlockToken = useCallback((id: string | undefined | null): string | null => {
    return getConversationUnlockToken(id);
  }, []);

  const unlock = useCallback(
    async (
      contactId: string,
      password: string,
      conversationId?: string | null,
    ): Promise<boolean> => {
      setIsLoading(true);
      setError(null);
      setRemainingAttempts(null);
      try {
        const response = await unlockContact(contactId, { password });
        if (response.unlocked && response.unlockToken) {
          registerConversationToken(contactId, response.unlockToken, conversationId);
          setIsLoading(false);
          return true;
        }
        setIsLoading(false);
        return false;
      } catch (err: any) {
        setIsLoading(false);
        const errMsg = err?.message || err?.error || "Incorrect passcode";
        setError(errMsg);
        if (typeof err?.remainingAttempts === "number") {
          setRemainingAttempts(err.remainingAttempts);
        }
        return false;
      }
    },
    [],
  );

  const lockNow = useCallback(
    (contactId: string | undefined | null, conversationId?: string | null) => {
      lockConversationNow(contactId, conversationId);
    },
    [],
  );

  const lockAll = useCallback(() => {
    memoryTokens = {};
    notifyAll();
  }, []);

  const registerToken = useCallback(
    (contactId: string, token: string, conversationId?: string | null) => {
      registerConversationToken(contactId, token, conversationId);
    },
    [],
  );

  return {
    isUnlocked,
    getUnlockToken,
    unlock,
    lockNow,
    lockAll,
    registerToken,
    isLoading,
    error,
    setError,
    remainingAttempts,
  };
}

