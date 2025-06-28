import { FlowProducer } from 'bullmq';
import { vi } from 'vitest';

export function createFlowProducerMock(): FlowProducer {
  return vi.mockObject({
    addBulk: vi.fn(),
    add: vi.fn(),
  } as unknown as FlowProducer);
}
