import { KeyValueStorage, OutboxMutation } from './types';

const OUTBOX_STORAGE_KEY = 'tripsplit_outbox_v1';

/**
 * Generates an RFC 4122 v4 UUID on the client so offline writes can be
 * replayed idempotently against PostgreSQL primary keys.
 */
export function generateClientUuid(): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }
  // Fallback RFC4122 v4 generator for environments without WebCrypto
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.floor(Math.random() * 16);
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Persistent FIFO Outbox Queue.
 *
 * Architectural Note:
 * Every offline mutation is serialized with a client-generated UUID and stored
 * locally before attempting network sync. When connectivity returns, items are
 * replayed sequentially in FIFO order. If any mutation fails due to a transient
 * network error, replay halts immediately without dropping pending items,
 * preserving causal ordering (e.g., CREATE_TRIP always precedes UPSERT_EXPENSE).
 */
export class OutboxQueue {
  private storage: KeyValueStorage;
  private storageKey: string;

  constructor(storage: KeyValueStorage, storageKey = OUTBOX_STORAGE_KEY) {
    this.storage = storage;
    this.storageKey = storageKey;
  }

  async load(): Promise<OutboxMutation[]> {
    try {
      const raw = await this.storage.getItem(this.storageKey);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  async save(queue: OutboxMutation[]): Promise<void> {
    await this.storage.setItem(this.storageKey, JSON.stringify(queue));
  }

  async enqueue(mutation: OutboxMutation): Promise<OutboxMutation[]> {
    const current = await this.load();
    const updated = [...current, mutation];
    await this.save(updated);
    return updated;
  }

  /**
   * Replays queued mutations sequentially using the provided executor.
   * Stops on the first failure so dependent mutations remain ordered.
   */
  async flush(
    executor: (mutation: OutboxMutation) => Promise<void>
  ): Promise<{
    processedCount: number;
    remaining: OutboxMutation[];
    error: Error | null;
  }> {
    const queue = await this.load();
    if (queue.length === 0) {
      return { processedCount: 0, remaining: [], error: null };
    }

    let processedCount = 0;

    for (let i = 0; i < queue.length; i++) {
      const mutation = queue[i];
      try {
        await executor(mutation);
        processedCount++;
        // Persist progress after every single confirmed mutation so an app crash
        // mid-sync never replays already-acknowledged work unnecessarily.
        await this.save(queue.slice(i + 1));
      } catch (err) {
        const remaining = queue.slice(i);
        await this.save(remaining);
        return {
          processedCount,
          remaining,
          error: err instanceof Error ? err : new Error(String(err)),
        };
      }
    }

    return { processedCount, remaining: [], error: null };
  }

  async clear(): Promise<void> {
    await this.save([]);
  }
}
