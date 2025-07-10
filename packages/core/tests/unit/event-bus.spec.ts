import {
  BaseEventBus,
  BaseHandlerRegister,
  Event,
  EventBus,
  EventHandler,
  EventPublisher,
  HandlerRegister,
} from 'packages/core/lib';

class TestEvent implements Event<object> {
  payload: Readonly<object>;
}

class TestHandler implements EventHandler<TestEvent> {
  handle(): void {}
}

describe('EventBus', () => {
  let eventBus: EventBus;
  let handlerRegister: HandlerRegister;
  const publisher: EventPublisher = {
    publish: vi.fn(),
    publishAll: vi.fn(),
  };

  beforeEach(() => {
    handlerRegister = new BaseHandlerRegister();
    const concreteEventBus = new BaseEventBus(handlerRegister);
    concreteEventBus.setPublisher(publisher);
    eventBus = concreteEventBus;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should publish event through publisher', async () => {
    eventBus.publish(new TestEvent());

    expect(publisher.publish).toHaveBeenCalledWith(new TestEvent());
  });

  it('should publish all events through publisher', async () => {
    eventBus.publishAll([new TestEvent(), new TestEvent()]);

    expect(publisher.publishAll).toHaveBeenCalledWith([new TestEvent(), new TestEvent()]);
  });

  it('should pass event to singleton handlers', async () => {
    const handler = new TestHandler();
    const handlerSpy = vi.spyOn(handler, 'handle');
    handlerRegister.addHandler({ event: TestEvent }, handler);

    await eventBus.synchronouslyConsumeByStrictlySingleHandler(new TestEvent());

    expect(handlerSpy).toHaveBeenCalledWith(new TestEvent());
  });

  it('should pass event to scoped handlers', async () => {
    const spy = vi.fn();
    class ScopedHandler implements EventHandler<TestEvent> {
      handle(event: TestEvent): void {
        spy(event);
      }
    }
    handlerRegister.addScopedHandler({ event: TestEvent }, ScopedHandler);

    await eventBus.synchronouslyConsumeByStrictlySingleHandler(new TestEvent());

    expect(spy).toHaveBeenCalledWith(new TestEvent());
  });

  it('should create new scoped handlers instances for each call', async () => {
    const spy = vi.fn();
    class ScopedHandler implements EventHandler<TestEvent> {
      handle(event: TestEvent): void {
        spy(event);
      }
    }
    handlerRegister.addScopedHandler({ event: TestEvent }, ScopedHandler);

    await eventBus.synchronouslyConsumeByStrictlySingleHandler(new TestEvent());
    await eventBus.synchronouslyConsumeByStrictlySingleHandler(new TestEvent());

    expect(spy).toHaveBeenCalledTimes(2);
  });

  it('should throw error if consumed by single handler and no handler is found', async () => {
    await expect(eventBus.synchronouslyConsumeByStrictlySingleHandler(new TestEvent())).rejects.toThrow();
  });

  it('should throw error if consumed by single handler and multiple handlers are found', async () => {
    handlerRegister.addHandler({ event: TestEvent }, new TestHandler());
    handlerRegister.addHandler({ event: TestEvent }, new TestHandler());

    await expect(eventBus.synchronouslyConsumeByStrictlySingleHandler(new TestEvent())).rejects.toThrow();
  });

  it('should consume event by multiple handlers', async () => {
    const handler1 = new TestHandler();
    const handler2 = new TestHandler();
    const handlerSpy1 = vi.spyOn(handler1, 'handle');
    const handlerSpy2 = vi.spyOn(handler2, 'handle');
    handlerRegister.addHandler({ event: TestEvent }, handler1);
    handlerRegister.addHandler({ event: TestEvent }, handler2);

    await eventBus.synchronouslyConsumeByMultipleHandlers(new TestEvent());

    expect(handlerSpy1).toHaveBeenCalledWith(new TestEvent());
    expect(handlerSpy2).toHaveBeenCalledWith(new TestEvent());
  });

  it('should throw error if consumed by multiple handlers and no handler is found', async () => {
    await expect(eventBus.synchronouslyConsumeByMultipleHandlers(new TestEvent())).rejects.toThrow();
  });

  // should we return error instead of throwing it
  // that would allow us to match behavior of multiple handlers scenario
  it('should throw error while synchronously consuming event by single handler if handler throws error', async () => {
    const handler = new TestHandler();
    vi.spyOn(handler, 'handle').mockRejectedValue(new Error('Test error'));
    handlerRegister.addHandler({ event: TestEvent }, handler);

    await expect(eventBus.synchronouslyConsumeByStrictlySingleHandler(new TestEvent())).rejects.toThrow();
  });

  // should we return errors instead of throwing them?
  // it may be hard to determine which handler threw an error in case of multiple handlers
  it('should throw error while synchronously consuming event by multiple handlers if handler throws error', async () => {
    const handler = new TestHandler();
    vi.spyOn(handler, 'handle').mockRejectedValue(new Error('Test error'));
    handlerRegister.addHandler({ event: TestEvent }, handler);
  });

  it('should pass event to scoped handlers with matching routing metadata', async () => {
    const expectedHandlerSpy = vi.fn();
    const thirdPartyHandlerSpy = vi.fn();
    class ScopedHandler implements EventHandler<TestEvent> {
      handle(event: TestEvent): void {
        expectedHandlerSpy(event);
      }
    }

    class ThirdPartyHandler implements EventHandler<TestEvent> {
      handle(event: TestEvent): void {
        thirdPartyHandlerSpy(event);
      }
    }

    handlerRegister.addScopedHandler({ event: TestEvent, routingMetadata: { v: 1 } }, ScopedHandler);
    handlerRegister.addScopedHandler({ event: TestEvent }, ThirdPartyHandler);

    await eventBus.synchronouslyConsumeByStrictlySingleHandler(new TestEvent(), {
      routingMetadata: { v: 1 },
    });

    expect(expectedHandlerSpy).toHaveBeenCalledWith(new TestEvent());
    expect(thirdPartyHandlerSpy).not.toHaveBeenCalled();
  });

  it('should pass event to singleton handlers with matching routing metadata', async () => {
    const expectedHandlerSpy = vi.fn();
    const thirdPartyHandlerSpy = vi.fn();
    class ScopedHandler implements EventHandler<TestEvent> {
      handle(event: TestEvent): void {
        expectedHandlerSpy(event);
      }
    }

    class ThirdPartyHandler implements EventHandler<TestEvent> {
      handle(event: TestEvent): void {
        thirdPartyHandlerSpy(event);
      }
    }

    handlerRegister.addHandler({ event: TestEvent, routingMetadata: { v: 1 } }, new ScopedHandler());
    handlerRegister.addHandler({ event: TestEvent }, new ThirdPartyHandler());

    await eventBus.synchronouslyConsumeByStrictlySingleHandler(new TestEvent(), {
      routingMetadata: { v: 1 },
    });

    expect(expectedHandlerSpy).toHaveBeenCalledWith(new TestEvent());
    expect(thirdPartyHandlerSpy).not.toHaveBeenCalled();
  });

  it('should pass event to multiple scoped handlers with matching routing metadata', async () => {
    const expectedHandlerSpy1 = vi.fn();
    const expectedHandlerSpy2 = vi.fn();

    class ExpectedHandler1 implements EventHandler<TestEvent> {
      handle(event: TestEvent): void {
        expectedHandlerSpy1(event);
      }
    }

    class ExpectedHandler2 implements EventHandler<TestEvent> {
      handle(event: TestEvent): void {
        expectedHandlerSpy2(event);
      }
    }

    handlerRegister.addScopedHandler({ event: TestEvent, routingMetadata: { v: 1 } }, ExpectedHandler1);
    handlerRegister.addScopedHandler({ event: TestEvent, routingMetadata: { v: 1 } }, ExpectedHandler2);

    await eventBus.synchronouslyConsumeByMultipleHandlers(new TestEvent(), {
      routingMetadata: { v: 1 },
    });

    expect(expectedHandlerSpy1).toHaveBeenCalledWith(new TestEvent());
    expect(expectedHandlerSpy2).toHaveBeenCalledWith(new TestEvent());
  });

  it('should pass event to multiple singleton handlers with matching routing metadata', async () => {
    const expectedHandlerSpy1 = vi.fn();
    const expectedHandlerSpy2 = vi.fn();

    class ExpectedHandler1 implements EventHandler<TestEvent> {
      handle(event: TestEvent): void {
        expectedHandlerSpy1(event);
      }
    }

    class ExpectedHandler2 implements EventHandler<TestEvent> {
      handle(event: TestEvent): void {
        expectedHandlerSpy2(event);
      }
    }

    handlerRegister.addHandler({ event: TestEvent, routingMetadata: { v: 1 } }, new ExpectedHandler1());
    handlerRegister.addHandler({ event: TestEvent, routingMetadata: { v: 1 } }, new ExpectedHandler2());

    await eventBus.synchronouslyConsumeByMultipleHandlers(new TestEvent(), {
      routingMetadata: { v: 1 },
    });

    expect(expectedHandlerSpy1).toHaveBeenCalledWith(new TestEvent());
    expect(expectedHandlerSpy2).toHaveBeenCalledWith(new TestEvent());
  });

  it('should pass context to singleton handlers', async () => {
    const handler = new TestHandler();
    const handlerSpy = vi.spyOn(handler, 'handle');
    const testContext = { test: 'test' };
    handlerRegister.addHandler({ event: TestEvent }, handler);

    await eventBus.synchronouslyConsumeByStrictlySingleHandler(new TestEvent(), {
      context: testContext,
    });

    expect(handlerSpy).toHaveBeenCalledWith(new TestEvent(), testContext);
  });

  it('should pass context to scoped handlers', async () => {
    const spy = vi.fn();
    const testContext = { test: 'test' };

    class ScopedHandler implements EventHandler<TestEvent> {
      constructor(private context?: any) {}

      handle(event: TestEvent, context?: any): void {
        spy(event, context, this.context);
      }
    }
    handlerRegister.addScopedHandler({ event: TestEvent }, ScopedHandler);

    await eventBus.synchronouslyConsumeByStrictlySingleHandler(new TestEvent(), {
      context: testContext,
    });

    expect(spy).toHaveBeenCalledWith(new TestEvent(), testContext, testContext);
  });
});
