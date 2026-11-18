import { resolveSessionTimeout } from './session-timeout';

describe('resolveSessionTimeout', () => {
  it('usuário > restaurante > 30', () => {
    expect(resolveSessionTimeout(10, 60)).toBe(10);
    expect(resolveSessionTimeout(null, 60)).toBe(60);
    expect(resolveSessionTimeout(undefined, undefined)).toBe(30);
    expect(resolveSessionTimeout(null, null)).toBe(30);
  });
});
