import { loadMemory, saveMemory, CWYMemory } from "../memory/memory";

export interface MemoryRegistration {
  healthy: boolean;
  keys: string[];
  get: <T = unknown>(key: string) => T | undefined;
  set: <T = unknown>(key: string, value: T) => void;
  remove: (key: string) => void;
}

export function registerMemory(): MemoryRegistration {
  const state = loadMemory();

  const get = <T = unknown>(key: string): T | undefined => {
    const current = loadMemory();
    return current[key] as T | undefined;
  };

  const set = <T = unknown>(key: string, value: T): void => {
    const current = loadMemory();
    current[key] = value as unknown as CWYMemory[string];
    saveMemory(current);
  };

  const remove = (key: string): void => {
    const current = loadMemory();
    if (key in current) {
      delete current[key];
      saveMemory(current);
    }
  };

  return {
    healthy: true,
    keys: Object.keys(state),
    get,
    set,
    remove,
  };
}
