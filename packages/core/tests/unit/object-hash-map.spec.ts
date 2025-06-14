import { ObjectHashMap } from 'packages/core/lib/util/object-hash-map';
import { describe, expect, it } from 'vitest';

// Tests for ObjectHashMap focusing on scenarios that use objects as keys

describe('ObjectHashMap – object keys', () => {
  it('should set and get a value using the same object reference as key', () => {
    const map = new ObjectHashMap<Record<string, unknown>, string>();

    const key = { foo: 'bar' };
    map.set(key, 'value');

    expect(map.size).toBe(1);
    expect(map.has(key)).toBe(true);
    expect(map.get(key)).toBe('value');
  });

  it('should treat different but structurally identical objects as the same key', () => {
    const map = new ObjectHashMap<Record<string, unknown>, string>();

    const key1 = { foo: 'bar' };
    const key2 = { foo: 'bar' }; // different reference, same structure

    map.set(key1, 'first');
    map.set(key2, 'second');

    // Only one entry should be stored because the hash is based on object structure
    expect(map.size).toBe(1);

    // Retrieval should work with either reference (or even a new structurally identical object)
    expect(map.get(key1)).toBe('second');
    expect(map.get(key2)).toBe('second');
    expect(map.get({ foo: 'bar' })).toBe('second');
  });

  it('should treat objects with the same properties but different order as the same key', () => {
    const map = new ObjectHashMap<{ a: number; b: number }, string>();

    const key1 = { a: 1, b: 2 };
    const key2 = { b: 2, a: 1 }; // same properties, different order

    map.set(key1, 'ordered');
    map.set(key2, 'reordered');

    // They should be considered the same entry
    expect(map.size).toBe(1);
    expect(map.get(key1)).toBe('reordered');
    expect(map.get(key2)).toBe('reordered');
    expect(map.get({ a: 1, b: 2 })).toBe('reordered');
  });

  it('should delete an entry using a structurally identical object key', () => {
    const map = new ObjectHashMap<Record<string, number>, string>();

    const key1 = { id: 42 };
    const key2 = { id: 42 }; // different reference, same structure

    map.set(key1, 'answer');

    const deleted = map.delete(key2);
    expect(deleted).toBe(true);
    expect(map.size).toBe(0);
    expect(map.has(key1)).toBe(false);
    expect(map.has(key2)).toBe(false);
  });
});
