import { useEffect, useRef, useState } from "react";

/**
 * Señal breve de "guardado" tras una acción que puede tardar un poco:
 * el botón cambia de aspecto y un mensaje aparece y desaparece solo al
 * cabo de un rato, en vez de quedarse fijo hasta la próxima acción (o no
 * notarse en absoluto si el guardado es rápido).
 */
export function useSavedFlash(durationMs = 2500): [boolean, () => void] {
  const [justSaved, setJustSaved] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function flash() {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setJustSaved(true);
    timeoutRef.current = setTimeout(() => setJustSaved(false), durationMs);
  }

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return [justSaved, flash];
}
