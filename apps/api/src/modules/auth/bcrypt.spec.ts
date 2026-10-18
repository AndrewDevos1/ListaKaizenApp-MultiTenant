import * as bcrypt from 'bcrypt';

describe('bcrypt password handling', () => {
  it('hashes a password and compares only the matching plaintext', async () => {
    const hash = await bcrypt.hash('senha-segura', 10);

    await expect(bcrypt.compare('senha-segura', hash)).resolves.toBe(true);
    await expect(bcrypt.compare('senha-incorreta', hash)).resolves.toBe(false);
    expect(hash).not.toBe('senha-segura');
  });
});
