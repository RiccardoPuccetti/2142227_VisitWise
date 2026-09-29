// Preferences kept in this browser only (theme, sidebar, imports view). The browser can refuse the storage (private
// mode, blocked site data): then nothing is kept and the choice lasts until the page is closed.

/** The stored value, or null when there is none or the storage is refused. */
export function readStored(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

/** Stores the value; does nothing when the storage is refused. */
export function writeStored(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Refused: see above.
  }
}
