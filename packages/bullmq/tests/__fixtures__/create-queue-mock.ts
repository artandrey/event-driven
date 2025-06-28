import { Queue } from 'bullmq';
import { vi } from 'vitest';

export function createQueueMock(): Queue {
  return vi.mockObject({
    addBulk: vi.fn(),
    add: vi.fn(),
  } as unknown as Queue);
}
