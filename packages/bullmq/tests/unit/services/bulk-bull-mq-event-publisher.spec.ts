import { BulkBullMqEventPublisher, FanoutRouter, FlowRegisterService, QueueRegisterService } from 'packages/bullmq/lib';

import { createFlowProducerMock } from '../../__fixtures__/create-flow-prducer-mock';
import { createQueueMock } from '../../__fixtures__/create-queue-mock';
import { createFanoutTask, createFlowTask, createTask } from '../../__fixtures__/create-task';
import { generateJobName, generateQueueName } from '../../__fixtures__/generate-literals';
import { generatePayload } from '../../__fixtures__/generate-pyaload';
import { randomBullMqJobOptions } from '../../__fixtures__/random-bull-mq-options';

describe('BulkBullMqEventPublisher', () => {
  const queueRegisterService = vi.mockObject(new QueueRegisterService());
  const flowRegisterService = vi.mockObject(new FlowRegisterService());
  const fanoutRouter = vi.mockObject(FanoutRouter.create());

  afterEach(() => {
    vi.clearAllMocks();
  });

  const eventPublisher = new BulkBullMqEventPublisher(queueRegisterService, flowRegisterService, fanoutRouter);

  describe('bulk publishing', () => {
    it('should bulk publish queue events', () => {
      const queue1Mock = createQueueMock();
      const queue2Mock = createQueueMock();

      const jobOptions = randomBullMqJobOptions();

      const {
        instance: testEvent1,
        queueName: testEvent1QueueName,
        toQueueAddBulkOptionsItem: testEvent1ToQueueAddBulkOptionsItem,
      } = createTask(generateJobName(1), generatePayload(1), generateQueueName(1), jobOptions);

      const {
        instance: testEvent2,
        queueName: testEvent2QueueName,
        toQueueAddBulkOptionsItem: testEvent2ToQueueAddBulkOptionsItem,
      } = createTask(generateJobName(2), generatePayload(2), generateQueueName(2), jobOptions);

      queueRegisterService.get.mockImplementation((queueName) => {
        if (queueName === testEvent1QueueName) {
          return queue1Mock;
        } else if (queueName === testEvent2QueueName) {
          return queue2Mock;
        }
      });

      eventPublisher.publishAll([testEvent1, testEvent2]);

      expect(queue1Mock.addBulk).toHaveBeenCalledWith([testEvent1ToQueueAddBulkOptionsItem()]);
      expect(queue2Mock.addBulk).toHaveBeenCalledWith([testEvent2ToQueueAddBulkOptionsItem()]);
    });

    it('should bulk publish queue events to same queue', () => {
      const queueMock = createQueueMock();
      const jobOptions = randomBullMqJobOptions();

      const { instance: testEvent1, toQueueAddBulkOptionsItem: testEvent1ToQueueAddBulkOptionsItem } = createTask(
        generateJobName(1),
        generatePayload(1),
        generateQueueName(1),
        jobOptions,
      );

      const { instance: testEvent2, toQueueAddBulkOptionsItem: testEvent2ToQueueAddBulkOptionsItem } = createTask(
        generateJobName(2),
        generatePayload(2),
        generateQueueName(1),
        jobOptions,
      );

      queueRegisterService.get.mockReturnValue(queueMock);

      eventPublisher.publishAll([testEvent1, testEvent2]);

      expect(queueMock.addBulk).toHaveBeenCalledWith([
        testEvent1ToQueueAddBulkOptionsItem(),
        testEvent2ToQueueAddBulkOptionsItem(),
      ]);
      expect(queueMock.addBulk).toHaveBeenCalledTimes(1);
    });

    it('should bulk publish unnamed flow events', () => {
      const flowProducer = createFlowProducerMock();
      const jobOptions = randomBullMqJobOptions();

      const { instance: testEvent1, toFlowAddOptions: testEvent1ToFlowAddOptions } = createFlowTask(
        generateJobName(1),
        generatePayload(1),
        generateQueueName(1),
        jobOptions,
        [],
      );

      const { instance: testEvent2, toFlowAddOptions: testEvent2ToFlowAddOptions } = createFlowTask(
        generateJobName(2),
        generatePayload(2),
        generateQueueName(2),
        jobOptions,
        [],
      );

      flowRegisterService.getDefault.mockReturnValue(flowProducer);

      eventPublisher.publishAll([testEvent1, testEvent2]);

      expect(flowProducer.addBulk).toHaveBeenCalledWith([testEvent1ToFlowAddOptions(), testEvent2ToFlowAddOptions()]);
      expect(flowProducer.addBulk).toHaveBeenCalledTimes(1);
    });

    it('should bulk publish named flow events', () => {
      const flowProducer1 = createFlowProducerMock();
      const flowProducer2 = createFlowProducerMock();
      const jobOptions = randomBullMqJobOptions();

      const { instance: testEvent1, toFlowAddOptions: testEvent1ToFlowAddOptions } = createFlowTask(
        generateJobName(1),
        generatePayload(1),
        generateQueueName(1),
        jobOptions,
        [],
        generateJobName(3),
      );

      const { instance: testEvent2, toFlowAddOptions: testEvent2ToFlowAddOptions } = createFlowTask(
        generateJobName(2),
        generatePayload(2),
        generateQueueName(2),
        jobOptions,
        [],
        generateJobName(4),
      );

      flowRegisterService.getNamed.mockImplementation((flowName) => {
        if (flowName === generateJobName(3)) {
          return flowProducer1;
        } else if (flowName === generateJobName(4)) {
          return flowProducer2;
        }
      });

      eventPublisher.publishAll([testEvent1, testEvent2]);

      expect(flowRegisterService.getNamed).toHaveBeenCalledWith(generateJobName(3));
      expect(flowRegisterService.getNamed).toHaveBeenCalledWith(generateJobName(4));
      expect(flowProducer1.addBulk).toHaveBeenCalledWith([testEvent1ToFlowAddOptions()]);
      expect(flowProducer2.addBulk).toHaveBeenCalledWith([testEvent2ToFlowAddOptions()]);
    });

    it('should bulk publish named flow events to same flow', () => {
      const flowProducer = createFlowProducerMock();
      const jobOptions = randomBullMqJobOptions();

      const { instance: testEvent1, toFlowAddOptions: testEvent1ToFlowAddOptions } = createFlowTask(
        generateJobName(1),
        generatePayload(1),
        generateQueueName(1),
        jobOptions,
        [],
        generateJobName(3),
      );

      const { instance: testEvent2, toFlowAddOptions: testEvent2ToFlowAddOptions } = createFlowTask(
        generateJobName(2),
        generatePayload(2),
        generateQueueName(2),
        jobOptions,
        [],
        generateJobName(3),
      );

      flowRegisterService.getNamed.mockReturnValue(flowProducer);

      eventPublisher.publishAll([testEvent1, testEvent2]);

      expect(flowRegisterService.getNamed).toHaveBeenCalledWith(generateJobName(3));
      expect(flowProducer.addBulk).toHaveBeenCalledWith([testEvent1ToFlowAddOptions(), testEvent2ToFlowAddOptions()]);
      expect(flowProducer.addBulk).toHaveBeenCalledTimes(1);
    });

    it('should bulk publish fanout events', () => {
      const queue1Mock = createQueueMock();
      const queue2Mock = createQueueMock();
      const queue3Mock = createQueueMock();
      const jobOptions = randomBullMqJobOptions();

      const {
        instance: testEvent1,
        class: TestEventClass1,
        name: name1,
        payload: payload1,
        jobOptions: options1,
      } = createFanoutTask(generateJobName(1), generatePayload(1), jobOptions);

      const {
        instance: testEvent2,
        class: TestEventClass2,
        name: name2,
        payload: payload2,
        jobOptions: options2,
      } = createFanoutTask(generateJobName(2), generatePayload(2), jobOptions);

      fanoutRouter.getRoute.mockImplementation((eventClass) => {
        if (eventClass === TestEventClass1) {
          return { queues: [{ name: generateQueueName(1) }, { name: generateQueueName(2) }] };
        } else if (eventClass === TestEventClass2) {
          return { queues: [{ name: generateQueueName(2) }, { name: generateQueueName(3) }] };
        }
        return null;
      });

      queueRegisterService.get.mockImplementation((queueName) => {
        if (queueName === generateQueueName(1)) return queue1Mock;
        if (queueName === generateQueueName(2)) return queue2Mock;
        if (queueName === generateQueueName(3)) return queue3Mock;
        throw new Error(`Unexpected queue name: ${queueName}`);
      });

      eventPublisher.publishAll([testEvent1, testEvent2]);

      expect(queue1Mock.addBulk).toHaveBeenCalledWith([{ name: name1, data: payload1, opts: options1 }]);
      expect(queue2Mock.addBulk).toHaveBeenCalledWith([
        { name: name1, data: payload1, opts: options1 },
        { name: name2, data: payload2, opts: options2 },
      ]);
      expect(queue3Mock.addBulk).toHaveBeenCalledWith([{ name: name2, data: payload2, opts: options2 }]);
    });

    it('should bulk publish mixed event types', () => {
      const queue1Mock = createQueueMock();
      const queue2Mock = createQueueMock();
      const flowProducer = createFlowProducerMock();
      const jobOptions = randomBullMqJobOptions();

      const { instance: queueEvent, toQueueAddBulkOptionsItem: queueEventToQueueAddBulkOptionsItem } = createTask(
        generateJobName(1),
        generatePayload(1),
        generateQueueName(1),
        jobOptions,
      );

      const { instance: flowEvent, toFlowAddOptions: flowEventToFlowAddOptions } = createFlowTask(
        generateJobName(2),
        generatePayload(2),
        generateQueueName(1),
        jobOptions,
        [],
      );

      const {
        instance: fanoutEvent,
        class: FanoutEventClass,
        name: fanoutName,
        payload: fanoutPayload,
        jobOptions: fanoutOptions,
      } = createFanoutTask(generateJobName(3), generatePayload(3), jobOptions);

      fanoutRouter.getRoute.mockImplementation((eventClass) => {
        if (eventClass === FanoutEventClass) {
          return { queues: [{ name: generateQueueName(1) }, { name: generateQueueName(2) }] };
        }
        return null;
      });

      queueRegisterService.get.mockImplementation((queueName) => {
        if (queueName === generateQueueName(1)) return queue1Mock;
        if (queueName === generateQueueName(2)) return queue2Mock;
        throw new Error(`Unexpected queue name: ${queueName}`);
      });

      flowRegisterService.getDefault.mockReturnValue(flowProducer);

      eventPublisher.publishAll([queueEvent, flowEvent, fanoutEvent]);

      expect(queue1Mock.addBulk).toHaveBeenCalledWith([
        queueEventToQueueAddBulkOptionsItem(),
        { name: fanoutName, data: fanoutPayload, opts: fanoutOptions },
      ]);
      expect(queue2Mock.addBulk).toHaveBeenCalledWith([{ name: fanoutName, data: fanoutPayload, opts: fanoutOptions }]);
      expect(flowProducer.addBulk).toHaveBeenCalledWith([flowEventToFlowAddOptions()]);
    });

    it('should bulk publish fanout events with rewrite job options strategy', () => {
      const queue1Mock = createQueueMock();
      const queue2Mock = createQueueMock();
      const eventJobOptions = { attempts: 3, delay: 1000 };
      const queue1CustomOptions = { attempts: 5, priority: 10 };
      const queue2CustomOptions = { attempts: 2, backoff: { type: 'fixed', delay: 5000 } };

      const {
        instance: testEvent,
        class: TestEventClass,
        name,
        payload,
      } = createFanoutTask(generateJobName(1), generatePayload(1), eventJobOptions);

      fanoutRouter.getRoute.mockReturnValue({
        queues: [
          { name: generateQueueName(1), jobOptions: queue1CustomOptions, jobOptionsStrategy: 'rewrite' },
          { name: generateQueueName(2), jobOptions: queue2CustomOptions, jobOptionsStrategy: 'rewrite' },
        ],
      });

      queueRegisterService.get.mockImplementation((queueName) => {
        if (queueName === 'queue-1') return queue1Mock;
        if (queueName === 'queue-2') return queue2Mock;
        throw new Error(`Unexpected queue name: ${queueName}`);
      });

      eventPublisher.publishAll([testEvent]);

      expect(fanoutRouter.getRoute).toHaveBeenCalledWith(TestEventClass);
      expect(queue1Mock.addBulk).toHaveBeenCalledWith([{ name, data: payload, opts: queue1CustomOptions }]);
      expect(queue2Mock.addBulk).toHaveBeenCalledWith([{ name, data: payload, opts: queue2CustomOptions }]);
    });

    it('should bulk publish fanout events with override job options strategy', () => {
      const queue1Mock = createQueueMock();
      const queue2Mock = createQueueMock();
      const eventJobOptions = { attempts: 3, delay: 1000, priority: 1 };
      const queue1CustomOptions = { attempts: 5, priority: 10 };
      const queue2CustomOptions = { delay: 5000, backoff: { type: 'fixed', delay: 2000 } };

      const {
        instance: testEvent,
        class: TestEventClass,
        name,
        payload,
      } = createFanoutTask('test-fanout-event', { test: 'fanout-test' }, eventJobOptions);

      fanoutRouter.getRoute.mockReturnValue({
        queues: [
          { name: 'queue-1', jobOptions: queue1CustomOptions, jobOptionsStrategy: 'override' },
          { name: 'queue-2', jobOptions: queue2CustomOptions, jobOptionsStrategy: 'override' },
        ],
      });

      queueRegisterService.get.mockImplementation((queueName) => {
        if (queueName === 'queue-1') return queue1Mock;
        if (queueName === 'queue-2') return queue2Mock;
        throw new Error(`Unexpected queue name: ${queueName}`);
      });

      eventPublisher.publishAll([testEvent]);

      expect(fanoutRouter.getRoute).toHaveBeenCalledWith(TestEventClass);
      expect(queue1Mock.addBulk).toHaveBeenCalledWith([
        {
          name,
          data: payload,
          opts: {
            attempts: 5, // overridden
            delay: 1000, // from event
            priority: 10, // overridden
          },
        },
      ]);
      expect(queue2Mock.addBulk).toHaveBeenCalledWith([
        {
          name,
          data: payload,
          opts: {
            attempts: 3, // from event
            delay: 5000, // overridden
            priority: 1, // from event
            backoff: { type: 'fixed', delay: 2000 }, // overridden
          },
        },
      ]);
    });
  });
});
