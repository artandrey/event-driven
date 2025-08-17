import { TaskProcessor } from '@event-driven-architecture/core';
import { vi } from 'vitest';

import { BullMqBaseTask } from '../../dist';

export const createTaskProcessor = <T extends object, R = void>() => {
  class TestTaskProcessor implements TaskProcessor<BullMqBaseTask<T>, R> {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    handle(event: BullMqBaseTask<T>): Promise<R> {
      return {} as any;
    }
  }

  const handleSpy = vi.spyOn(TestTaskProcessor.prototype, 'handle');

  return {
    processor: TestTaskProcessor,
    handleSpy,
  };
};
