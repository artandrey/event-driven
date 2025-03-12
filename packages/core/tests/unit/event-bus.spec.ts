import {
  BaseHandlerRegister,
  EventBus,
  IEvent,
  IEventBus,
  IEventHandler,
  IEventPublisher,
  IHandlerRegister,
} from 'packages/core/lib';

class TestEvent implements IEvent<object> {
  payload: Readonly<object>;
}

class TestHandler implements IEventHandler<TestEvent> {
  handle(): void {}
}

describe('EventBus', () => {
  let eventBus: IEventBus;
  let handlerRegister: IHandlerRegister;
  const publisher: IEventPublisher = {
    publish: vi.fn(),
    publishAll: vi.fn(),
  };

  beforeEach(() => {
    handlerRegister = new BaseHandlerRegister();
    const concreteEventBus = new EventBus(handlerRegister);
    concreteEventBus.publisher = publisher;
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
    handlerRegister.addHandler(TestEvent.name, handler);

    await eventBus.synchronouslyConsumeByStrictlySingleHandler(new TestEvent());

    expect(handlerSpy).toHaveBeenCalledWith(new TestEvent());
  });

  it('should pass event to scoped handlers', async () => {
    const spy = vi.fn();
    class ScopedHandler implements IEventHandler<TestEvent> {
      handle(event: TestEvent): void {
        spy(event);
      }
    }
    handlerRegister.addScopedHandler(TestEvent.name, ScopedHandler);

    await eventBus.synchronouslyConsumeByStrictlySingleHandler(new TestEvent());

    expect(spy).toHaveBeenCalledWith(new TestEvent());
  });

  it('should create new scoped handlers instances for each call', async () => {
    const spy = vi.fn();
    class ScopedHandler implements IEventHandler<TestEvent> {
      handle(event: TestEvent): void {
        spy(event);
      }
    }
    handlerRegister.addScopedHandler(TestEvent.name, ScopedHandler);

    await eventBus.synchronouslyConsumeByStrictlySingleHandler(new TestEvent());
    await eventBus.synchronouslyConsumeByStrictlySingleHandler(new TestEvent());

    expect(spy).toHaveBeenCalledTimes(2);
  });

  it('should throw error if consumed by single handler and no handler is found', async () => {
    await expect(eventBus.synchronouslyConsumeByStrictlySingleHandler(new TestEvent())).rejects.toThrow();
  });

  it('should throw error if consumed by single handler and multiple handlers are found', async () => {
    handlerRegister.addHandler(TestEvent.name, new TestHandler());
    handlerRegister.addHandler(TestEvent.name, new TestHandler());

    await expect(eventBus.synchronouslyConsumeByStrictlySingleHandler(new TestEvent())).rejects.toThrow();
  });

  it('should consume event by multiple handlers', async () => {
    const handler1 = new TestHandler();
    const handler2 = new TestHandler();
    const handlerSpy1 = vi.spyOn(handler1, 'handle');
    const handlerSpy2 = vi.spyOn(handler2, 'handle');
    handlerRegister.addHandler(TestEvent.name, handler1);
    handlerRegister.addHandler(TestEvent.name, handler2);

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
    handlerRegister.addHandler(TestEvent.name, handler);

    await expect(eventBus.synchronouslyConsumeByStrictlySingleHandler(new TestEvent())).rejects.toThrow();
  });

  // should we return errors instead of throwing them?
  // it may be hard to determine which handler threw an error in case of multiple handlers
  it('should throw error while synchronously consuming event by multiple handlers if handler throws error', async () => {
    const handler = new TestHandler();
    vi.spyOn(handler, 'handle').mockRejectedValue(new Error('Test error'));
    handlerRegister.addHandler(TestEvent.name, handler);
  });
});
