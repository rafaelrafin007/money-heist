import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

type StorageValue = string | null;

export type SupabaseStorageAdapter = {
  getItem: (key: string) => Promise<StorageValue> | StorageValue;
  setItem: (key: string, value: string) => Promise<void> | void;
  removeItem: (key: string) => Promise<void> | void;
  isServer?: boolean;
};

const secureStoreChunkSize = 1800;

function metaKey(key: string) {
  return `${key}.chunk.meta`;
}

function chunkKey(key: string, index: number) {
  return `${key}.chunk.${index}`;
}

async function getExistingChunkCount(key: string) {
  const metadata = await SecureStore.getItemAsync(metaKey(key));
  const count = metadata ? Number(metadata) : 0;
  return Number.isSafeInteger(count) && count > 0 ? count : 0;
}

export const nativeSecureStorage: SupabaseStorageAdapter = {
  async getItem(key) {
    try {
      const count = await getExistingChunkCount(key);

      if (count === 0) {
        return null;
      }

      const chunks = await Promise.all(
        Array.from({ length: count }, (_, index) => SecureStore.getItemAsync(chunkKey(key, index))),
      );

      if (chunks.some((chunk) => chunk === null)) {
        throw new Error("SecureStore session chunks are incomplete.");
      }

      return chunks.join("");
    } catch (error) {
      throw new Error(`Unable to read the Supabase session from secure storage: ${getErrorMessage(error)}`);
    }
  },
  async setItem(key, value) {
    try {
      await this.removeItem(key);
      const chunks = value.match(new RegExp(`.{1,${secureStoreChunkSize}}`, "g")) ?? [""];

      await Promise.all(
        chunks.map((chunk, index) =>
          SecureStore.setItemAsync(chunkKey(key, index), chunk, {
            keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
          }),
        ),
      );
      await SecureStore.setItemAsync(metaKey(key), String(chunks.length), {
        keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
      });
    } catch (error) {
      throw new Error(`Unable to save the Supabase session securely: ${getErrorMessage(error)}`);
    }
  },
  async removeItem(key) {
    try {
      const count = await getExistingChunkCount(key);
      await Promise.all(
        Array.from({ length: count }, (_, index) => SecureStore.deleteItemAsync(chunkKey(key, index))),
      );
      await SecureStore.deleteItemAsync(metaKey(key));
    } catch (error) {
      throw new Error(`Unable to clear the Supabase session from secure storage: ${getErrorMessage(error)}`);
    }
  },
};

export function createWebStorage(): SupabaseStorageAdapter {
  if (Platform.OS !== "web" || typeof globalThis.localStorage === "undefined") {
    const memoryStore = new Map<string, string>();

    return {
      isServer: Platform.OS === "web",
      getItem: (key) => memoryStore.get(key) ?? null,
      setItem: (key, value) => {
        memoryStore.set(key, value);
      },
      removeItem: (key) => {
        memoryStore.delete(key);
      },
    };
  }

  return {
    getItem: (key) => globalThis.localStorage.getItem(key),
    setItem: (key, value) => {
      globalThis.localStorage.setItem(key, value);
    },
    removeItem: (key) => {
      globalThis.localStorage.removeItem(key);
    },
  };
}

export function getSupabaseStorage() {
  return Platform.OS === "web" ? createWebStorage() : nativeSecureStorage;
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unknown storage error.";
}
