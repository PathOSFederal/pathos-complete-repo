type StorageLike = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
  clear(): void;
  key(index: number): string | null;
  readonly length: number;
};

function createMemoryStorage(): StorageLike {
  const data = new Map<string, string>();

  return {
    getItem(key: string): string | null {
      if (data.has(key)) {
        return data.get(key) as string;
      }
      return null;
    },
    setItem(key: string, value: string): void {
      data.set(String(key), String(value));
    },
    removeItem(key: string): void {
      data.delete(key);
    },
    clear(): void {
      data.clear();
    },
    key(index: number): string | null {
      if (index < 0 || index >= data.size) {
        return null;
      }
      return Array.from(data.keys())[index] as string;
    },
    get length(): number {
      return data.size;
    },
  };
}

if (
  typeof window !== 'undefined' &&
  window !== null &&
  window.localStorage !== undefined
) {
  globalThis.localStorage = window.localStorage;
}

if (globalThis.localStorage === undefined) {
  globalThis.localStorage = createMemoryStorage() as Storage;
}

if (
  typeof window !== 'undefined' &&
  window !== null &&
  window.sessionStorage !== undefined
) {
  globalThis.sessionStorage = window.sessionStorage;
}

if (globalThis.sessionStorage === undefined) {
  globalThis.sessionStorage = createMemoryStorage() as Storage;
}
