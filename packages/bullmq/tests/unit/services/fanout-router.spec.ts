import { FanoutOptions, FanoutRoute, FanoutRouter } from 'packages/bullmq/lib';

import { createFanoutTask } from '../../__fixtures__/create-task';
import { generateJobName, generateQueueName } from '../../__fixtures__/generate-literals';
import { generatePayload } from '../../__fixtures__/generate-pyaload';
import { randomBullMqJobOptions } from '../../__fixtures__/random-bull-mq-options';

describe('FanoutRouter', () => {
  describe('creation', () => {
    it('should create empty router when no options provided', () => {
      const router = FanoutRouter.create();
      const { class: TestEventClass } = createFanoutTask('test-event', { test: 'test' }, randomBullMqJobOptions());

      expect(router.getRoute(TestEventClass)).toBeNull();
    });

    it('should create router with predefined routes', () => {
      const route1: FanoutRoute = { queues: [{ name: generateQueueName(1) }, { name: generateQueueName(2) }] };
      const route2: FanoutRoute = {
        queues: [{ name: generateQueueName(3) }, { name: generateQueueName(4) }, { name: generateQueueName(5) }],
      };

      const { class: TestEventClass1 } = createFanoutTask(
        generateJobName(1),
        { test: 'test1' },
        randomBullMqJobOptions(),
      );
      const { class: TestEventClass2 } = createFanoutTask(generateJobName(2), { data: 123 }, randomBullMqJobOptions());
      const { class: TestEventClass3 } = createFanoutTask(
        generateJobName(3),
        { value: true },
        randomBullMqJobOptions(),
      );

      const options: FanoutOptions = {
        routes: [
          { event: TestEventClass1, route: route1 },
          { event: TestEventClass2, route: route2 },
        ],
      };

      const router = FanoutRouter.create(options);

      expect(router.getRoute(TestEventClass1)).toEqual(route1);
      expect(router.getRoute(TestEventClass2)).toEqual(route2);
      expect(router.getRoute(TestEventClass3)).toBeNull();
    });

    it('should create router with empty routes array', () => {
      const router = FanoutRouter.create({ routes: [] });
      const { class: TestEventClass } = createFanoutTask(
        generateJobName(1),
        generatePayload(1),
        randomBullMqJobOptions(),
      );

      expect(router.getRoute(TestEventClass)).toBeNull();
    });

    it('should handle single route in constructor', () => {
      const route: FanoutRoute = { queues: [{ name: 'single-queue' }] };
      const { class: TestEventClass1 } = createFanoutTask(
        generateJobName(1),
        generatePayload(1),
        randomBullMqJobOptions(),
      );
      const { class: TestEventClass2 } = createFanoutTask(
        generateJobName(2),
        generatePayload(2),
        randomBullMqJobOptions(),
      );

      const options: FanoutOptions = {
        routes: [{ event: TestEventClass1, route }],
      };

      const router = FanoutRouter.create(options);

      expect(router.getRoute(TestEventClass1)).toEqual(route);
      expect(router.getRoute(TestEventClass2)).toBeNull();
    });
  });

  describe('addRoute', () => {
    it('should add new route to empty router', () => {
      const router = FanoutRouter.create();
      const route: FanoutRoute = { queues: [{ name: generateQueueName(1) }, { name: generateQueueName(2) }] };
      const { class: TestEventClass1 } = createFanoutTask(
        generateJobName(1),
        generatePayload(1),
        randomBullMqJobOptions(),
      );
      const { class: TestEventClass2 } = createFanoutTask(
        generateJobName(2),
        generatePayload(2),
        randomBullMqJobOptions(),
      );

      router.addRoute(TestEventClass1, route);

      expect(router.getRoute(TestEventClass1)).toEqual(route);
      expect(router.getRoute(TestEventClass2)).toBeNull();
    });

    it('should add multiple routes', () => {
      const router = FanoutRouter.create();
      const route1: FanoutRoute = { queues: [{ name: generateQueueName(1) }] };
      const route2: FanoutRoute = { queues: [{ name: generateQueueName(2) }, { name: generateQueueName(3) }] };
      const route3: FanoutRoute = {
        queues: [{ name: generateQueueName(4) }, { name: generateQueueName(5) }, { name: generateQueueName(6) }],
      };

      const { class: TestEventClass1 } = createFanoutTask(
        generateJobName(1),
        generatePayload(1),
        randomBullMqJobOptions(),
      );
      const { class: TestEventClass2 } = createFanoutTask(
        generateJobName(2),
        generatePayload(2),
        randomBullMqJobOptions(),
      );
      const { class: TestEventClass3 } = createFanoutTask(
        generateJobName(3),
        generatePayload(3),
        randomBullMqJobOptions(),
      );

      router.addRoute(TestEventClass1, route1);
      router.addRoute(TestEventClass2, route2);
      router.addRoute(TestEventClass3, route3);

      expect(router.getRoute(TestEventClass1)).toEqual(route1);
      expect(router.getRoute(TestEventClass2)).toEqual(route2);
      expect(router.getRoute(TestEventClass3)).toEqual(route3);
    });

    it('should override existing route with addRoute', () => {
      const router = FanoutRouter.create();
      const originalRoute: FanoutRoute = { queues: [{ name: generateQueueName(1) }] };
      const newRoute: FanoutRoute = { queues: [{ name: generateQueueName(2) }, { name: generateQueueName(3) }] };
      const { class: TestEventClass } = createFanoutTask(
        generateJobName(1),
        generatePayload(1),
        randomBullMqJobOptions(),
      );

      router.addRoute(TestEventClass, originalRoute);
      expect(router.getRoute(TestEventClass)).toEqual(originalRoute);

      router.addRoute(TestEventClass, newRoute);
      expect(router.getRoute(TestEventClass)).toEqual(newRoute);
    });

    it('should add route with empty queues array and throw', () => {
      const router = FanoutRouter.create();
      const route: FanoutRoute = { queues: [] };
      const { class: TestEventClass } = createFanoutTask(
        generateJobName(1),
        generatePayload(1),
        randomBullMqJobOptions(),
      );

      expect(() => router.addRoute(TestEventClass, route)).toThrowError('Fanout route must contain at least one queue');
    });

    it('should add route to router initialized with options', () => {
      const initialRoute: FanoutRoute = { queues: [{ name: generateQueueName(1) }] };
      const { class: TestEventClass1 } = createFanoutTask(
        generateJobName(1),
        generatePayload(1),
        randomBullMqJobOptions(),
      );
      const { class: TestEventClass2 } = createFanoutTask(
        generateJobName(2),
        generatePayload(2),
        randomBullMqJobOptions(),
      );

      const options: FanoutOptions = {
        routes: [{ event: TestEventClass1, route: initialRoute }],
      };
      const router = FanoutRouter.create(options);

      const newRoute: FanoutRoute = {
        queues: [{ name: generateQueueName(2) }, { name: generateQueueName(3) }],
      };
      router.addRoute(TestEventClass2, newRoute);

      expect(router.getRoute(TestEventClass1)).toEqual(initialRoute);
      expect(router.getRoute(TestEventClass2)).toEqual(newRoute);
    });
  });

  describe('overrideRoute', () => {
    it('should override an existing route explicitly', () => {
      const router = FanoutRouter.create();
      const originalRoute: FanoutRoute = { queues: [{ name: generateQueueName(1) }] };
      const overrideRoute: FanoutRoute = { queues: [{ name: generateQueueName(2) }] };
      const { class: TestEventClass } = createFanoutTask(
        generateJobName(1),
        generatePayload(1),
        randomBullMqJobOptions(),
      );

      router.addRoute(TestEventClass, originalRoute);
      router.overrideRoute(TestEventClass, overrideRoute);

      expect(router.getRoute(TestEventClass)).toEqual(overrideRoute);
    });
  });

  describe('getRoute', () => {
    it('should return null for non-existent route', () => {
      const router = FanoutRouter.create();
      const { class: TestEventClass1 } = createFanoutTask(
        generateJobName(1),
        generatePayload(1),
        randomBullMqJobOptions(),
      );
      const { class: TestEventClass2 } = createFanoutTask(
        generateJobName(2),
        generatePayload(2),
        randomBullMqJobOptions(),
      );

      expect(router.getRoute(TestEventClass1)).toBeNull();
      expect(router.getRoute(TestEventClass2)).toBeNull();
    });

    it('should return configured route for existing event', () => {
      const router = FanoutRouter.create();
      const route: FanoutRoute = {
        queues: [{ name: generateQueueName(1) }, { name: generateQueueName(2) }, { name: generateQueueName(3) }],
      };
      const { class: TestEventClass } = createFanoutTask(
        generateJobName(1),
        generatePayload(1),
        randomBullMqJobOptions(),
      );

      router.addRoute(TestEventClass, route);

      expect(router.getRoute(TestEventClass)).toEqual(route);
    });

    it('should return the configured route for each event class', () => {
      const router = FanoutRouter.create();
      const route1: FanoutRoute = { queues: [{ name: generateQueueName(1) }] };
      const route2: FanoutRoute = {
        queues: [{ name: generateQueueName(2) }, { name: generateQueueName(3) }],
      };

      const { class: TestEventClass1 } = createFanoutTask(
        generateJobName(1),
        generatePayload(1),
        randomBullMqJobOptions(),
      );
      const { class: TestEventClass2 } = createFanoutTask(
        generateJobName(2),
        generatePayload(2),
        randomBullMqJobOptions(),
      );

      const { class: TestEventClass3 } = createFanoutTask(
        generateJobName(3),
        generatePayload(3),
        randomBullMqJobOptions(),
      );

      router.addRoute(TestEventClass1, route1);
      router.addRoute(TestEventClass2, route2);

      expect(router.getRoute(TestEventClass1)).toEqual(route1);
      expect(router.getRoute(TestEventClass2)).toEqual(route2);
      expect(router.getRoute(TestEventClass3)).toBeNull();
    });

    it('should throw for route with duplicate queue names', () => {
      const router = FanoutRouter.create();
      const route: FanoutRoute = {
        queues: [{ name: generateQueueName(1) }, { name: generateQueueName(1) }, { name: generateQueueName(2) }],
      };
      const { class: TestEventClass } = createFanoutTask(
        generateJobName(1),
        generatePayload(1),
        randomBullMqJobOptions(),
      );

      expect(() => router.addRoute(TestEventClass, route)).toThrowError(
        `Duplicate queue name in fanout route: ${generateQueueName(1)}`,
      );
    });
  });

  describe('integration scenarios', () => {
    it('should resolve configured routes for multiple event classes', () => {
      const userEventsRoute: FanoutRoute = {
        queues: [{ name: generateQueueName(1) }, { name: generateQueueName(2) }, { name: generateQueueName(3) }],
      };
      const orderEventsRoute: FanoutRoute = {
        queues: [{ name: generateQueueName(4) }, { name: generateQueueName(5) }],
      };
      const notificationRoute: FanoutRoute = {
        queues: [{ name: generateQueueName(6) }, { name: generateQueueName(7) }, { name: generateQueueName(8) }],
      };

      const { class: UserEventClass } = createFanoutTask(
        generateJobName(1),
        generatePayload(1),
        randomBullMqJobOptions(),
      );
      const { class: OrderEventClass } = createFanoutTask(
        generateJobName(2),
        generatePayload(2),
        randomBullMqJobOptions(),
      );
      const { class: NotificationEventClass } = createFanoutTask(
        generateJobName(3),
        generatePayload(3),
        randomBullMqJobOptions(),
      );

      const options: FanoutOptions = {
        routes: [
          { event: UserEventClass, route: userEventsRoute },
          { event: OrderEventClass, route: orderEventsRoute },
        ],
      };

      const router = FanoutRouter.create(options);
      router.addRoute(NotificationEventClass, notificationRoute);

      expect(router.getRoute(UserEventClass)).toEqual(userEventsRoute);
      expect(router.getRoute(OrderEventClass)).toEqual(orderEventsRoute);
      expect(router.getRoute(NotificationEventClass)).toEqual(notificationRoute);
    });

    it('should not modify existing routes when adding routes for other events', () => {
      const router = FanoutRouter.create();
      const route1: FanoutRoute = { queues: [{ name: generateQueueName(1) }] };
      const route2: FanoutRoute = { queues: [{ name: generateQueueName(2) }] };

      const { class: TestEventClass1 } = createFanoutTask(
        generateJobName(1),
        generatePayload(1),
        randomBullMqJobOptions(),
      );
      const { class: TestEventClass2 } = createFanoutTask(
        generateJobName(2),
        generatePayload(2),
        randomBullMqJobOptions(),
      );

      router.addRoute(TestEventClass1, route1);
      router.addRoute(TestEventClass2, route2);

      expect(router.getRoute(TestEventClass2)?.queues).not.toContain(generateQueueName(1));
    });
  });
});
