import { generateClientUuid, OutboxQueue } from '../../src/sync/outbox';
import { KeyValueStorage, OutboxMutation } from '../../src/sync/types';

function createMemoryStorage(): KeyValueStorage {
  const store = new Map<string, string>();
  return {
    async getItem(key: string) {
      return store.get(key) ?? null;
    },
    async setItem(key: string, value: string) {
      store.set(key, value);
    },
  };
}

describe('Offline-First Outbox Queue (outbox.ts)', () => {
  it('generates valid RFC4122 v4 client UUIDs', () => {
    const uuid1 = generateClientUuid();
    const uuid2 = generateClientUuid();
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    expect(uuid1).toMatch(uuidRegex);
    expect(uuid2).toMatch(uuidRegex);
    expect(uuid1).not.toBe(uuid2);
  });

  it('persists enqueued mutations in FIFO order', async () => {
    const outbox = new OutboxQueue(createMemoryStorage());

    const m1: OutboxMutation = {
      mutationId: generateClientUuid(),
      createdAt: '2026-11-25T00:00:00Z',
      type: 'DELETE_EXPENSE',
      payload: { expenseId: 'exp_1', tripId: 'trip_1', deletedAt: '2026-11-25T00:00:00Z' },
    };

    const m2: OutboxMutation = {
      mutationId: generateClientUuid(),
      createdAt: '2026-11-25T00:01:00Z',
      type: 'DELETE_PAYMENT',
      payload: { paymentId: 'pay_1', tripId: 'trip_1', deletedAt: '2026-11-25T00:01:00Z' },
    };

    await outbox.enqueue(m1);
    await outbox.enqueue(m2);

    const loaded = await outbox.load();
    expect(loaded).toHaveLength(2);
    expect(loaded[0].mutationId).toBe(m1.mutationId);
    expect(loaded[1].mutationId).toBe(m2.mutationId);
  });

  it('replays all queued mutations sequentially and drains queue on success', async () => {
    const outbox = new OutboxQueue(createMemoryStorage());
    const executedIds: string[] = [];

    const m1: OutboxMutation = {
      mutationId: 'mut-1',
      createdAt: '2026-11-25T00:00:00Z',
      type: 'DELETE_EXPENSE',
      payload: { expenseId: 'exp_1', tripId: 'trip_1', deletedAt: '2026-11-25T00:00:00Z' },
    };
    const m2: OutboxMutation = {
      mutationId: 'mut-2',
      createdAt: '2026-11-25T00:01:00Z',
      type: 'DELETE_EXPENSE',
      payload: { expenseId: 'exp_2', tripId: 'trip_1', deletedAt: '2026-11-25T00:01:00Z' },
    };

    await outbox.enqueue(m1);
    await outbox.enqueue(m2);

    const result = await outbox.flush(async (mut) => {
      executedIds.push(mut.mutationId);
    });

    expect(result.error).toBeNull();
    expect(result.processedCount).toBe(2);
    expect(result.remaining).toHaveLength(0);
    expect(executedIds).toEqual(['mut-1', 'mut-2']);
    expect(await outbox.load()).toEqual([]);
  });

  it('halts replay on transient network failure and preserves unacknowledged items', async () => {
    const outbox = new OutboxQueue(createMemoryStorage());

    const m1: OutboxMutation = {
      mutationId: 'mut-1',
      createdAt: '2026-11-25T00:00:00Z',
      type: 'DELETE_EXPENSE',
      payload: { expenseId: 'exp_1', tripId: 'trip_1', deletedAt: '2026-11-25T00:00:00Z' },
    };
    const m2: OutboxMutation = {
      mutationId: 'mut-2',
      createdAt: '2026-11-25T00:01:00Z',
      type: 'DELETE_EXPENSE',
      payload: { expenseId: 'exp_2', tripId: 'trip_1', deletedAt: '2026-11-25T00:01:00Z' },
    };
    const m3: OutboxMutation = {
      mutationId: 'mut-3',
      createdAt: '2026-11-25T00:02:00Z',
      type: 'DELETE_EXPENSE',
      payload: { expenseId: 'exp_3', tripId: 'trip_1', deletedAt: '2026-11-25T00:02:00Z' },
    };

    await outbox.enqueue(m1);
    await outbox.enqueue(m2);
    await outbox.enqueue(m3);

    // First attempt: mut-1 succeeds, mut-2 fails with network drop
    const firstAttempt = await outbox.flush(async (mut) => {
      if (mut.mutationId === 'mut-2') {
        throw new Error('Network request failed');
      }
    });

    expect(firstAttempt.processedCount).toBe(1);
    expect(firstAttempt.error?.message).toBe('Network request failed');
    expect(firstAttempt.remaining.map((m) => m.mutationId)).toEqual(['mut-2', 'mut-3']);

    // Verify persistence kept only mut-2 and mut-3 (mut-1 was not duplicated)
    const storedAfterDrop = await outbox.load();
    expect(storedAfterDrop.map((m) => m.mutationId)).toEqual(['mut-2', 'mut-3']);

    // Second attempt after connection returns: mut-2 and mut-3 replay and drain queue
    const replayedIds: string[] = [];
    const secondAttempt = await outbox.flush(async (mut) => {
      replayedIds.push(mut.mutationId);
    });

    expect(secondAttempt.error).toBeNull();
    expect(secondAttempt.processedCount).toBe(2);
    expect(replayedIds).toEqual(['mut-2', 'mut-3']);
    expect(await outbox.load()).toEqual([]);
  });

  it('queues and replays UPDATE_TRIP and DELETE_TRIP mutations', async () => {
    const outbox = new OutboxQueue(createMemoryStorage());
    const replayed: OutboxMutation[] = [];

    const updateMut: OutboxMutation = {
      mutationId: generateClientUuid(),
      createdAt: '2026-11-25T00:05:00Z',
      type: 'UPDATE_TRIP',
      payload: { tripId: 'trip_1', name: 'Amalfi Summer', coverUrl: 'file:///cover.jpg' },
    };

    const deleteMut: OutboxMutation = {
      mutationId: generateClientUuid(),
      createdAt: '2026-11-25T00:06:00Z',
      type: 'DELETE_TRIP',
      payload: { tripId: 'trip_1' },
    };

    await outbox.enqueue(updateMut);
    await outbox.enqueue(deleteMut);

    const res = await outbox.flush(async (mut) => {
      replayed.push(mut);
    });

    expect(res.error).toBeNull();
    expect(res.processedCount).toBe(2);
    expect(replayed.map((m) => m.type)).toEqual(['UPDATE_TRIP', 'DELETE_TRIP']);
    expect(await outbox.load()).toEqual([]);
  });
});
