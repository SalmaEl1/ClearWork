import { useEffect, useRef, useState } from "react";

const DEFAULT_DURATION_MS = 2500;

/**
 * Confirmación de guardado que se ve un momento y desaparece sola:
 * `trigger()` la enciende, y se apaga pasados `durationMs`. Pensada para
 * cuando ya se sabe que el guardado ha ido bien, para dejar constancia
 * de que ha terminado sin dejar el aviso para siempre en pantalla.
 */
export function useSavedConfirmation(durationMs = DEFAULT_DURATION_MS): [boolean, () => void] {
  const [isSaved, setIsSaved] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  function trigger() {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsSaved(true);
    timeoutRef.current = setTimeout(() => setIsSaved(false), durationMs);
  }

  return [isSaved, trigger];
}
