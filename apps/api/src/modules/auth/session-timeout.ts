export const SESSION_TIMEOUT_DEFAULT = 30;
export const SESSION_TIMEOUT_MIN = 5;
export const SESSION_TIMEOUT_MAX = 480;

/** Precedência: usuário > restaurante > 30. */
export function resolveSessionTimeout(
  usuario?: number | null,
  restaurante?: number | null,
): number {
  return usuario ?? restaurante ?? SESSION_TIMEOUT_DEFAULT;
}
