export class EntityNotFoundException extends Error {
  constructor(key: unknown) {
    super(`Entity not found for key: ${key}`);
  }
}
