// shared typing state — when a text input is focused or a dialogue modal is
// open, set typing=true so PlayerController suppresses WASD. consumed by
// ChatOverlay (focus/blur) and NPCDialogue (open/close).

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

interface TypingContextValue {
  typing: boolean;
  setTyping: (v: boolean) => void;
}

const TypingContext = createContext<TypingContextValue>({
  typing: false,
  setTyping: () => undefined,
});

export function TypingProvider({ children }: { children: ReactNode }) {
  const [typing, setTyping] = useState(false);
  const value = useMemo(() => ({ typing, setTyping }), [typing]);
  return <TypingContext.Provider value={value}>{children}</TypingContext.Provider>;
}

export function useTyping(): TypingContextValue {
  return useContext(TypingContext);
}
