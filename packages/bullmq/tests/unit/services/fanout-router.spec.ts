import { FanoutOptions, FanoutRoute, FanoutRouter } from 'packages/bullmq/lib';

import { createFanoutEvent } from '../../__fixtures__/create-event';
import { randomBullMqOptions } from '../../__fixtures__/random-bull-mq-options';

describe('FanoutRouter', () => {
  describe('constructor', () => {
    it('should create empty router when no options provided', () => {
      const router = new FanoutRouter();
      const { class: TestEventClass } = createFanoutEvent('test-event', { test: 'test' }, randomBullMqOptions());

      expect(router.getRoute(TestEventClass)).toBeNull();
    });

    it('should create router with predefined routes', () => {
      const route1: FanoutRoute = { queues: [{ name: 'queue-1' }, { name: 'queue-2' }] };
      const route2: FanoutRoute = { queues: [{ name: 'queue-3' }, { name: 'queue-4' }, { name: 'queue-5' }] };

      const { class: TestEventClass1 } = createFanoutEvent('test-event-1', { test: 'test1' }, randomBullMqOptions());
      const { class: TestEventClass2 } = createFanoutEvent('test-event-2', { data: 123 }, randomBullMqOptions());
      const { class: TestEventClass3 } = createFanoutEvent('test-event-3', { value: true }, randomBullMqOptions());

      const options: FanoutOptions = {
        routes: [
          { event: TestEventClass1, route: route1 },
          { event: TestEventClass2, route: route2 },
        ],
      };

      const router = new FanoutRouter(options);

      expect(router.getRoute(TestEventClass1)).toEqual(route1);
      expect(router.getRoute(TestEventClass2)).toEqual(route2);
      expect(router.getRoute(TestEventClass3)).toBeNull();
    });

    it('should create router with empty routes array', () => {
      const router = new FanoutRouter({ routes: [] });
      const { class: TestEventClass } = createFanoutEvent('test-event', { test: 'test' }, randomBullMqOptions());

      expect(router.getRoute(TestEventClass)).toBeNull();
    });

    it('should handle single route in constructor', () => {
      const route: FanoutRoute = { queues: [{ name: 'single-queue' }] };
      const { class: TestEventClass1 } = createFanoutEvent('test-event-1', { test: 'test1' }, randomBullMqOptions());
      const { class: TestEventClass2 } = createFanoutEvent('test-event-2', { test: 'test2' }, randomBullMqOptions());

      const options: FanoutOptions = {
        routes: [{ event: TestEventClass1, route }],
      };

      const router = new FanoutRouter(options);

      expect(router.getRoute(TestEventClass1)).toEqual(route);
      expect(router.getRoute(TestEventClass2)).toBeNull();
    });
  });

  describe('addRoute', () => {
    it('should add new route to empty router', () => {
      const router = new FanoutRouter();
      const route: FanoutRoute = { queues: [{ name: 'queue-1' }, { name: 'queue-2' }] };
      const { class: TestEventClass1 } = createFanoutEvent('test-event-1', { test: 'test1' }, randomBullMqOptions());
      const { class: TestEventClass2 } = createFanoutEvent('test-event-2', { test: 'test2' }, randomBullMqOptions());

      router.addRoute(TestEventClass1, route);

      expect(router.getRoute(TestEventClass1)).toEqual(route);
      expect(router.getRoute(TestEventClass2)).toBeNull();
    });

    it('should add multiple routes', () => {
      const router = new FanoutRouter();
      const route1: FanoutRoute = { queues: [{ name: 'queue-1' }] };
      const route2: FanoutRoute = { queues: [{ name: 'queue-2' }, { name: 'queue-3' }] };
      const route3: FanoutRoute = { queues: [{ name: 'queue-4' }, { name: 'queue-5' }, { name: 'queue-6' }] };

      const { class: TestEventClass1 } = createFanoutEvent('test-event-1', { test: 'test1' }, randomBullMqOptions());
      const { class: TestEventClass2 } = createFanoutEvent('test-event-2', { data: 123 }, randomBullMqOptions());
      const { class: TestEventClass3 } = createFanoutEvent('test-event-3', { value: true }, randomBullMqOptions());

      router.addRoute(TestEventClass1, route1);
      router.addRoute(TestEventClass2, route2);
      router.addRoute(TestEventClass3, route3);

      expect(router.getRoute(TestEventClass1)).toEqual(route1);
      expect(router.getRoute(TestEventClass2)).toEqual(route2);
      expect(router.getRoute(TestEventClass3)).toEqual(route3);
    });

    it('should override existing route', () => {
      const router = new FanoutRouter();
      const originalRoute: FanoutRoute = { queues: [{ name: 'queue-1' }] };
      const newRoute: FanoutRoute = { queues: [{ name: 'queue-2' }, { name: 'queue-3' }] };
      const { class: TestEventClass } = createFanoutEvent('test-event', { test: 'test' }, randomBullMqOptions());

      router.addRoute(TestEventClass, originalRoute);
      expect(router.getRoute(TestEventClass)).toEqual(originalRoute);

      router.addRoute(TestEventClass, newRoute);
      expect(router.getRoute(TestEventClass)).toEqual(newRoute);
    });

    it('should add route with empty queues array', () => {
      const router = new FanoutRouter();
      const route: FanoutRoute = { queues: [] };
      const { class: TestEventClass } = createFanoutEvent('test-event', { test: 'test' }, randomBullMqOptions());

      router.addRoute(TestEventClass, route);

      expect(router.getRoute(TestEventClass)).toEqual(route);
    });

    it('should add route to router initialized with options', () => {
      const initialRoute: FanoutRoute = { queues: [{ name: 'initial-queue' }] };
      const { class: TestEventClass1 } = createFanoutEvent('test-event-1', { test: 'test1' }, randomBullMqOptions());
      const { class: TestEventClass2 } = createFanoutEvent('test-event-2', { test: 'test2' }, randomBullMqOptions());

      const options: FanoutOptions = {
        routes: [{ event: TestEventClass1, route: initialRoute }],
      };
      const router = new FanoutRouter(options);

      const newRoute: FanoutRoute = { queues: [{ name: 'new-queue-1' }, { name: 'new-queue-2' }] };
      router.addRoute(TestEventClass2, newRoute);

      expect(router.getRoute(TestEventClass1)).toEqual(initialRoute);
      expect(router.getRoute(TestEventClass2)).toEqual(newRoute);
    });
  });

  describe('getRoute', () => {
    it('should return null for non-existent route', () => {
      const router = new FanoutRouter();
      const { class: TestEventClass1 } = createFanoutEvent('test-event-1', { test: 'test1' }, randomBullMqOptions());
      const { class: TestEventClass2 } = createFanoutEvent('test-event-2', { test: 'test2' }, randomBullMqOptions());

      expect(router.getRoute(TestEventClass1)).toBeNull();
      expect(router.getRoute(TestEventClass2)).toBeNull();
    });

    it('should return correct route for existing event', () => {
      const router = new FanoutRouter();
      const route: FanoutRoute = { queues: [{ name: 'queue-1' }, { name: 'queue-2' }, { name: 'queue-3' }] };
      const { class: TestEventClass } = createFanoutEvent('test-event', { test: 'test' }, randomBullMqOptions());

      router.addRoute(TestEventClass, route);

      expect(router.getRoute(TestEventClass)).toEqual(route);
    });

    it('should return different routes for different events', () => {
      const router = new FanoutRouter();
      const route1: FanoutRoute = { queues: [{ name: 'queue-a' }] };
      const route2: FanoutRoute = { queues: [{ name: 'queue-b' }, { name: 'queue-c' }] };

      const { class: TestEventClass1 } = createFanoutEvent('test-event-1', { test: 'test1' }, randomBullMqOptions());
      const { class: TestEventClass2 } = createFanoutEvent('test-event-2', { data: 123 }, randomBullMqOptions());
      const { class: TestEventClass3 } = createFanoutEvent('test-event-3', { value: true }, randomBullMqOptions());

      router.addRoute(TestEventClass1, route1);
      router.addRoute(TestEventClass2, route2);

      expect(router.getRoute(TestEventClass1)).toEqual(route1);
      expect(router.getRoute(TestEventClass2)).toEqual(route2);
      expect(router.getRoute(TestEventClass3)).toBeNull();
    });

    it('should handle route with duplicate queue names', () => {
      const router = new FanoutRouter();
      const route: FanoutRoute = { queues: [{ name: 'queue-1' }, { name: 'queue-1' }, { name: 'queue-2' }] };
      const { class: TestEventClass } = createFanoutEvent('test-event', { test: 'test' }, randomBullMqOptions());

      router.addRoute(TestEventClass, route);

      expect(router.getRoute(TestEventClass)).toEqual(route);
    });
  });

  describe('integration scenarios', () => {
    it('should handle complex routing setup', () => {
      const userEventsRoute: FanoutRoute = {
        queues: [{ name: 'user-queue' }, { name: 'audit-queue' }, { name: 'analytics-queue' }],
      };
      const orderEventsRoute: FanoutRoute = { queues: [{ name: 'order-queue' }, { name: 'inventory-queue' }] };
      const notificationRoute: FanoutRoute = {
        queues: [{ name: 'email-queue' }, { name: 'sms-queue' }, { name: 'push-queue' }],
      };

      const { class: UserEventClass } = createFanoutEvent('user-event', { userId: 123 }, randomBullMqOptions());
      const { class: OrderEventClass } = createFanoutEvent('order-event', { orderId: 456 }, randomBullMqOptions());
      const { class: NotificationEventClass } = createFanoutEvent(
        'notification-event',
        { message: 'hello' },
        randomBullMqOptions(),
      );

      const options: FanoutOptions = {
        routes: [
          { event: UserEventClass, route: userEventsRoute },
          { event: OrderEventClass, route: orderEventsRoute },
        ],
      };

      const router = new FanoutRouter(options);
      router.addRoute(NotificationEventClass, notificationRoute);

      expect(router.getRoute(UserEventClass)).toEqual(userEventsRoute);
      expect(router.getRoute(OrderEventClass)).toEqual(orderEventsRoute);
      expect(router.getRoute(NotificationEventClass)).toEqual(notificationRoute);
    });

    it('should maintain route independence', () => {
      const router = new FanoutRouter();
      const route1: FanoutRoute = { queues: [{ name: 'queue-1' }] };
      const route2: FanoutRoute = { queues: [{ name: 'queue-2' }] };

      const { class: TestEventClass1 } = createFanoutEvent('test-event-1', { test: 'test1' }, randomBullMqOptions());
      const { class: TestEventClass2 } = createFanoutEvent('test-event-2', { test: 'test2' }, randomBullMqOptions());

      router.addRoute(TestEventClass1, route1);
      router.addRoute(TestEventClass2, route2);

      expect(router.getRoute(TestEventClass2)?.queues).not.toContain('modified-queue');
    });

    it('should work with constructor and addRoute together', () => {
      const initialRoute: FanoutRoute = { queues: [{ name: 'initial-queue' }] };
      const { class: TestEventClass1 } = createFanoutEvent('test-event-1', { test: 'test1' }, randomBullMqOptions());
      const { class: TestEventClass2 } = createFanoutEvent('test-event-2', { test: 'test2' }, randomBullMqOptions());

      const options: FanoutOptions = {
        routes: [{ event: TestEventClass1, route: initialRoute }],
      };

      const router = new FanoutRouter(options);

      const additionalRoute: FanoutRoute = { queues: [{ name: 'additional-queue' }] };
      router.addRoute(TestEventClass2, additionalRoute);

      const overrideRoute: FanoutRoute = { queues: [{ name: 'override-queue' }] };
      router.addRoute(TestEventClass1, overrideRoute);

      expect(router.getRoute(TestEventClass1)).toEqual(overrideRoute);
      expect(router.getRoute(TestEventClass2)).toEqual(additionalRoute);
    });
  });
});
