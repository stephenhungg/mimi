import { Html } from "@react-three/drei";
import { useEffect, useRef, useState } from "react";
import { BRAND } from "@mimi/types";

interface SpeechBubbleProps {
  text: string;
  // fires once per character revealed — useful for syncing animalese chirps.
  onChar?: (char: string, idx: number) => void;
  // ms between characters typed.
  charDelayMs?: number;
  // ms after full reveal before auto-dismiss.
  dismissAfterMs?: number;
  onDismiss?: () => void;
  yOffset?: number;
}

// chunky white-paper bubble with asphalt outline. types out char-by-char,
// auto-dismisses N ms after full reveal. parent decides when to render it.
export function SpeechBubble({
  text,
  onChar,
  charDelayMs = 35,
  dismissAfterMs = 4000,
  onDismiss,
  yOffset = 1.6,
}: SpeechBubbleProps) {
  const [shown, setShown] = useState(0);
  const charCb = useRef(onChar);
  const dismissCb = useRef(onDismiss);
  charCb.current = onChar;
  dismissCb.current = onDismiss;

  // type-out loop. resets if text changes.
  useEffect(() => {
    setShown(0);
    if (text.length === 0) return;
    let i = 0;
    const id = window.setInterval(() => {
      i += 1;
      const ch = text[i - 1];
      if (ch !== undefined) {
        charCb.current?.(ch, i - 1);
      }
      setShown(i);
      if (i >= text.length) {
        window.clearInterval(id);
      }
    }, charDelayMs);
    return () => window.clearInterval(id);
  }, [text, charDelayMs]);

  // auto-dismiss after reveal completes.
  useEffect(() => {
    if (shown < text.length || text.length === 0) return;
    const id = window.setTimeout(() => {
      dismissCb.current?.();
    }, dismissAfterMs);
    return () => window.clearTimeout(id);
  }, [shown, text.length, dismissAfterMs]);

  return (
    <Html
      center
      distanceFactor={10}
      position={[0, yOffset, 0]}
      style={{ pointerEvents: "none" }}
    >
      <div
        style={{
          background: BRAND.paper,
          color: BRAND.asphalt,
          border: `2px solid ${BRAND.asphalt}`,
          borderRadius: "12px",
          padding: "10px 14px",
          maxWidth: "200px",
          minWidth: "60px",
          fontFamily: BRAND.pixelFont,
          fontSize: "9px",
          lineHeight: "1.6",
          letterSpacing: "0.02em",
          textAlign: "center",
          boxShadow: `2px 2px 0 ${BRAND.asphalt}`,
          userSelect: "none",
        }}
      >
        {text.slice(0, shown)}
        <span style={{ opacity: shown < text.length ? 1 : 0 }}>|</span>
      </div>
    </Html>
  );
}
