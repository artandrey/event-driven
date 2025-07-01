# Event Driven Architecture / Core

The main purpose of this package is to provide core functionality for building event-driven architectures in TypeScript applications.
`EventBus` provides methods to make it possible to extend event routing for specific integrations and enable acknowledgement mechanisms for message brokers.

# Disclaimer

This package is still under development and the API may change in further releases.
Documentation may not cover all features.

- [Installation](#installation)
- [Event Handlers](#event-handlers)
- [Event Bus](#event-bus)
- [Core Definitions](#core-definitions)
- [Scoped Handlers with Context](#scoped-handlers-with-context)

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

## Event Handlers

### Creating Events

First, define your events by implementing the `Event` interface:

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

Next, create handlers for your events:

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

### Handler Registration

Handlers are registered through an implementation of `HandlerRegister`. A handler is uniquely identified by two things:

1. The event class it listens for.
2. Optional **routing metadata** – a free-form object that lets you differentiate handlers listening to the _same_ event class.

This enables scenarios like multi-tenant routing, versioned events, feature flags, and so on.

```typescript
// singleton handler (single instance provided by you)
handlerRegister.addHandler({ event: UserCreatedEvent, routingMetadata: { v: 1 } }, new UserCreatedEventHandler());

// scoped / transient handler (register by class, a fresh instance created per invocation)
handlerRegister.addScopedHandler(
  { event: UserCreatedEvent }, // no metadata – acts as a catch-all
  UserCreatedEventHandler,
);
```

## Event Bus

### Publishing Events

To publish events, use the `EventBus`:

```typescript
import { EventBus } from '@event-driven-architecture/core';

import { UserCreatedEvent } from './events/user-created.event';

class UserService {
  constructor(private readonly eventBus: EventBus) {}

  createUser(userId: string): void {
    // Business logic...

    // Publish event
    this.eventBus.publish(new UserCreatedEvent({ userId }));
  }
}
```

### Setting Up a Publisher

To use external message brokers, you need to set up a publisher:

```typescript
import { EventBus } from '@event-driven-architecture/core';

import { MyCustomPublisher } from './my-custom-publisher';

class AppBootstrap {
  constructor(
    private readonly eventBus: EventBus,
    private readonly customPublisher: MyCustomPublisher,
  ) {}

  initialize() {
    // Set the publisher for the event bus
    this.eventBus.publisher = this.customPublisher;
  }
}
```

### Consuming Events Synchronously

When an event is consumed, you can (optionally) provide the same routing metadata to target specific handlers:

```typescript
await eventBus.synchronouslyConsumeByStrictlySingleHandler(new UserCreatedEvent({ userId: '123' }), {
  routingMetadata: { v: 1 },
});

await eventBus.synchronouslyConsumeByMultipleHandlers(new UserCreatedEvent({ userId: '123' }), {
  routingMetadata: { v: 1 },
});
```

When consuming events, you can also pass a request-scoped context alongside routing metadata:

```typescript
await eventBus.synchronouslyConsumeByStrictlySingleHandler(new UserCreatedEvent({ userId: '123' }), {
  routingMetadata: { v: 1 },
  context: { requestId: '456' },
});
```

## Core Definitions

The event-driven module provides several key definitions:

**Event (Event)** - Base interface for all events. Events are simple data structures that contain information about what happened in your application.

**Event Handler (EventHandler)** - Interface for event handlers. Handlers contain the business logic that should be executed when a specific event occurs.

**Event Bus (EventBus)** - Core interface for the event bus. The event bus is responsible for publishing events and routing them to the appropriate handlers.

**Event Publisher (EventPublisher)** - Interface for publishing events to external systems. Publishers are responsible for sending events to external message brokers or other systems.

**Handler Register (HandlerRegister)** - Interface for the handler register service. Responsible for registering handlers and retrieving handler signatures.

## Scoped Handlers with Context

You can create scoped handlers that receive context information:

```typescript
import { EventHandler, EventHandlerScope } from '@event-driven-architecture/core';

import { UserCreatedEvent } from './events/user-created.event';

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
```

When consuming events, you can pass context:

```typescript
await eventBus.synchronouslyConsumeByStrictlySingleHandler(new UserCreatedEvent({ userId: '123' }), {
  context: { requestId: '456' },
});
```

## Putting it all together – Bootstrapping a minimal in-memory event system

The snippet below mirrors the setup used in the test suite and shows how the main pieces plug together.

```typescript
import {
  BaseEventBus,
  BaseHandlerRegister,
  Event,
  EventBus,
  EventHandler,
  EventPublisher,
  HandlerRegister,
} from '@event-driven-architecture/core';

// 1. Define an event
export class UserCreatedEvent implements Event<{ userId: string }> {
  constructor(public readonly payload: { userId: string }) {}
}

// 2. Implement a handler
class UserCreatedHandler implements EventHandler<UserCreatedEvent> {
  handle(event: UserCreatedEvent): void {
    console.log('User created (v=1):', event.payload.userId);
  }
}

// 3. Optional: implement a publisher (here we stub it)
const inMemoryPublisher: EventPublisher = {
  publish: (event) => console.log('Published', event),
  publishAll: (events) => console.log('Published many', events),
};

// 4. Wire everything together
const register: HandlerRegister = new BaseHandlerRegister();
register.addHandler({ event: UserCreatedEvent, routingMetadata: { v: 1 } }, new UserCreatedHandler());

const eventBus = new BaseEventBus(register);
eventBus.publisher = inMemoryPublisher;

// 5. Emit and consume an event
const event = new UserCreatedEvent({ userId: '1' });

await eventBus.synchronouslyConsumeByStrictlySingleHandler(event, {
  routingMetadata: { v: 1 },
});
// log: User created (v=1): 1 from UserCreatedHandler

// Or publish to forward it to the configured publisher
eventBus.publish(event);
```
