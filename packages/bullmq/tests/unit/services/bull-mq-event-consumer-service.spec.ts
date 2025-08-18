import {
  BaseHandlerRegister,
  HandlerRegister,
  HandlerThrownException,
  HandlingResult,
} from '@event-driven-architecture/core';
import { HandlesBullMq } from 'packages/bullmq/lib/util';
import { mapBullMqEventToRoutingMetadata } from 'packages/bullmq/lib/util/map-bull-mq-event-to-routing-metadata';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { BullMqEventConsumerService } from '../../../lib/services/event-consumer/bull-mq-event-consumer.service';
import { createTask } from '../../__fixtures__/create-task';
import { createTaskProcessor } from '../../__fixtures__/task-processor';

describe('BullMqEventConsumerService', () => {
  let workerRegisterService: any;
  let queueRegisterService: any;
  let eventsRegisterService: any;
  let workerService: any;
  let eventBus: any;
  let consumerOptions: any;
  let consumerService: BullMqEventConsumerService;
  let handlerRegisterService: HandlerRegister;
  let mockWorkerCallback: any;

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
      createWorker: vi.fn().mockImplementation((queueName, callback) => {
        mockWorkerCallback = callback;
        return 'workerInstance';
      }),
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

    it('should register tasks from handler signatures', () => {
      const testTask = createTask('DummyTask', {}, 'testQueue', { attempts: 3 });

      const { processor: TestTaskProcessor } = createTaskProcessor<object, void>();

      handlerRegisterService.addHandler(HandlesBullMq(testTask.class), new TestTaskProcessor());

      consumerService.init();

      expect(eventsRegisterService.register).toHaveBeenCalledTimes(1);
      expect(eventsRegisterService.register).toHaveBeenCalledWith(testTask.class);
    });
  });

  describe('worker callback handling', () => {
    const testTask = createTask('DummyTask', {}, 'testQueue', { attempts: 3 });

    beforeEach(() => {
      consumerService.init();
    });

    it('should process job successfully and pass task to eventBus with proper context', async () => {
      const dummyPayload = { foo: 'bar' };
      eventsRegisterService.getType.mockReturnValue(testTask.class);
      eventBus.synchronouslyConsumeByStrictlySingleHandler.mockResolvedValue(HandlingResult.success(undefined));

      const job = {
        queueName: 'testQueue',
        name: 'DummyTask',
        opts: { attempts: 3 },
        data: dummyPayload,
      };

      await mockWorkerCallback(job, 'token123');

      expect(eventBus.synchronouslyConsumeByStrictlySingleHandler).toHaveBeenCalledTimes(1);

      const [taskArg, optionsArg] = eventBus.synchronouslyConsumeByStrictlySingleHandler.mock.calls[0];

      const expectedTask = createTask('DummyTask', dummyPayload, 'testQueue', { attempts: 3 });
      expect(taskArg).toEqual(expectedTask.instance);
      expect(optionsArg).toMatchObject({
        context: { job, worker: 'workerMock', queue: 'queueMock', token: 'token123' },
      });
      expect(optionsArg).toMatchObject({
        routingMetadata: mapBullMqEventToRoutingMetadata(expectedTask.instance),
      });
    });

    it('should return handler result to worker when handling is successful', async () => {
      const dummyPayload = { foo: 'bar' };
      const handlerResult = { processed: true, message: 'Success' };

      eventsRegisterService.getType.mockReturnValue(testTask.class);
      eventBus.synchronouslyConsumeByStrictlySingleHandler.mockResolvedValue(HandlingResult.success(handlerResult));

      const job = {
        queueName: 'testQueue',
        name: 'DummyTask',
        opts: { attempts: 3 },
        data: dummyPayload,
      };

      const result = await mockWorkerCallback(job, 'token123');

      expect(result).toEqual(handlerResult);
      expect(eventBus.synchronouslyConsumeByStrictlySingleHandler).toHaveBeenCalledTimes(1);
    });

    it('should throw error to worker when handler fails', async () => {
      const dummyPayload = { foo: 'bar' };
      const handlerError = new Error('Handler failed');
      const handlerThrownException = new HandlerThrownException('TestTask', undefined, handlerError);

      eventsRegisterService.getType.mockReturnValue(testTask.class);
      eventBus.synchronouslyConsumeByStrictlySingleHandler.mockResolvedValue(
        HandlingResult.error(handlerThrownException),
      );

      const job = {
        queueName: 'testQueue',
        name: 'DummyTask',
        opts: { attempts: 3 },
        data: dummyPayload,
      };

      await expect(mockWorkerCallback(job, 'token123')).rejects.toThrow(handlerThrownException);
    });

    it('should throw error to worker when no handler is found', async () => {
      const dummyPayload = { foo: 'bar' };
      const noHandlerError = new Error('No handler found');

      eventsRegisterService.getType.mockReturnValue(testTask.class);
      eventBus.synchronouslyConsumeByStrictlySingleHandler.mockResolvedValue(HandlingResult.error(noHandlerError));

      const job = {
        queueName: 'testQueue',
        name: 'DummyEvent',
        opts: { attempts: 3 },
        data: dummyPayload,
      };

      await expect(mockWorkerCallback(job, 'token123')).rejects.toThrow(noHandlerError);
    });

    it('should throw error to worker when event type is not found during mapping', async () => {
      eventsRegisterService.getType.mockReturnValue(undefined);

      const job = {
        queueName: 'testQueue',
        name: 'UnknownEvent',
        opts: {},
        data: {},
      };

      await expect(mockWorkerCallback(job)).rejects.toThrow(
        'Event type not found for queue: testQueue, name: UnknownEvent',
      );
    });
  });
});
