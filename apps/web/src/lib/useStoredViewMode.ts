import { useState } from "react";

/**
 * Recuerda la vista elegida (por ejemplo lista/tablero) entre visitas,
 * guardándola en localStorage bajo su propia clave — cada pantalla la
 * suya, para que elegir tablero en "Mis tareas" no arrastre esa
 * preferencia a la de tareas del supervisor. Si localStorage no está
 * disponible (privado, cuota agotada) o el valor guardado ya no es una
 * opción válida, se cae al valor por defecto sin romper nada.
 */
export function useStoredViewMode<T extends string>(
  storageKey: string,
  options: readonly T[],
  defaultValue: T,
): [T, (value: T) => void] {
  const [value, setValue] = useState<T>(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      return stored && (options as readonly string[]).includes(stored) ? (stored as T) : defaultValue;
    } catch {
      return defaultValue;
    }
  });

  function updateValue(next: T) {
    setValue(next);
    try {
      localStorage.setItem(storageKey, next);
    } catch {
      // Best-effort: si no se puede guardar, el cambio de vista sigue
      // funcionando ahora mismo, solo no se recuerda la próxima vez.
    }
  }

  return [value, updateValue];
}
