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
- [Flow Job Processing](#flow-job-processing)

---

## Installation

```bash
# Using npm
npm install @event-driven-architecture/bullmq bullmq @event-driven-architecture/core

# Using yarn
yarn add @event-driven-architecture/bullmq bullmq @event-driven-architecture/core

# Using pnpm
pnpm add @event-driven-architecture/bullmq bullmq @event-driven-architecture/core

# Using bun
bun add @event-driven-architecture/bullmq bullmq @event-driven-architecture/core
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
    super({
      queueName: QUEUE_NAME,
      name: 'user-created',
      jobOptions: { attempts: 3 },
      payload,
    });
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

---

## Flow Job Processing

BullMQ supports "flow jobs"—hierarchies of jobs with parent/child relationships. This package provides a way to define, publish, and consume such flows using the `BullMqFlowEvent` class.

> **Note:** Sub-events (children) may also be instances of `BullMqFlowEvent`, allowing for deeply nested flow hierarchies.

### Defining Flow Events

Always use named interfaces for event payloads to ensure type safety and clarity.

```typescript
import { BullMqEvent, BullMqFlowEvent } from '@event-driven-architecture/bullmq';

const MAIN_QUEUE = 'main-queue';
const SUB_QUEUE = 'sub-queue';

interface SubEventPayload {
  sub: string;
}

interface FlowEventPayload {
  main: string;
  sub: string;
}

class SubEvent extends BullMqEvent<SubEventPayload> {
  constructor(payload: SubEventPayload) {
    super({
      queueName: SUB_QUEUE,
      name: 'sub-event',
      jobOptions: { attempts: 3 },
      payload,
    });
  }
}

class FlowEvent extends BullMqFlowEvent<FlowEventPayload> {
  constructor(payload: FlowEventPayload) {
    super({
      queueName: MAIN_QUEUE,
      name: 'flow-event',
      jobOptions: { attempts: 3 },
      payload,
      children: [new SubEvent({ sub: payload.sub })],
    });
  }
}
```

#### Example: Nested Flow Events

```typescript
interface SubFlowEventPayload {
  sub: string;
}

class SubFlowEvent extends BullMqFlowEvent<SubFlowEventPayload> {
  constructor(payload: SubFlowEventPayload) {
    super({
      queueName: SUB_QUEUE,
      name: 'sub-flow-event',
      jobOptions: { attempts: 3 },
      payload,
    });
  }
}

class MainFlowEvent extends BullMqFlowEvent<FlowEventPayload> {
  constructor(payload: FlowEventPayload) {
    super({
      queueName: MAIN_QUEUE,
      name: 'main-flow-event',
      jobOptions: { attempts: 3 },
      payload,
      children: [new SubFlowEvent({ sub: payload.sub })],
    });
  }
}
```

### Publishing Flow Events

To publish a flow event, use a publisher (atomic or bulk) and provide a `FlowRegisterService`:

```typescript
import { AtomicBullMqEventPublisher, FlowRegisterService } from '@event-driven-architecture/bullmq';
import { FlowProducer } from 'bullmq';

const flowRegisterService = new FlowRegisterService();
flowRegisterService.addSingleton(new FlowProducer({ connection: { host: 'localhost', port: 6379 } }));

const publisher = new AtomicBullMqEventPublisher(queueRegisterService, flowRegisterService);
publisher.publish(new FlowEvent({ main: 'main', sub: 'sub' }));
```

### Consuming Flow Events

When a flow event is consumed, only the parent event's payload is deserialized by default. **Children are not automatically fetched or deserialized for performance reasons.** If you need to access children, you must fetch them manually from BullMQ using the job's ID or other metadata.

This design ensures that handlers remain event-agnostic and only deal with the event payload unless they explicitly need to process children.

#### Example: Handler for a Flow Event

```typescript
import { BullMqHandlerContext } from '@event-driven-architecture/bullmq';
import { IEventHandler } from '@event-driven-architecture/core';

import { FlowEvent } from './events/flow-event';

export class FlowEventHandler implements IEventHandler<FlowEvent, BullMqHandlerContext> {
  async handle(event: FlowEvent, context: BullMqHandlerContext) {}
}
```

### Why Children Are Not Fetched by Default

Fetching children for every flow job can be expensive and unnecessary if your handler logic does not require them. By default, `event.$children` is `null`.
