export type OfflineDraft<T> = {
  key: string;
  updatedAt: number;
  items: T[];
  originalItems?: T[];
  meta?: Record<string, unknown>;
};

const DB_NAME = 'kaizen-offline';
const STORE_NAME = 'drafts';
const DB_VERSION = 1;
const LOCAL_FALLBACK_PREFIX = 'kaizen-offline-draft:';

let dbPromise: Promise<IDBDatabase> | null = null;

const canUseIndexedDb = () =>
  typeof window !== 'undefined' && typeof window.indexedDB !== 'undefined';

const buildLocalKey = (key: string) => `${LOCAL_FALLBACK_PREFIX}${key}`;

const readLocalDraft = <T>(key: string): OfflineDraft<T> | undefined => {
  if (typeof window === 'undefined' || !window.localStorage) {
    return undefined;
  }
  try {
    const raw = window.localStorage.getItem(buildLocalKey(key));
    return raw ? (JSON.parse(raw) as OfflineDraft<T>) : undefined;
  } catch (error) {
    console.error('[offlineDrafts] Falha ao ler localStorage:', error);
    return undefined;
  }
};

const writeLocalDraft = <T>(draft: OfflineDraft<T>) => {
  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }
  try {
    window.localStorage.setItem(buildLocalKey(draft.key), JSON.stringify(draft));
  } catch (error) {
    console.error('[offlineDrafts] Falha ao salvar localStorage:', error);
  }
};

const removeLocalDraft = (key: string) => {
  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }
  try {
    window.localStorage.removeItem(buildLocalKey(key));
  } catch (error) {
    console.error('[offlineDrafts] Falha ao remover localStorage:', error);
  }
};

const getDb = async (): Promise<IDBDatabase | null> => {
  if (!canUseIndexedDb()) {
    return null;
  }
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'key' });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
  return dbPromise;
};

const withStore = async <T>(
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> => {
  const db = await getDb();
  if (!db) {
    throw new Error('IndexedDB indisponivel');
  }
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, mode);
    const store = transaction.objectStore(STORE_NAME);
    const request = fn(store);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const buildDraftKey = (scope: 'area' | 'lista', id: string | number) =>
  `draft:${scope}:${id}`;

export const saveOfflineDraft = async <T>(draft: OfflineDraft<T>) => {
  if (!canUseIndexedDb()) {
    writeLocalDraft(draft);
    return;
  }
  try {
    await withStore('readwrite', (store) => store.put(draft));
  } catch (error) {
    console.error('[offlineDrafts] Falha ao salvar draft:', error);
    writeLocalDraft(draft);
  }
};

export const getOfflineDraft = async <T>(key: string) => {
  if (!canUseIndexedDb()) {
    return readLocalDraft<T>(key);
  }
  try {
    const draft = await withStore<OfflineDraft<T> | undefined>('readonly', (store) =>
      store.get(key)
    );
    return draft;
  } catch (error) {
    console.error('[offlineDrafts] Falha ao carregar draft:', error);
    return readLocalDraft<T>(key);
  }
};

export const removeOfflineDraft = async (key: string) => {
  if (!canUseIndexedDb()) {
    removeLocalDraft(key);
    return;
  }
  try {
    await withStore('readwrite', (store) => store.delete(key));
    removeLocalDraft(key);
  } catch (error) {
    console.error('[offlineDrafts] Falha ao remover draft:', error);
    removeLocalDraft(key);
  }
};

export const mergeDraftItems = <T extends { id: number; quantidade_atual: number | string }>(
  baseItems: T[],
  draftItems: T[]
) => {
  const draftMap = new Map(draftItems.map((item) => [item.id, item.quantidade_atual]));
  return baseItems.map((item) =>
    draftMap.has(item.id)
      ? { ...item, quantidade_atual: draftMap.get(item.id) ?? item.quantidade_atual }
      : item
  );
};

export const isOfflineError = (error: unknown) => {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return true;
  }
  const err = error as {
    message?: string;
    code?: string;
    response?: { status?: number };
  };
  if (!err) {
    return false;
  }
  if (err.response) {
    return false;
  }
  if (err.code === 'ERR_NETWORK' || err.message === 'Network Error') {
    return true;
  }
  if (typeof navigator !== 'undefined') {
    return navigator.onLine === false;
  }
  return false;
};
