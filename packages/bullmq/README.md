# Event Driven Architecture / BullMQ

This package provides BullMQ integration for the [@event-driven-architecture/core](https://github.com/artandrey/event-driven) framework, enabling robust, queue-based event-driven processing in TypeScript applications.

## Key Principles

- **Event Agnostic Handlers:** Your application layer (event handlers) remains agnostic to the underlying message queue. All BullMQ-specific details are encapsulated in the event class.
- **Separation of Concerns:** Define queue, job options, and event names in the event class. Handlers only care about the event payload.

---

- [Installation](#installation)
- [Defining Events](#defining-events)
- [Creating Event Handlers](#creating-event-handlers)
- [Registering Events and Queues](#registering-events-and-queues)
- [Publishing Events](#publishing-events)
  - [Atomic vs Bulk Publishing](#atomic-vs-bulk-publishing)
- [Consuming Events](#consuming-events)
- [Handler Context](#handler-context)
- [Testing](#testing)
- [API Reference](#api-reference)

---

## Installation

```bash
npm install @event-driven-architecture/bullmq bullmq @event-driven-architecture/core
```

> **Note:** `bullmq` and `@event-driven-architecture/core` are peer dependencies and must be installed in your project.

---

## Defining Events

All BullMQ-specific details (queue name, event name, job options) are defined in the event class. This keeps handlers and the rest of your application agnostic to the transport layer.

```typescript
import { BullMqEvent } from '@event-driven-architecture/bullmq';

const QUEUE_NAME = 'user-queue';

export class UserCreatedEvent extends BullMqEvent<{ userId: string }> {
  constructor(payload: { userId: string }) {
    super(QUEUE_NAME, 'user-created', { attempts: 3 }, payload);
  }
}
```

---

## Creating Event Handlers

Handlers are completely decoupled from BullMQ. They only depend on the event type and its payload:

```typescript
import { IEventHandler } from '@event-driven-architecture/core';

import { UserCreatedEvent } from './events/user-created.event';

export class UserCreatedHandler implements IEventHandler<UserCreatedEvent> {
  handle(event: UserCreatedEvent) {
    // Business logic, unaware of MQ details
    console.log('User created:', event.payload.userId);
  }
}
```

---

## Registering Events and Queues

Register your event classes and queues so the system can resolve and route events correctly.

```typescript
import { EventsRegisterService, QueueRegisterService } from '@event-driven-architecture/bullmq';
import { Queue } from 'bullmq';

const eventsRegisterService = new EventsRegisterService();
eventsRegisterService.register(UserCreatedEvent);

const queueRegisterService = new QueueRegisterService();
const userQueue = new Queue('user-queue', { connection: { host: 'localhost', port: 6379 } });
queueRegisterService.add(userQueue);
```

---

## Publishing Events

You can publish events using either atomic or bulk strategies. Both are event-agnostic from the handler's perspective.

### Atomic vs Bulk Publishing

- **AtomicBullMqEventPublisher**: Adds each event/job to the queue individually. If one job fails, others still succeed. Use this for reliability when partial success is acceptable.
- **BulkBullMqEventPublisher**: Uses BullMQ's `addBulk` for efficiency. All jobs are added in a single operation, but if one fails, all fail. Use this for high-throughput scenarios where atomicity is not critical.

#### Example: Atomic Publishing

```typescript
import { AtomicBullMqEventPublisher } from '@event-driven-architecture/bullmq';

const eventPublisher = new AtomicBullMqEventPublisher(queueRegisterService);
const event = new UserCreatedEvent({ userId: '123' });
eventPublisher.publish(event);
```

#### Example: Bulk Publishing

```typescript
import { BulkBullMqEventPublisher } from '@event-driven-architecture/bullmq';

const bulkPublisher = new BulkBullMqEventPublisher(queueRegisterService);
bulkPublisher.publishAll([new UserCreatedEvent({ userId: '1' }), new UserCreatedEvent({ userId: '2' })]);
```

---

## Consuming Events

Set up a consumer to process events from the queue and dispatch them to your event bus. The consumer is responsible for mapping BullMQ jobs to your event classes and invoking the appropriate handlers via the event bus.

```typescript
import { BullMqEventConsumerService, WorkerRegisterService, WorkerService } from '@event-driven-architecture/bullmq';
import { IEventBus } from '@event-driven-architecture/core';

const workerRegisterService = new WorkerRegisterService();
const workerService = new WorkerService(workerRegisterService);

const consumer = new BullMqEventConsumerService(
  workerRegisterService,
  queueRegisterService,
  eventsRegisterService,
  [
    {
      queueName: 'user-queue',
      workerOptions: { connection: { host: 'localhost', port: 6379 } },
    },
  ],
  workerService,
  eventBus, // Your implementation of IEventBus
);

consumer.init();
```

---

## Handler Context

When an event is consumed, your handler can receive additional context (such as the BullMQ job, worker, and queue) if you define your handler to accept it:

```typescript
import { BullMqHandlerContext } from '@event-driven-architecture/bullmq';
import { IEventHandler } from '@event-driven-architecture/core';

import { UserCreatedEvent } from './events/user-created.event';

export class UserCreatedHandler implements IEventHandler<UserCreatedEvent, BullMqHandlerContext> {
  handle(event: UserCreatedEvent, context: BullMqHandlerContext) {
    console.log('Job ID:', context.job.id);
    // ...
  }
}
```
