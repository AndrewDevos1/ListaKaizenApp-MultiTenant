// Gate de banco descartável: host local e NOME do banco terminando em _test ou _testN.
export function isDisposableTestDatabaseUrl(raw?: string): boolean {
  if (!raw) return false;
  try {
    const url = new URL(raw);
    const database = decodeURIComponent(url.pathname.replace(/^\//, ''));
    return ['127.0.0.1', 'localhost'].includes(url.hostname) && /_test\d*$/.test(database);
  } catch {
    return false;
  }
}
