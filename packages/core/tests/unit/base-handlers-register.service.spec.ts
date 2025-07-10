import { BaseHandlerRegister, Event, HandlerRegister } from 'packages/core/lib';

class TestHandler {
  handle(): Promise<void> {
    return Promise.resolve();
  }
}

class TestEvent implements Event<object> {
  payload: Readonly<object>;
}

const createHandlerWithFixedName = () => {
  return class WithFixedName {
    handle(): Promise<void> {
      return Promise.resolve();
    }
  };
};

describe('BaseHandlersRegisterService', () => {
  let service: HandlerRegister;

  beforeEach(() => {
    service = new BaseHandlerRegister();
  });

  it('should store all handlers by instances', async () => {
    service.addHandler({ handles: TestEvent }, new TestHandler());
    service.addHandler({ handles: TestEvent }, new TestHandler());

    const handlers = await service.get({ handlable: new TestEvent() });
    expect(handlers).toHaveLength(2);
  });

  it('should store only one scoped handler per class', async () => {
    service.addScopedHandler({ handles: TestEvent }, TestHandler);
    service.addScopedHandler({ handles: TestEvent }, TestHandler);

    const handlers = await service.get({ handlable: new TestEvent() });
    expect(handlers).toHaveLength(1);
  });

  it('should store scoped handlers by class identity', async () => {
    const handlerA = createHandlerWithFixedName();
    const handlerB = createHandlerWithFixedName();

    service.addScopedHandler({ handles: TestEvent }, handlerA);
    service.addScopedHandler({ handles: TestEvent }, handlerB);

    const handlers = await service.get({ handlable: new TestEvent() });
    expect(handlers).toHaveLength(2);
    expect(handlers.find((handler) => handler instanceof handlerA)).toBeDefined();
    expect(handlers.find((handler) => handler instanceof handlerB)).toBeDefined();
  });

  it('should add handler by signature', () => {
    service.addHandler(
      {
        handles: TestEvent,
      },
      new TestHandler(),
    );

    expect(service.getHandlerSignatures()).toEqual([{ handles: TestEvent }]);
  });

  it('should add scoped handler by signature with metadata', () => {
    service.addHandler(
      {
        handles: TestEvent,
        routingMetadata: {
          name: 'test',
        },
      },
      new TestHandler(),
    );

    expect(service.getHandlerSignatures()).toEqual([{ handles: TestEvent, routingMetadata: { name: 'test' } }]);
  });
});
