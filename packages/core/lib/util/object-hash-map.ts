type Hash = string & { readonly __brand: unique symbol };

export interface StoredValue<K, V> {
  value: V;
  originalKey: K;
}

export class ObjectHashMap<K, V> implements Map<K, V> {
  private readonly map = new Map<Hash, StoredValue<K, V>>();

  public forEach(callbackfn: (value: V, key: K, map: Map<K, V>) => void, thisArg?: any): void {
    this.map.forEach((value) => callbackfn(value.value, value.originalKey, this), thisArg);
  }

  get size(): number {
    return this.map.size;
  }

  public entries(): MapIterator<[K, V]> {
    return {
      next: () => {
        const next = this.map.entries().next();
        if (next.done) {
          return { done: true, value: undefined };
        }
        return { done: false, value: [next.value[1].originalKey, next.value[1].value] };
      },
      [Symbol.iterator]: () => this.entries(),
    };
  }

  public keys(): MapIterator<K> {
    return {
      next: () => {
        const next = this.map.values().next();
        if (next.done) {
          return { done: true, value: undefined };
        }
        return { done: false, value: next.value.originalKey };
      },
      [Symbol.iterator]: () => this.keys(),
    };
  }

  public values(): MapIterator<V> {
    return {
      next: () => {
        const next = this.map.values().next();
        if (next.done) {
          return { done: true, value: undefined };
        }
        return { done: false, value: next.value.value };
      },
      [Symbol.iterator]: () => this.values(),
    };
  }

  public [Symbol.iterator](): MapIterator<[K, V]> {
    return {
      next: () => {
        const next = this.map[Symbol.iterator]().next();
        if (next.done) {
          return { done: true, value: undefined };
        }
        return { done: false, value: [next.value[1].originalKey, next.value[1].value] };
      },
      [Symbol.iterator]: () => this[Symbol.iterator](),
    };
  }

  public [Symbol.toStringTag] = 'ObjectHashMap';

  public set(key: K, value: V): this {
    this.map.set(this.hashKey(key), { value, originalKey: key });
    return this;
  }

  public get(key: K): V | undefined {
    return this.map.get(this.hashKey(key))?.value;
  }

  public has(key: K): boolean {
    return this.map.has(this.hashKey(key));
  }

  public delete(key: K): boolean {
    return this.map.delete(this.hashKey(key));
  }

  public clear(): void {
    this.map.clear();
  }

  /**
   * Produce a deterministic string representation of the provided key.
   *
   * If an object is supplied, we sort its keys (recursively) so that
   * objects with identical structure but different key ordering will
   * yield the same hash. For primitives we simply cast to string.
   */
  private hashKey(key: K): Hash {
    if (typeof key === 'object' && key !== null) {
      return this.stableStringify(key) as Hash;
    }

    return String(key) as Hash;
  }

  /**
   * Recursively stringify objects with sorted keys so the resulting JSON is
   * independent of the original key insertion order.
   */
  private stableStringify(value: unknown, seen: WeakSet<object> = new WeakSet()): string {
    const serialize = (val: unknown): unknown => {
      if (val === null || typeof val !== 'object') {
        return val;
      }

      if (seen.has(val as object)) {
        throw new TypeError('Cannot stringify circular structure');
      }
      seen.add(val as object);

      if (Array.isArray(val)) {
        return val.map(serialize);
      }

      const obj: Record<string, unknown> = {};
      for (const key of Object.keys(val as Record<string, unknown>).sort()) {
        obj[key] = serialize((val as Record<string, unknown>)[key]);
      }
      return obj;
    };

    return JSON.stringify(serialize(value));
  }
}
