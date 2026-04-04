'use client';

import { createContext, useContext, useState, useCallback, useRef, type ReactNode } from 'react';

interface ChatContextValue {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  /** Open the panel and immediately send a message */
  sendMessage: (message: string) => void;
  /** Used internally by ChatPanel to register its submit handler */
  _registerSubmit: (fn: (msg: string) => void) => void;
  /** Pending message to send on open */
  _pendingMessage: string | null;
  _clearPending: () => void;
}

const ChatContext = createContext<ChatContextValue>({
  isOpen: false,
  open: () => {},
  close: () => {},
  sendMessage: () => {},
  _registerSubmit: () => {},
  _pendingMessage: null,
  _clearPending: () => {},
});

export function ChatProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [pendingMessage, setPendingMessage] = useState<string | null>(null);
  const submitRef = useRef<((msg: string) => void) | null>(null);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);

  const sendMessage = useCallback((message: string) => {
    setIsOpen(true);
    // If ChatPanel is already mounted and registered, send directly
    if (submitRef.current) {
      // Small delay to ensure panel is visible
      setTimeout(() => submitRef.current?.(message), 100);
    } else {
      // Panel not yet mounted — store as pending
      setPendingMessage(message);
    }
  }, []);

  const _registerSubmit = useCallback((fn: (msg: string) => void) => {
    submitRef.current = fn;
  }, []);

  const _clearPending = useCallback(() => setPendingMessage(null), []);

  return (
    <ChatContext.Provider value={{
      isOpen, open, close, sendMessage,
      _registerSubmit, _pendingMessage: pendingMessage, _clearPending,
    }}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChatPanel() {
  return useContext(ChatContext);
}
