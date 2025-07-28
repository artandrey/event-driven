export function BaseException<T extends string>(brand: T) {
  return class extends Error {
    __brand__: T = brand;
  };
}
