import { randomUUID } from 'crypto';

export const generateRandomPayload = <T extends object>(): T => {
  return {
    id: randomUUID(),
  } as T;
};
