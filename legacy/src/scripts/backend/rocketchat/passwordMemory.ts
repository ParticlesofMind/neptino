/**
 * Rocket.Chat provisioning password memory utilities.
 * Stores the last password the user provided locally so we can
 * provision Rocket.Chat credentials without persisting secrets.
 */

const STORAGE_KEY = "neptino:rocketchat:last-password";

function withSessionStorage<R>(fn: (storage: Storage) => R): R | null {
  if (typeof window === "undefined" || !window.sessionStorage) {
    return null;
  }

  try {
    return fn(window.sessionStorage);
  } catch (error) {
    console.warn("Rocket.Chat password storage error:", error);
    return null;
  }
}

/**
 * Store the most recent Rocket.Chat provisioning password in sessionStorage.
 * The value is base64-encoded purely to avoid plain-text visibility.
 */
export function rememberRocketChatPassword(password: string): void {
  if (!password) {
    return;
  }

  withSessionStorage((storage) => {
    storage.setItem(STORAGE_KEY, window.btoa(password));
  });
}

/**
 * Retrieve the stored Rocket.Chat provisioning password, if any.
 */
export function getRememberedRocketChatPassword(): string | null {
  const stored = withSessionStorage((storage) => storage.getItem(STORAGE_KEY));
  if (!stored) {
    return null;
  }

  try {
    return window.atob(stored);
  } catch (error) {
    console.warn("Unable to decode stored Rocket.Chat password:", error);
    return null;
  }
}

/**
 * Clear the cached provisioning password from sessionStorage.
 */
export function clearRememberedRocketChatPassword(): void {
  withSessionStorage((storage) => storage.removeItem(STORAGE_KEY));
}

