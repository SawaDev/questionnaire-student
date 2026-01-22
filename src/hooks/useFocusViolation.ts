import { useEffect, useRef } from "react";

type Options = {
  enabled?: boolean;
  cooldownMs?: number;
  onViolation: () => void;
};

// module-level lock (works even if React StrictMode remounts the component in dev)
let lastGlobalFire = 0;

export function useFocusViolation({
  enabled = true,
  cooldownMs = 1200,
  onViolation,
}: Options) {
  const cbRef = useRef(onViolation);
  useEffect(() => {
    cbRef.current = onViolation;
  }, [onViolation]);

  useEffect(() => {
    if (!enabled) return;

    const fireOnce = () => {
      const now = Date.now();
      if (now - lastGlobalFire < cooldownMs) return;
      lastGlobalFire = now;
      cbRef.current();
    };

    const onVisibilityChange = () => {
      // This is the cleanest signal for "tab switch / minimize / change tab"
      if (document.visibilityState !== "visible") {
        fireOnce();
      }
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [enabled, cooldownMs]);
}
