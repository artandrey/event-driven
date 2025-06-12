export abstract class EntityRegisterService<TEntity, TKey, TSerializedKey = TKey> {
  private readonly keyEntityMap = new Map<TSerializedKey, TEntity>();

  protected abstract getKey(entity: TEntity): TKey;
  protected abstract serializeKey(key: TKey): TSerializedKey;

  public add(entity: TEntity) {
    const key = this.getKey(entity);
    const serializedKey = this.serializeKey(key);
    this.keyEntityMap.set(serializedKey, entity);
  }

  public get(key: TKey): TEntity {
    const serializedKey = this.serializeKey(key);
    const entity = this.keyEntityMap.get(serializedKey);
    if (!entity) {
      throw new Error(`Entity not found for key: ${key}`);
    }
    return entity;
  }

  public remove(key: TKey) {
    const serializedKey = this.serializeKey(key);
    this.keyEntityMap.delete(serializedKey);
  }

  public getAll(): TEntity[] {
    return Array.from(this.keyEntityMap.values());
  }
}
