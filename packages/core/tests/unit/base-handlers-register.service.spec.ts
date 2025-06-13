import { BaseHandlerRegister, IEvent, IHandlerRegister } from 'packages/core/lib';

class TestHandler {
  handle(): Promise<void> {
    return Promise.resolve();
  }
}

class TestEvent implements IEvent<object> {
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
  let service: IHandlerRegister;

  beforeEach(() => {
    service = new BaseHandlerRegister();
  });

  it('should store all handlers by instances', async () => {
    service.addHandler(TestEvent.name, new TestHandler());
    service.addHandler(TestEvent.name, new TestHandler());

    const handlers = await service.get(new TestEvent());
    expect(handlers).toHaveLength(2);
  });

  it('should store only one scoped handler per class', async () => {
    service.addScopedHandler(TestEvent.name, TestHandler);
    service.addScopedHandler(TestEvent.name, TestHandler);

    const handlers = await service.get(new TestEvent());
    expect(handlers).toHaveLength(1);
  });

  it('should store scoped handlers by class identity', async () => {
    const handlerA = createHandlerWithFixedName();
    const handlerB = createHandlerWithFixedName();

    service.addScopedHandler(TestEvent.name, handlerA);
    service.addScopedHandler(TestEvent.name, handlerB);

    const handlers = await service.get(new TestEvent());
    expect(handlers).toHaveLength(2);
    expect(handlers.find((handler) => handler instanceof handlerA)).toBeDefined();
    expect(handlers.find((handler) => handler instanceof handlerB)).toBeDefined();
  });

  it('should add handler by signature', () => {
    service.addHandlerSignature({
      event: TestEvent,
    });

    expect(service.getHandlerSignatures()).toEqual([{ event: TestEvent }]);
  });

  it('should add scoped handler by signature with metadata', () => {
    service.addHandlerSignature({
      event: TestEvent,
      metadata: {
        name: 'test',
      },
    });

    expect(service.getHandlerSignatures()).toEqual([{ event: TestEvent, metadata: { name: 'test' } }]);
  });
});
