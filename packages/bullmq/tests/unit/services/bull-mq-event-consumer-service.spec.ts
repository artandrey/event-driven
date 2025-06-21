import { BaseHandlerRegister, EventHandler, HandlerRegister } from '@event-driven-architecture/core';
import { BullMqEvent } from 'packages/bullmq/lib/events/bull-mq.event';
import { HandlesBullMq } from 'packages/bullmq/lib/util';
import { mapBullMqEventToRoutingMetadata } from 'packages/bullmq/lib/util/map-bull-mq-event-to-routing-metadata';
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
  let handlerRegisterService: HandlerRegister;

  beforeEach(() => {
    workerRegisterService = {
      get: vi.fn().mockReturnValue('workerMock'),
    };

    queueRegisterService = {
      get: vi.fn().mockReturnValue('queueMock'),
    };

    eventsRegisterService = {
      getType: vi.fn(),
      register: vi.fn(),
    };

    workerService = {
      createWorker: vi.fn(),
    };

    eventBus = {
      synchronouslyConsumeByStrictlySingleHandler: vi.fn(),
    };

    handlerRegisterService = new BaseHandlerRegister();

    consumerOptions = [{ queueName: 'testQueue', workerOptions: {} }];

    consumerService = new BullMqEventConsumerService(
      workerRegisterService,
      queueRegisterService,
      eventsRegisterService,
      consumerOptions,
      workerService,
      eventBus,
      handlerRegisterService,
    );
  });

  describe('init', () => {
    it('should register a worker for each consumer option', () => {
      consumerService.init();

      expect(workerService.createWorker).toHaveBeenCalledTimes(1);
      expect(workerService.createWorker).toHaveBeenCalledWith('testQueue', expect.any(Function), {});
    });

    it('should register events from handler signatures', () => {
      class TestEvent extends BullMqEvent {
        constructor(payload: object) {
          super({ queueName: 'testQueue', name: 'DummyEvent', jobOptions: { attempts: 3 }, payload });
        }
      }

      class TestHandler implements EventHandler<TestEvent> {
        handle() {}
      }

      handlerRegisterService.addHandler(HandlesBullMq(TestEvent), new TestHandler());

      consumerService.init();

      expect(eventsRegisterService.register).toHaveBeenCalledTimes(1);
      expect(eventsRegisterService.register).toHaveBeenCalledWith(TestEvent);
    });
  });

  describe('handleJob', () => {
    class TestEvent extends BullMqEvent {
      constructor(payload: object) {
        super({ queueName: 'testQueue', name: 'DummyEvent', jobOptions: { attempts: 3 }, payload });
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

      expect(optionsArg).toMatchObject({
        context: { job, worker: 'workerMock', queue: 'queueMock', token: 'token123' },
      });
      expect(optionsArg).toMatchObject({
        routingMetadata: mapBullMqEventToRoutingMetadata(new TestEvent(dummyPayload)),
      });
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
