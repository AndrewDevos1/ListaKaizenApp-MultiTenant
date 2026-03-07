export type NavbarStyle = 'current' | 'next';

export const NAVBAR_STYLE_STORAGE_KEY = 'navbarStyle';
export const NAVBAR_STYLE_CHANGE_EVENT = 'kaizen:navbar-style-change';

export function normalizeNavbarStyle(value: unknown): NavbarStyle {
  return value === 'next' ? 'next' : 'current';
}

export function getNavbarStyle(): NavbarStyle {
  if (typeof window === 'undefined') return 'current';
  return normalizeNavbarStyle(window.localStorage.getItem(NAVBAR_STYLE_STORAGE_KEY));
}

export function setNavbarStyle(style: NavbarStyle) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(NAVBAR_STYLE_STORAGE_KEY, style);
  window.dispatchEvent(
    new CustomEvent(NAVBAR_STYLE_CHANGE_EVENT, {
      detail: style,
    }),
  );
}
