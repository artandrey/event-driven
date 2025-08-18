import { FanoutOptions, FanoutRoute, FanoutRouter } from 'packages/bullmq/lib';

import { createFanoutTask } from '../../__fixtures__/create-task';
import { randomBullMqJobOptions } from '../../__fixtures__/random-bull-mq-options';

describe('FanoutRouter', () => {
  describe('creation', () => {
    it('should create empty router when no options provided', () => {
      const router = FanoutRouter.create();
      const { class: TestEventClass } = createFanoutTask('test-event', { test: 'test' }, randomBullMqJobOptions());

      expect(router.getRoute(TestEventClass)).toBeNull();
    });

    it('should create router with predefined routes', () => {
      const route1: FanoutRoute = { queues: [{ name: 'queue-1' }, { name: 'queue-2' }] };
      const route2: FanoutRoute = { queues: [{ name: 'queue-3' }, { name: 'queue-4' }, { name: 'queue-5' }] };

      const { class: TestEventClass1 } = createFanoutTask('test-event-1', { test: 'test1' }, randomBullMqJobOptions());
      const { class: TestEventClass2 } = createFanoutTask('test-event-2', { data: 123 }, randomBullMqJobOptions());
      const { class: TestEventClass3 } = createFanoutTask('test-event-3', { value: true }, randomBullMqJobOptions());

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
      const { class: TestEventClass } = createFanoutTask('test-event', { test: 'test' }, randomBullMqJobOptions());

      expect(router.getRoute(TestEventClass)).toBeNull();
    });

    it('should handle single route in constructor', () => {
      const route: FanoutRoute = { queues: [{ name: 'single-queue' }] };
      const { class: TestEventClass1 } = createFanoutTask('test-event-1', { test: 'test1' }, randomBullMqJobOptions());
      const { class: TestEventClass2 } = createFanoutTask('test-event-2', { test: 'test2' }, randomBullMqJobOptions());

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
      const route: FanoutRoute = { queues: [{ name: 'queue-1' }, { name: 'queue-2' }] };
      const { class: TestEventClass1 } = createFanoutTask('test-event-1', { test: 'test1' }, randomBullMqJobOptions());
      const { class: TestEventClass2 } = createFanoutTask('test-event-2', { test: 'test2' }, randomBullMqJobOptions());

      router.addRoute(TestEventClass1, route);

      expect(router.getRoute(TestEventClass1)).toEqual(route);
      expect(router.getRoute(TestEventClass2)).toBeNull();
    });

    it('should add multiple routes', () => {
      const router = FanoutRouter.create();
      const route1: FanoutRoute = { queues: [{ name: 'queue-1' }] };
      const route2: FanoutRoute = { queues: [{ name: 'queue-2' }, { name: 'queue-3' }] };
      const route3: FanoutRoute = { queues: [{ name: 'queue-4' }, { name: 'queue-5' }, { name: 'queue-6' }] };

      const { class: TestEventClass1 } = createFanoutTask('test-event-1', { test: 'test1' }, randomBullMqJobOptions());
      const { class: TestEventClass2 } = createFanoutTask('test-event-2', { data: 123 }, randomBullMqJobOptions());
      const { class: TestEventClass3 } = createFanoutTask('test-event-3', { value: true }, randomBullMqJobOptions());

      router.addRoute(TestEventClass1, route1);
      router.addRoute(TestEventClass2, route2);
      router.addRoute(TestEventClass3, route3);

      expect(router.getRoute(TestEventClass1)).toEqual(route1);
      expect(router.getRoute(TestEventClass2)).toEqual(route2);
      expect(router.getRoute(TestEventClass3)).toEqual(route3);
    });

    it('should override existing route with addRoute', () => {
      const router = FanoutRouter.create();
      const originalRoute: FanoutRoute = { queues: [{ name: 'queue-1' }] };
      const newRoute: FanoutRoute = { queues: [{ name: 'queue-2' }, { name: 'queue-3' }] };
      const { class: TestEventClass } = createFanoutTask('test-event', { test: 'test' }, randomBullMqJobOptions());

      router.addRoute(TestEventClass, originalRoute);
      expect(router.getRoute(TestEventClass)).toEqual(originalRoute);

      router.addRoute(TestEventClass, newRoute);
      expect(router.getRoute(TestEventClass)).toEqual(newRoute);
    });

    it('should add route with empty queues array and throw', () => {
      const router = FanoutRouter.create();
      const route: FanoutRoute = { queues: [] };
      const { class: TestEventClass } = createFanoutTask('test-event', { test: 'test' }, randomBullMqJobOptions());

      expect(() => router.addRoute(TestEventClass, route)).toThrowError('Fanout route must contain at least one queue');
    });

    it('should add route to router initialized with options', () => {
      const initialRoute: FanoutRoute = { queues: [{ name: 'initial-queue' }] };
      const { class: TestEventClass1 } = createFanoutTask('test-event-1', { test: 'test1' }, randomBullMqJobOptions());
      const { class: TestEventClass2 } = createFanoutTask('test-event-2', { test: 'test2' }, randomBullMqJobOptions());

      const options: FanoutOptions = {
        routes: [{ event: TestEventClass1, route: initialRoute }],
      };
      const router = FanoutRouter.create(options);

      const newRoute: FanoutRoute = { queues: [{ name: 'new-queue-1' }, { name: 'new-queue-2' }] };
      router.addRoute(TestEventClass2, newRoute);

      expect(router.getRoute(TestEventClass1)).toEqual(initialRoute);
      expect(router.getRoute(TestEventClass2)).toEqual(newRoute);
    });
  });

  describe('overrideRoute', () => {
    it('should override an existing route explicitly', () => {
      const router = FanoutRouter.create();
      const originalRoute: FanoutRoute = { queues: [{ name: 'queue-1' }] };
      const overrideRoute: FanoutRoute = { queues: [{ name: 'override-queue' }] };
      const { class: TestEventClass } = createFanoutTask('test-event', { test: 'test' }, randomBullMqJobOptions());

      router.addRoute(TestEventClass, originalRoute);
      router.overrideRoute(TestEventClass, overrideRoute);

      expect(router.getRoute(TestEventClass)).toEqual(overrideRoute);
    });
  });

  describe('getRoute', () => {
    it('should return null for non-existent route', () => {
      const router = FanoutRouter.create();
      const { class: TestEventClass1 } = createFanoutTask('test-event-1', { test: 'test1' }, randomBullMqJobOptions());
      const { class: TestEventClass2 } = createFanoutTask('test-event-2', { test: 'test2' }, randomBullMqJobOptions());

      expect(router.getRoute(TestEventClass1)).toBeNull();
      expect(router.getRoute(TestEventClass2)).toBeNull();
    });

    it('should return configured route for existing event', () => {
      const router = FanoutRouter.create();
      const route: FanoutRoute = { queues: [{ name: 'queue-1' }, { name: 'queue-2' }, { name: 'queue-3' }] };
      const { class: TestEventClass } = createFanoutTask('test-event', { test: 'test' }, randomBullMqJobOptions());

      router.addRoute(TestEventClass, route);

      expect(router.getRoute(TestEventClass)).toEqual(route);
    });

    it('should return the configured route for each event class', () => {
      const router = FanoutRouter.create();
      const route1: FanoutRoute = { queues: [{ name: 'queue-a' }] };
      const route2: FanoutRoute = { queues: [{ name: 'queue-b' }, { name: 'queue-c' }] };

      const { class: TestEventClass1 } = createFanoutTask('test-event-1', { test: 'test1' }, randomBullMqJobOptions());
      const { class: TestEventClass2 } = createFanoutTask('test-event-2', { data: 123 }, randomBullMqJobOptions());
      const { class: TestEventClass3 } = createFanoutTask('test-event-3', { value: true }, randomBullMqJobOptions());

      router.addRoute(TestEventClass1, route1);
      router.addRoute(TestEventClass2, route2);

      expect(router.getRoute(TestEventClass1)).toEqual(route1);
      expect(router.getRoute(TestEventClass2)).toEqual(route2);
      expect(router.getRoute(TestEventClass3)).toBeNull();
    });

    it('should throw for route with duplicate queue names', () => {
      const router = FanoutRouter.create();
      const route: FanoutRoute = { queues: [{ name: 'queue-1' }, { name: 'queue-1' }, { name: 'queue-2' }] };
      const { class: TestEventClass } = createFanoutTask('test-event', { test: 'test' }, randomBullMqJobOptions());

      expect(() => router.addRoute(TestEventClass, route)).toThrowError(
        'Duplicate queue name in fanout route: queue-1',
      );
    });
  });

  describe('integration scenarios', () => {
    it('should resolve configured routes for multiple event classes', () => {
      const userEventsRoute: FanoutRoute = {
        queues: [{ name: 'user-queue' }, { name: 'audit-queue' }, { name: 'analytics-queue' }],
      };
      const orderEventsRoute: FanoutRoute = { queues: [{ name: 'order-queue' }, { name: 'inventory-queue' }] };
      const notificationRoute: FanoutRoute = {
        queues: [{ name: 'email-queue' }, { name: 'sms-queue' }, { name: 'push-queue' }],
      };

      const { class: UserEventClass } = createFanoutTask('user-event', { userId: 123 }, randomBullMqJobOptions());
      const { class: OrderEventClass } = createFanoutTask('order-event', { orderId: 456 }, randomBullMqJobOptions());
      const { class: NotificationEventClass } = createFanoutTask(
        'notification-event',
        { message: 'hello' },
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
      const route1: FanoutRoute = { queues: [{ name: 'queue-1' }] };
      const route2: FanoutRoute = { queues: [{ name: 'queue-2' }] };

      const { class: TestEventClass1 } = createFanoutTask('test-event-1', { test: 'test1' }, randomBullMqJobOptions());
      const { class: TestEventClass2 } = createFanoutTask('test-event-2', { test: 'test2' }, randomBullMqJobOptions());

      router.addRoute(TestEventClass1, route1);
      router.addRoute(TestEventClass2, route2);

      expect(router.getRoute(TestEventClass2)?.queues).not.toContain('modified-queue');
    });
  });
});
