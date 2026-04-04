'use client';

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

interface ChatContextValue {
  isOpen: boolean;
  open: () => void;
  close: () => void;
}

const ChatContext = createContext<ChatContextValue>({
  isOpen: false,
  open: () => {},
  close: () => {},
});

export function ChatProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);

  return (
    <ChatContext.Provider value={{ isOpen, open, close }}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChatPanel() {
  return useContext(ChatContext);
}
