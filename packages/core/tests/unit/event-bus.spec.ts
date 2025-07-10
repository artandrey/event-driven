import {
  BaseEventBus,
  BaseHandlerRegister,
  Event,
  EventBus,
  EventHandler,
  HandlerRegister,
  Publisher,
  Task,
  TaskProcessor,
} from 'packages/core/lib';

class TestEvent implements Event<object> {
  payload: Readonly<object>;
}

class TestTask implements Task<object> {
  payload: Readonly<object>;
}

class TestEventHandler implements EventHandler<TestEvent> {
  handle(): void {}
}

describe('EventBus Event Handling', () => {
  let eventBus: EventBus;
  let handlerRegister: HandlerRegister;
  const publisher: Publisher = {
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
    const handler = new TestEventHandler();
    const handlerSpy = vi.spyOn(handler, 'handle');
    handlerRegister.addHandler({ handles: TestEvent }, handler);

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
    handlerRegister.addScopedHandler({ handles: TestEvent }, ScopedHandler);

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
    handlerRegister.addScopedHandler({ handles: TestEvent }, ScopedHandler);

    await eventBus.synchronouslyConsumeByStrictlySingleHandler(new TestEvent());
    await eventBus.synchronouslyConsumeByStrictlySingleHandler(new TestEvent());

    expect(spy).toHaveBeenCalledTimes(2);
  });

  it('should throw error if consumed by single handler and no handler is found', async () => {
    await expect(eventBus.synchronouslyConsumeByStrictlySingleHandler(new TestEvent())).rejects.toThrow();
  });

  it('should throw error if consumed by single handler and multiple handlers are found', async () => {
    handlerRegister.addHandler({ handles: TestEvent }, new TestEventHandler());
    handlerRegister.addHandler({ handles: TestEvent }, new TestEventHandler());

    await expect(eventBus.synchronouslyConsumeByStrictlySingleHandler(new TestEvent())).rejects.toThrow();
  });

  it('should consume event by multiple handlers', async () => {
    const handler1 = new TestEventHandler();
    const handler2 = new TestEventHandler();
    const handlerSpy1 = vi.spyOn(handler1, 'handle');
    const handlerSpy2 = vi.spyOn(handler2, 'handle');
    handlerRegister.addHandler({ handles: TestEvent }, handler1);
    handlerRegister.addHandler({ handles: TestEvent }, handler2);

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
    const handler = new TestEventHandler();
    vi.spyOn(handler, 'handle').mockRejectedValue(new Error('Test error'));
    handlerRegister.addHandler({ handles: TestEvent }, handler);

    await expect(eventBus.synchronouslyConsumeByStrictlySingleHandler(new TestEvent())).rejects.toThrow();
  });

  // should we return errors instead of throwing them?
  // it may be hard to determine which handler threw an error in case of multiple handlers
  it('should throw error while synchronously consuming event by multiple handlers if handler throws error', async () => {
    const handler = new TestEventHandler();
    vi.spyOn(handler, 'handle').mockRejectedValue(new Error('Test error'));
    handlerRegister.addHandler({ handles: TestEvent }, handler);
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

    handlerRegister.addScopedHandler({ handles: TestEvent, routingMetadata: { v: 1 } }, ScopedHandler);
    handlerRegister.addScopedHandler({ handles: TestEvent }, ThirdPartyHandler);

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

    handlerRegister.addHandler({ handles: TestEvent, routingMetadata: { v: 1 } }, new ScopedHandler());
    handlerRegister.addHandler({ handles: TestEvent }, new ThirdPartyHandler());

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

    handlerRegister.addScopedHandler({ handles: TestEvent, routingMetadata: { v: 1 } }, ExpectedHandler1);
    handlerRegister.addScopedHandler({ handles: TestEvent, routingMetadata: { v: 1 } }, ExpectedHandler2);

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

    handlerRegister.addHandler({ handles: TestEvent, routingMetadata: { v: 1 } }, new ExpectedHandler1());
    handlerRegister.addHandler({ handles: TestEvent, routingMetadata: { v: 1 } }, new ExpectedHandler2());

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

describe('EventBus Task Processing', () => {
  let eventBus: EventBus;
  let handlerRegister: HandlerRegister;
  const publisher: Publisher = {
    publish: vi.fn(),
    publishAll: vi.fn(),
  };

  class SyncTaskProcessor implements TaskProcessor<TestTask, string> {
    handle(): string {
      return 'sync-result';
    }
  }

  class AsyncTaskProcessor implements TaskProcessor<TestTask, string> {
    handle(): Promise<string> {
      return Promise.resolve('async-result');
    }
  }

  beforeEach(() => {
    handlerRegister = new BaseHandlerRegister();
    const concreteEventBus = new BaseEventBus(handlerRegister);
    concreteEventBus.setPublisher(publisher);
    eventBus = concreteEventBus;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should retrieve result from sync TaskProcessor (singleton, single handler)', async () => {
    const processor = new SyncTaskProcessor();
    handlerRegister.addHandler({ handles: TestTask }, processor);
    const result = await eventBus.synchronouslyConsumeByStrictlySingleHandler(new TestTask());
    expect(result.result).toBe('sync-result');
  });

  it('should retrieve result from async TaskProcessor (singleton, single handler)', async () => {
    const processor = new AsyncTaskProcessor();
    handlerRegister.addHandler({ handles: TestTask }, processor);
    const result = await eventBus.synchronouslyConsumeByStrictlySingleHandler(new TestTask());
    expect(result.result).toBe('async-result');
  });

  it('should retrieve results from multiple sync TaskProcessors (singleton)', async () => {
    class ProcessorA implements TaskProcessor<TestTask, string> {
      handle(): string {
        return 'A';
      }
    }
    class ProcessorB implements TaskProcessor<TestTask, string> {
      handle(): string {
        return 'B';
      }
    }
    handlerRegister.addHandler({ handles: TestTask }, new ProcessorA());
    handlerRegister.addHandler({ handles: TestTask }, new ProcessorB());
    const results = await eventBus.synchronouslyConsumeByMultipleHandlers(new TestTask());
    expect(results.map((r) => r.result)).toContain('A');
    expect(results.map((r) => r.result)).toContain('B');
  });

  it('should retrieve results from multiple async TaskProcessors (singleton)', async () => {
    class ProcessorA implements TaskProcessor<TestTask, string> {
      handle(): Promise<string> {
        return Promise.resolve('A-async');
      }
    }
    class ProcessorB implements TaskProcessor<TestTask, string> {
      handle(): Promise<string> {
        return Promise.resolve('B-async');
      }
    }
    handlerRegister.addHandler({ handles: TestTask }, new ProcessorA());
    handlerRegister.addHandler({ handles: TestTask }, new ProcessorB());
    const results = await eventBus.synchronouslyConsumeByMultipleHandlers(new TestTask());
    // The results are promises, so we need to await them
    const awaited = await Promise.all(results.map((r) => r.result));
    expect(awaited).toContain('A-async');
    expect(awaited).toContain('B-async');
  });

  it('should retrieve result from sync TaskProcessor (scoped)', async () => {
    class ScopedSyncProcessor implements TaskProcessor<TestTask, string> {
      handle(): string {
        return 'scoped-sync';
      }
    }
    handlerRegister.addScopedHandler({ handles: TestTask }, ScopedSyncProcessor);
    const result = await eventBus.synchronouslyConsumeByStrictlySingleHandler(new TestTask());
    expect(result.result).toBe('scoped-sync');
  });

  it('should retrieve result from async TaskProcessor (scoped)', async () => {
    class ScopedAsyncProcessor implements TaskProcessor<TestTask, string> {
      handle(): Promise<string> {
        return Promise.resolve('scoped-async');
      }
    }
    handlerRegister.addScopedHandler({ handles: TestTask }, ScopedAsyncProcessor);
    const result = await eventBus.synchronouslyConsumeByStrictlySingleHandler(new TestTask());
    expect(result.result).toBe('scoped-async');
  });

  it('should throw if sync TaskProcessor throws (singleton)', async () => {
    class ThrowingProcessor implements TaskProcessor<TestTask, string> {
      handle(): string {
        throw new Error('sync error');
      }
    }
    handlerRegister.addHandler({ handles: TestTask }, new ThrowingProcessor());
    await expect(eventBus.synchronouslyConsumeByStrictlySingleHandler(new TestTask())).rejects.toThrow('sync error');
  });

  it('should throw if async TaskProcessor throws (singleton)', async () => {
    class ThrowingAsyncProcessor implements TaskProcessor<TestTask, string> {
      handle(): Promise<string> {
        return Promise.reject(new Error('async error'));
      }
    }
    handlerRegister.addHandler({ handles: TestTask }, new ThrowingAsyncProcessor());
    await expect(eventBus.synchronouslyConsumeByStrictlySingleHandler(new TestTask())).rejects.toThrow('async error');
  });

  it('should call singleton TaskProcessor with the correct task instance', async () => {
    const processor = new SyncTaskProcessor();
    const spy = vi.spyOn(processor, 'handle');
    const task = new TestTask();
    handlerRegister.addHandler({ handles: TestTask }, processor);
    await eventBus.synchronouslyConsumeByStrictlySingleHandler(task);
    expect(spy).toHaveBeenCalledWith(task);
  });

  it('should call scoped TaskProcessor with the correct task instance', async () => {
    class ScopedProcessor implements TaskProcessor<TestTask, string> {
      handle = vi.fn(() => 'scoped');
    }
    handlerRegister.addScopedHandler({ handles: TestTask }, ScopedProcessor);
    const task = new TestTask();
    await eventBus.synchronouslyConsumeByStrictlySingleHandler(task);
    const handlers = await handlerRegister.get({ handlable: task });
    const scopedInstance = handlers && handlers[0];
    expect(scopedInstance.handle).toHaveBeenCalledWith(task);
  });
});
