import { BullMqEvent } from 'packages/bullmq/lib/events/bull-mq.event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { BullMqEventConsumerService } from '../../../lib/services/event-consumer/bull-mq-event-consumer.service';

describe('BullMqEventConsumerService', () => {
  let workerRegisterService: any;
  let queueRegisterService: any;
  let eventsRegisterService: any;
  let workerService: any;
  let eventBus: any;
  let consumerOptions: any;
  let consumerService: BullMqEventConsumerService;

  beforeEach(() => {
    workerRegisterService = {
      get: vi.fn().mockReturnValue('workerMock'),
    };

    queueRegisterService = {
      get: vi.fn().mockReturnValue('queueMock'),
    };

    eventsRegisterService = {
      getType: vi.fn(),
    };

    workerService = {
      createWorker: vi.fn(),
    };

    eventBus = {
      synchronouslyConsumeByStrictlySingleHandler: vi.fn(),
    };

    consumerOptions = [{ queueName: 'testQueue', workerOptions: {} }];

    consumerService = new BullMqEventConsumerService(
      workerRegisterService,
      queueRegisterService,
      eventsRegisterService,
      consumerOptions,
      workerService,
      eventBus,
    );
  });

  describe('init', () => {
    it('should register a worker for each consumer option', () => {
      consumerService.init();

      expect(workerService.createWorker).toHaveBeenCalledTimes(1);
      expect(workerService.createWorker).toHaveBeenCalledWith('testQueue', expect.any(Function), {});
    });
  });

  describe('handleJob', () => {
    class TestEvent extends BullMqEvent {
      constructor(payload: object) {
        super('testQueue', 'DummyEvent', { attempts: 3 }, payload);
      }
    }

    it('should map job to event and pass it to the eventBus with proper context', async () => {
      const dummyPayload = { foo: 'bar' };
      eventsRegisterService.getType.mockReturnValue(TestEvent);

      const job = {
        queueName: 'testQueue',
        name: 'DummyEvent',
        opts: { attempts: 3 },
        data: dummyPayload,
      };

      const handleJob = consumerService['handleJob'].bind(consumerService);

      await handleJob(job, 'token123');

      expect(eventBus.synchronouslyConsumeByStrictlySingleHandler).toHaveBeenCalledTimes(1);

      const [eventArg, optionsArg] = eventBus.synchronouslyConsumeByStrictlySingleHandler.mock.calls[0];

      expect(eventArg).toEqual(new TestEvent(dummyPayload));

      expect(optionsArg).toEqual({ context: { job, worker: 'workerMock', queue: 'queueMock', token: 'token123' } });
    });

    it('should throw an error if event type is not found', async () => {
      eventsRegisterService.getType.mockReturnValue(undefined);

      const job = {
        queueName: 'testQueue',
        name: '',
        opts: {},
        data: {},
      };

      const handleJob = consumerService['handleJob'].bind(consumerService);

      await expect(handleJob(job)).rejects.toThrowError();
    });
  });
});
