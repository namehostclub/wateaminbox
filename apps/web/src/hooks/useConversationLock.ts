import { useCallback, useEffect, useState } from "react";
import { unlockContact } from "@/lib/api/contacts";

const STORAGE_KEY = "conv_lock_tokens_v1";

function readTokensFromStorage(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeTokensToStorage(tokens: Record<string, string>): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(tokens));
  } catch {
    // Ignore storage write errors (quota, private browsing)
  }
}

// Global in-memory subscribers so multiple components stay in sync
type Listener = () => void;
const listeners = new Set<Listener>();

let memoryTokens: Record<string, string> = readTokensFromStorage();

function notifyAll() {
  writeTokensToStorage(memoryTokens);
  for (const listener of listeners) {
    listener();
  }
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

  const isUnlocked = useCallback((contactId: string | undefined | null): boolean => {
    if (!contactId) return false;
    return Boolean(memoryTokens[contactId]);
  }, []);

  const getUnlockToken = useCallback((contactId: string | undefined | null): string | null => {
    if (!contactId) return null;
    return memoryTokens[contactId] ?? null;
  }, []);

  const unlock = useCallback(
    async (contactId: string, password: string): Promise<boolean> => {
      setIsLoading(true);
      setError(null);
      setRemainingAttempts(null);
      try {
        const response = await unlockContact(contactId, { password });
        if (response.unlocked && response.unlockToken) {
          memoryTokens = { ...memoryTokens, [contactId]: response.unlockToken };
          notifyAll();
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

  const lockNow = useCallback((contactId: string | undefined | null) => {
    if (!contactId) return;
    const next = { ...memoryTokens };
    delete next[contactId];
    memoryTokens = next;
    notifyAll();
  }, []);

  const lockAll = useCallback(() => {
    memoryTokens = {};
    notifyAll();
  }, []);

  const registerToken = useCallback((contactId: string, token: string) => {
    memoryTokens = { ...memoryTokens, [contactId]: token };
    notifyAll();
  }, []);

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

