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

First, define your events by implementing the `IEvent` interface:

```typescript
import { IEvent } from '@event-driven-architecture/core';

interface IUserCreatedEventPayload {
  userId: string;
}

export class UserCreatedEvent implements IEvent<IUserCreatedEventPayload> {
  constructor(public readonly payload: IUserCreatedEventPayload) {}
}
```

### Creating Event Handlers

Next, create handlers for your events:

```typescript
import { IEventHandler } from '@event-driven-architecture/core';

import { UserCreatedEvent } from './events/user-created.event';

export class UserCreatedEventHandler implements IEventHandler<UserCreatedEvent> {
  handle(event: UserCreatedEvent): void {
    const { userId } = event.payload;
    // Handle the event
    console.log(`User created with ID: ${userId}`);
  }
}
```

### Handler Registration

Event handlers need to be registered with a handler register service. The implementation details depend on your application framework.

## Event Bus

### Publishing Events

To publish events, use the `IEventBus`:

```typescript
import { IEventBus } from '@event-driven-architecture/core';

import { UserCreatedEvent } from './events/user-created.event';

class UserService {
  constructor(private readonly eventBus: IEventBus) {}

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
import { IEventBus } from '@event-driven-architecture/core';

import { MyCustomPublisher } from './my-custom-publisher';

class AppBootstrap {
  constructor(
    private readonly eventBus: IEventBus,
    private readonly customPublisher: MyCustomPublisher,
  ) {}

  initialize() {
    // Set the publisher for the event bus
    this.eventBus.publisher = this.customPublisher;
  }
}
```

### Consuming Events Synchronously

The EventBus provides methods for consuming events synchronously:

```typescript
// Consume by a single handler (throws if multiple handlers exist)
await eventBus.synchronouslyConsumeByStrictlySingleHandler(new UserCreatedEvent({ userId: '123' }));

// Consume by multiple handlers
await eventBus.synchronouslyConsumeByMultipleHandlers(new UserCreatedEvent({ userId: '123' }));
```

## Core Definitions

The event-driven module provides several key definitions:

**Event (IEvent)** - Base interface for all events. Events are simple data structures that contain information about what happened in your application.

**Event Handler (IEventHandler)** - Interface for event handlers. Handlers contain the business logic that should be executed when a specific event occurs.

**Event Bus (IEventBus)** - Core interface for the event bus. The event bus is responsible for publishing events and routing them to the appropriate handlers.

**Event Publisher (IEventPublisher)** - Interface for publishing events to external systems. Publishers are responsible for sending events to external message brokers or other systems.

**Handler Register (IHandlerRegister)** - Interface for the handler register service. Responsible for registering handlers and retrieving handler signatures.

## Scoped Handlers with Context

You can create scoped handlers that receive context information:

```typescript
import { EventHandlerScope, IEventHandler } from '@event-driven-architecture/core';

import { UserCreatedEvent } from './events/user-created.event';

interface IEventContext {
  requestId: string;
}

export class ScopedUserCreatedEventHandler implements IEventHandler<UserCreatedEvent, IEventContext> {
  handle(event: UserCreatedEvent, context: IEventContext): void {
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
