export type NavbarStyle = 'current' | 'next';

export const NAVBAR_STYLE_STORAGE_KEY = 'navbarStyle';
export const NAVBAR_STYLE_CHANGE_EVENT = 'kaizen:navbar-style-change';

function getNavbarStyleStorageKey(userId?: number | null): string {
  if (typeof userId === 'number' && Number.isFinite(userId)) {
    return `${NAVBAR_STYLE_STORAGE_KEY}:${userId}`;
  }
  return NAVBAR_STYLE_STORAGE_KEY;
}

export function normalizeNavbarStyle(value: unknown): NavbarStyle {
  return value === 'next' ? 'next' : 'current';
}

export function getNavbarStyleLabel(style: NavbarStyle): string {
  return style === 'current' ? 'Ecrã Full' : 'Ecrã Parcial';
}

export function getNavbarStyle(userId?: number | null): NavbarStyle {
  if (typeof window === 'undefined') return 'current';
  const userKey = getNavbarStyleStorageKey(userId);
  const userValue = window.localStorage.getItem(userKey);
  if (userValue !== null) {
    return normalizeNavbarStyle(userValue);
  }
  return normalizeNavbarStyle(window.localStorage.getItem(NAVBAR_STYLE_STORAGE_KEY));
}

export function setNavbarStyle(style: NavbarStyle, userId?: number | null) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(getNavbarStyleStorageKey(userId), style);
  window.dispatchEvent(
    new CustomEvent(NAVBAR_STYLE_CHANGE_EVENT, {
      detail: style,
    }),
  );
}
