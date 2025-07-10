# Event Driven Architecture / Core

The main purpose of this package is to provide core functionality for building event-driven architectures in TypeScript applications.
`EventBus` provides methods to make it possible to extend event routing for specific integrations and enable acknowledgement mechanisms for message brokers.

Starting from this version, the core package supports not only events but also tasks and any custom "handlable" objects through a generic abstraction system.

# Disclaimer

This package is still under development and the API may change in further releases.
Documentation may not cover all features.

- [Installation](#installation)
- [Core Concepts](#core-concepts)
- [Event Handlers](#event-handlers)
- [Task Processors](#task-processors)
- [Event Bus](#event-bus)
- [Core Definitions](#core-definitions)
- [Scoped Handlers with Context](#scoped-handlers-with-context)
- [Working with Results](#working-with-results)

## Installation

First, let's install the package using your preferred package manager:

```bash
# Using npm
npm install @event-driven-architecture/core

# Using yarn
yarn add @event-driven-architecture/core

# Using pnpm
pnpm add @event-driven-architecture/core

# Using bun
bun add @event-driven-architecture/core
```

## Core Concepts

The event-driven architecture is built around the concept of **Handlables** - objects that can be processed by handlers. The package provides two main implementations:

- **Events** - Represent things that have happened in your system
- **Tasks** - Represent work that needs to be done

### Handlable

All processable objects implement the `Handlable` interface:

```typescript
interface Handlable<TPayload extends object = object> {
  readonly payload: Readonly<TPayload>;
}
```

### Handler

The generic `Handler` interface processes any handlable and optionally returns a result:

```typescript
interface Handler<THandlable extends Handlable, TResult = unknown, TContext = unknown> {
  handle(handlable: THandlable, context?: TContext): TResult | Promise<TResult>;
}
```

## Event Handlers

### Creating Events

Events implement the `Event` interface, which extends `Handlable`:

```typescript
import { Event } from '@event-driven-architecture/core';

interface UserCreatedEventPayload {
  userId: string;
}

export class UserCreatedEvent implements Event<UserCreatedEventPayload> {
  constructor(public readonly payload: UserCreatedEventPayload) {}
}
```

### Creating Event Handlers

Event handlers implement the `EventHandler` interface:

```typescript
import { EventHandler } from '@event-driven-architecture/core';

import { UserCreatedEvent } from './events/user-created.event';

export class UserCreatedEventHandler implements EventHandler<UserCreatedEvent> {
  handle(event: UserCreatedEvent): void {
    const { userId } = event.payload;
    // Handle the event
    console.log(`User created with ID: ${userId}`);
  }
}
```

## Task Processors

### Creating Tasks

Tasks implement the `Task` interface, which also extends `Handlable`:

```typescript
import { Task } from '@event-driven-architecture/core';

interface CalculateOrderTotalPayload {
  orderId: string;
  items: Array<{ price: number; quantity: number }>;
}

export class CalculateOrderTotalTask implements Task<CalculateOrderTotalPayload> {
  constructor(public readonly payload: CalculateOrderTotalPayload) {}
}
```

### Creating Task Processors

Task processors implement the `TaskProcessor` interface and can return results:

```typescript
import { TaskProcessor } from '@event-driven-architecture/core';

import { CalculateOrderTotalTask } from './tasks/calculate-order-total.task';

interface OrderTotal {
  orderId: string;
  total: number;
}

export class CalculateOrderTotalProcessor implements TaskProcessor<CalculateOrderTotalTask, OrderTotal> {
  handle(task: CalculateOrderTotalTask): OrderTotal {
    const { orderId, items } = task.payload;
    const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

    return { orderId, total };
  }
}
```

### Handler Registration

Handlers are registered through an implementation of `HandlerRegister`. A handler is uniquely identified by:

1. The handlable class it processes (using `handles` property)
2. Optional **routing metadata** – a free-form object for differentiation

```typescript
// singleton handler (single instance provided by you)
handlerRegister.addHandler({ handles: UserCreatedEvent, routingMetadata: { v: 1 } }, new UserCreatedEventHandler());

// scoped / transient handler (register by class, a fresh instance created per invocation)
handlerRegister.addScopedHandler(
  { handles: CalculateOrderTotalTask }, // no metadata – acts as a catch-all
  CalculateOrderTotalProcessor,
);
```

## Event Bus

### Publisher Registration

**Important**: Before publishing events or tasks, you must register a publisher with the EventBus using the `setPublisher()` method. Attempting to publish without a registered publisher will throw a `PublisherNotSetException`.

### Publishing Events and Tasks

To publish handlables, use the `EventBus`:

```typescript
import { EventBus } from '@event-driven-architecture/core';

import { UserCreatedEvent } from './events/user-created.event';
import { CalculateOrderTotalTask } from './tasks/calculate-order-total.task';

class UserService {
  constructor(private readonly eventBus: EventBus) {}

  createUser(userId: string): void {
    // Business logic...

    // Publish event
    this.eventBus.publish(new UserCreatedEvent({ userId }));
  }
}

class OrderService {
  constructor(private readonly eventBus: EventBus) {}

  processOrder(orderId: string): void {
    // Publish task
    this.eventBus.publish(
      new CalculateOrderTotalTask({
        orderId,
        items: [{ price: 10, quantity: 2 }],
      }),
    );
  }
}
```

### Setting Up a Publisher

To use external message brokers, you need to set up a publisher that implements the `Publisher` interface:

```typescript
import { EventBus, Handlable, Publisher } from '@event-driven-architecture/core';

class MyCustomPublisher implements Publisher {
  publish<T extends Handlable>(handlable: T): void {
    // Send to message broker
    console.log('Publishing:', handlable);
  }

  publishAll(handlables: Handlable[]): void {
    // Send all to message broker
    console.log('Publishing all:', handlables);
  }
}

class AppBootstrap {
  constructor(
    private readonly eventBus: EventBus,
    private readonly customPublisher: MyCustomPublisher,
  ) {}

  initialize() {
    // Set the publisher for the event bus
    this.eventBus.setPublisher(this.customPublisher);
  }
}
```

## Working with Results

### Consuming Events and Tasks Synchronously

When processing handlables synchronously, the EventBus returns `HandlingResult` objects:

```typescript
// Single handler - returns HandlingResult<TResult>
const result = await eventBus.synchronouslyConsumeByStrictlySingleHandler(
  new CalculateOrderTotalTask({ orderId: '123', items: [{ price: 10, quantity: 2 }] }),
  { routingMetadata: { v: 1 } },
);

console.log('Order total:', result.result.total); // Access the result

// Multiple handlers - returns HandlingResult<TResult>[]
const results = await eventBus.synchronouslyConsumeByMultipleHandlers(new UserCreatedEvent({ userId: '123' }), {
  routingMetadata: { v: 1 },
});

results.forEach((result) => {
  console.log('Handler result:', result.result);
});
```

### Consuming with Context

When consuming handlables, you can pass a request-scoped context alongside routing metadata:

```typescript
const result = await eventBus.synchronouslyConsumeByStrictlySingleHandler(new UserCreatedEvent({ userId: '123' }), {
  routingMetadata: { v: 1 },
  context: { requestId: '456' },
});
```

## Core Definitions

The event-driven module provides several key definitions:

**Handlable** - Base interface for all processable objects. Contains a read-only payload with information.

**Event** - Specialization of Handlable that represents things that have happened in your application.

**Task** - Specialization of Handlable that represents work that needs to be done.

**Handler** - Generic interface for processing handlables. Can optionally return results and receive context.

**Event Handler (EventHandler)** - Specialization of Handler for processing events. Typically returns void.

**Task Processor (TaskProcessor)** - Specialization of Handler for processing tasks. Can return results.

**Event Bus (EventBus)** - Core interface for the event bus. Responsible for publishing handlables and routing them to appropriate handlers.

**Publisher** - Interface for publishing handlables to external systems. Must be registered with the EventBus using `setPublisher()`.

**Handler Register (HandlerRegister)** - Interface for registering handlers and retrieving handler signatures.

**HandlingResult** - Wrapper object returned by synchronous processing methods, containing the handler's result.

## Scoped Handlers with Context

You can create scoped handlers that receive context information:

```typescript
import { EventHandler, TaskProcessor } from '@event-driven-architecture/core';

import { UserCreatedEvent } from './events/user-created.event';
import { CalculateOrderTotalTask } from './tasks/calculate-order-total.task';

interface EventContext {
  requestId: string;
}

export class ScopedUserCreatedEventHandler implements EventHandler<UserCreatedEvent, EventContext> {
  handle(event: UserCreatedEvent, context: EventContext): void {
    // Access request context
    console.log('Request context:', context);

    // Handle the event with access to request context
    const { userId } = event.payload;
    console.log(`User created with ID: ${userId} in request: ${context.requestId}`);
  }
}

export class ScopedCalculateOrderTotalProcessor
  implements TaskProcessor<CalculateOrderTotalTask, OrderTotal, EventContext>
{
  handle(task: CalculateOrderTotalTask, context: EventContext): OrderTotal {
    console.log('Processing order in request:', context.requestId);

    const { orderId, items } = task.payload;
    const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

    return { orderId, total };
  }
}
```

## Putting it all together – Bootstrapping a minimal in-memory system

The snippet below shows how the main pieces plug together with the new API:

```typescript
import {
  BaseEventBus,
  BaseHandlerRegister,
  Event,
  EventBus,
  EventHandler,
  Handlable,
  HandlerRegister,
  Publisher,
  Task,
  TaskProcessor,
} from '@event-driven-architecture/core';

// 1. Define an event
export class UserCreatedEvent implements Event<{ userId: string }> {
  constructor(public readonly payload: { userId: string }) {}
}

// 2. Define a task
export class CalculateOrderTotalTask implements Task<{ orderId: string; total: number }> {
  constructor(public readonly payload: { orderId: string; total: number }) {}
}

// 3. Implement handlers
class UserCreatedHandler implements EventHandler<UserCreatedEvent> {
  handle(event: UserCreatedEvent): void {
    console.log('User created (v=1):', event.payload.userId);
  }
}

class OrderTotalProcessor implements TaskProcessor<CalculateOrderTotalTask, { calculatedTotal: number }> {
  handle(task: CalculateOrderTotalTask): { calculatedTotal: number } {
    console.log('Calculating total for order:', task.payload.orderId);
    return { calculatedTotal: task.payload.total * 1.1 }; // Add 10% tax
  }
}

// 4. Implement a publisher
const inMemoryPublisher: Publisher = {
  publish: (handlable) => console.log('Published', handlable),
  publishAll: (handlables) => console.log('Published many', handlables),
};

// 5. Wire everything together
const register: HandlerRegister = new BaseHandlerRegister();
register.addHandler({ handles: UserCreatedEvent, routingMetadata: { v: 1 } }, new UserCreatedHandler());
register.addHandler({ handles: CalculateOrderTotalTask }, new OrderTotalProcessor());

const eventBus = new BaseEventBus(register);
eventBus.setPublisher(inMemoryPublisher);

// 6. Emit and consume handlables
const event = new UserCreatedEvent({ userId: '1' });
const task = new CalculateOrderTotalTask({ orderId: 'order-1', total: 100 });

// Consume event (returns void in HandlingResult)
const eventResult = await eventBus.synchronouslyConsumeByStrictlySingleHandler(event, {
  routingMetadata: { v: 1 },
});
// log: User created (v=1): 1

// Consume task (returns calculated result in HandlingResult)
const taskResult = await eventBus.synchronouslyConsumeByStrictlySingleHandler(task);
console.log('Task result:', taskResult.result.calculatedTotal); // 110

// Or publish to forward to the configured publisher
eventBus.publish(event);
eventBus.publish(task);
```
