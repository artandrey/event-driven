# Event Driven Architecture / BullMQ

This package provides BullMQ integration for the [@event-driven-architecture/core](https://github.com/artandrey/event-driven) framework, enabling robust, queue-based event-driven processing in TypeScript applications.

## Key Principles

- **Event Agnostic Handlers:** Your application layer (event handlers) remains agnostic to the underlying message queue. All BullMQ-specific details are encapsulated in the event class.
- **Separation of Concerns:** Define queue, job options, and event names in the event class. Handlers only care about the event payload.

---

- [Installation](#installation)
- [Defining Events](#defining-events)
- [Creating Event Handlers](#creating-event-handlers)
- [Registering Queues and Handlers](#registering-queues-and-handlers)
- [Publishing Events](#publishing-events)
  - [Atomic vs Bulk Publishing](#atomic-vs-bulk-publishing)
- [Fanout Routing](#fanout-routing)
  - [Defining Fanout Events](#defining-fanout-events)
  - [Configuring the Fanout Router](#configuring-the-fanout-router)
    - [Per-Queue Job Options](#per-queue-job-options)
  - [Publishing Fanout Events](#publishing-fanout-events)
  - [Consuming Fanout Events](#consuming-fanout-events)
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

## Registering Queues and Handlers

Queues still need to be registered explicitly, but **events are now discovered automatically from your handler signatures**.  
Use the `HandlesBullMq` helper to bind an event class to its handler; the consumer service will take care of registering the event class. No manual `eventsRegisterService.register(...)` calls are required anymore.

```typescript
import {
  EventsRegisterService,
  HandlesBullMq,
  QueueRegisterService,
  WorkerRegisterService,
  WorkerService,
} from '@event-driven-architecture/bullmq';
import { BaseHandlerRegister } from '@event-driven-architecture/core';
import { Queue } from 'bullmq';

import { UserCreatedEvent } from './events/user-created.event';
import { UserCreatedHandler } from './handlers/user-created.handler';

// 1  Create the required register services
const eventsRegisterService = new EventsRegisterService();
const queueRegisterService = new QueueRegisterService();
const handlerRegisterService = new BaseHandlerRegister();
const workerRegisterService = new WorkerRegisterService();
const workerService = new WorkerService(workerRegisterService);

// 2  Register your BullMQ queue instance
const userQueue = new Queue('user-queue', { connection: { host: 'localhost', port: 6379 } });
queueRegisterService.add(userQueue);

// 3  Bind the handler to the event
handlerRegisterService.addHandler(HandlesBullMq(UserCreatedEvent), new UserCreatedHandler());
```

---

## Publishing Events

You can publish events using either atomic or bulk strategies. Both are event-agnostic from the handler's perspective.

### Atomic vs Bulk Publishing

- **AtomicBullMqEventPublisher**: Adds each event/job to the queue individually. If one job fails, others still succeed. Use this for reliability when partial success is acceptable.
- **BulkBullMqEventPublisher**: Uses BullMQ's `addBulk` for efficiency. All jobs are added in a single operation, but if one fails, all fail. Use this for high-throughput scenarios where atomicity is not critical.

#### Example: Atomic Publishing

```typescript
import { AtomicBullMqEventPublisher, FanoutRouter } from '@event-driven-architecture/bullmq';

const fanoutRouter = new FanoutRouter();
const eventPublisher = new AtomicBullMqEventPublisher(queueRegisterService, flowRegisterService, fanoutRouter);
const event = new UserCreatedEvent({ userId: '123' });
eventPublisher.publish(event);
```

#### Example: Bulk Publishing

```typescript
import { BulkBullMqEventPublisher, FanoutRouter } from '@event-driven-architecture/bullmq';

const fanoutRouter = new FanoutRouter();
const bulkPublisher = new BulkBullMqEventPublisher(queueRegisterService, flowRegisterService, fanoutRouter);
bulkPublisher.publishAll([new UserCreatedEvent({ userId: '1' }), new UserCreatedEvent({ userId: '2' })]);
```

---

## Fanout Routing

Fanout routing allows you to publish a single event to multiple queues simultaneously. This is useful for implementing patterns like event broadcasting, where multiple services need to process the same event independently.

### Defining Fanout Events

Fanout events extend `BullMqFanoutEvent` instead of `BullMqEvent`. Unlike regular events, fanout events don't specify a single queue name since they will be routed to multiple queues based on the configured routes.

```typescript
import { BullMqFanoutEvent } from '@event-driven-architecture/bullmq';

interface NotificationPayload {
  userId: string;
  message: string;
  type: 'email' | 'sms' | 'push';
}

export class NotificationEvent extends BullMqFanoutEvent<NotificationPayload> {
  constructor(payload: NotificationPayload) {
    super({
      name: 'notification-sent',
      jobOptions: { attempts: 3, delay: 1000 },
      payload,
    });
  }
}
```

When consumed, fanout events provide access to the queue they were actually processed on via the `$assignedQueueName` property:

```typescript
export class NotificationHandler implements IEventHandler<NotificationEvent, BullMqHandlerContext> {
  handle(event: NotificationEvent, context: BullMqHandlerContext) {
    console.log('Processing notification on queue:', event.$assignedQueueName);
    console.log('Notification payload:', event.payload);
  }
}
```

### Configuring the Fanout Router

The `FanoutRouter` is responsible for mapping fanout events to their target queues. You can configure routes either during construction or by adding them dynamically.

#### Option 1: Configure Routes During Construction

```typescript
import { FanoutRouter } from '@event-driven-architecture/bullmq';

const fanoutRouter = new FanoutRouter({
  routes: [
    {
      event: NotificationEvent,
      route: {
        queues: [{ name: 'email-queue' }, { name: 'sms-queue' }, { name: 'push-queue' }],
      },
    },
    {
      event: UserActivityEvent,
      route: {
        queues: [{ name: 'analytics-queue' }, { name: 'audit-queue' }],
      },
    },
  ],
});
```

#### Option 2: Add Routes Dynamically

```typescript
import { FanoutRouter } from '@event-driven-architecture/bullmq';

const fanoutRouter = new FanoutRouter();

// Add routes for different events
fanoutRouter.addRoute(NotificationEvent, {
  queues: [{ name: 'email-queue' }, { name: 'sms-queue' }, { name: 'push-queue' }],
});

fanoutRouter.addRoute(UserActivityEvent, {
  queues: [{ name: 'analytics-queue' }, { name: 'audit-queue' }],
});
```

#### Per-Queue Job Options

You can configure different job options for each queue in a fanout route. This allows you to customize retry attempts, delays, priorities, and other BullMQ job options per destination queue.

```typescript
import { FanoutRouter } from '@event-driven-architecture/bullmq';

const fanoutRouter = new FanoutRouter();

fanoutRouter.addRoute(NotificationEvent, {
  queues: [
    {
      name: 'email-queue',
      jobOptions: { attempts: 5, delay: 2000 },
      jobOptionsStrategy: 'override', // merge with event's options
    },
    {
      name: 'sms-queue',
      jobOptions: { attempts: 3, priority: 10 },
      jobOptionsStrategy: 'rewrite', // replace event's options completely
    },
    {
      name: 'push-queue',
      // No custom options - uses event's default options
    },
  ],
});
```

**Job Options Strategies:**

- **`override`**: Merges the event's job options with the per-queue options. Per-queue options take precedence for conflicting properties.
- **`rewrite`**: Completely replaces the event's job options with the per-queue options.

**Example with different strategies:**

```typescript
// Event has: { attempts: 3, delay: 1000, priority: 1 }
// Queue config: { attempts: 5, priority: 10, jobOptionsStrategy: 'override' }
// Result: { attempts: 5, delay: 1000, priority: 10 }

// Event has: { attempts: 3, delay: 1000, priority: 1 }
// Queue config: { attempts: 5, priority: 10, jobOptionsStrategy: 'rewrite' }
// Result: { attempts: 5, priority: 10 }
```

### Publishing Fanout Events

Fanout events are published using the same publishers as regular events. The publisher will automatically detect fanout events and route them to all configured queues.

#### Using Atomic Publisher

```typescript
import { AtomicBullMqEventPublisher, FanoutRouter } from '@event-driven-architecture/bullmq';

const fanoutRouter = new FanoutRouter();
fanoutRouter.addRoute(NotificationEvent, {
  queues: [{ name: 'email-queue' }, { name: 'sms-queue' }, { name: 'push-queue' }],
});

const publisher = new AtomicBullMqEventPublisher(queueRegisterService, flowRegisterService, fanoutRouter);

// This will create jobs in all three queues
publisher.publish(
  new NotificationEvent({
    userId: '123',
    message: 'Welcome to our platform!',
    type: 'email',
  }),
);
```

#### Using Bulk Publisher

```typescript
import { BulkBullMqEventPublisher, FanoutRouter } from '@event-driven-architecture/bullmq';

const fanoutRouter = new FanoutRouter();
fanoutRouter.addRoute(NotificationEvent, {
  queues: [{ name: 'email-queue' }, { name: 'sms-queue' }, { name: 'push-queue' }],
});

const bulkPublisher = new BulkBullMqEventPublisher(queueRegisterService, flowRegisterService, fanoutRouter);

// Efficiently publish multiple fanout events
bulkPublisher.publishAll([
  new NotificationEvent({ userId: '1', message: 'Message 1', type: 'email' }),
  new NotificationEvent({ userId: '2', message: 'Message 2', type: 'sms' }),
]);
```

### Consuming Fanout Events

Consuming fanout events requires setting up workers for each target queue, just like regular events. Each queue will process the same event independently.

```typescript
import {
  BullMqEventConsumerService,
  EventsRegisterService,
  QueueRegisterService,
  WorkerRegisterService,
  WorkerService,
} from '@event-driven-architecture/bullmq';
import { Queue } from 'bullmq';

// Register all target queues
const queueRegisterService = new QueueRegisterService();
const emailQueue = new Queue('email-queue', { connection: { host: 'localhost', port: 6379 } });
const smsQueue = new Queue('sms-queue', { connection: { host: 'localhost', port: 6379 } });
const pushQueue = new Queue('push-queue', { connection: { host: 'localhost', port: 6379 } });

queueRegisterService.add(emailQueue);
queueRegisterService.add(smsQueue);
queueRegisterService.add(pushQueue);

// Register event and handlers
const eventsRegisterService = new EventsRegisterService();
eventsRegisterService.register(NotificationEvent);

const handlerRegisterService = new BaseHandlerRegister();
handlerRegisterService.addHandler(HandlesBullMq(NotificationEvent), new NotificationHandler());

// Configure consumer for all queues
const consumerOptions = [
  {
    queueName: 'email-queue',
    workerOptions: { connection: { host: 'localhost', port: 6379 } },
  },
  {
    queueName: 'sms-queue',
    workerOptions: { connection: { host: 'localhost', port: 6379 } },
  },
  {
    queueName: 'push-queue',
    workerOptions: { connection: { host: 'localhost', port: 6379 } },
  },
];

const consumer = new BullMqEventConsumerService(
  workerRegisterService,
  queueRegisterService,
  eventsRegisterService,
  consumerOptions,
  workerService,
  eventBus,
  handlerRegisterService,
);

consumer.init(); // Start consuming from all queues
```

#### Queue-Specific Handlers

If you need different logic for each queue, you can create queue-specific handlers by checking the `$assignedQueueName` property:

```typescript
export class NotificationHandler implements IEventHandler<NotificationEvent, BullMqHandlerContext> {
  handle(event: NotificationEvent, context: BullMqHandlerContext) {
    switch (event.$assignedQueueName) {
      case 'email-queue':
        this.handleEmailNotification(event.payload);
        break;
      case 'sms-queue':
        this.handleSmsNotification(event.payload);
        break;
      case 'push-queue':
        this.handlePushNotification(event.payload);
        break;
      default:
        throw new Error(`Unknown queue: ${event.$assignedQueueName}`);
    }
  }

  private handleEmailNotification(payload: NotificationPayload) {
    // Email-specific logic
  }

  private handleSmsNotification(payload: NotificationPayload) {
    // SMS-specific logic
  }

  private handlePushNotification(payload: NotificationPayload) {
    // Push notification-specific logic
  }
}
```

---

## Consuming Events

The consumer wires together three things:

1. A **Worker** per queue (created via `WorkerService.createWorker`). Workers are stored inside `WorkerRegisterService`, keyed by queue name.
2. The **QueueRegisterService** so the consumer can resolve the underlying `Queue` object when forwarding context to handlers.
3. The **EventsRegisterService / HandlerRegisterService** pair that lets the consumer map incoming jobs to the right event class and handler.

```typescript
import {
  BullMqEventConsumerService,
  QueueRegisterService,
  WorkerRegisterService,
  WorkerService,
} from '@event-driven-architecture/bullmq';
import { IEventBus } from '@event-driven-architecture/core';
import { Queue } from 'bullmq';

const workerRegisterService = new WorkerRegisterService();
const workerService = new WorkerService(workerRegisterService);
const handlerRegisterService = new BaseHandlerRegister();

// Queue registration
const queueRegisterService = new QueueRegisterService();
const userQueue = new Queue('user-queue', { connection: { host: 'localhost', port: 6379 } });
queueRegisterService.add(userQueue);

const consumerOptions = [
  {
    queueName: 'user-queue',
    // Any valid BullMQ WorkerOptions may go here (concurrency, connection, etc.)
    workerOptions: { connection: { host: 'localhost', port: 6379 } },
  },
];

const consumer = new BullMqEventConsumerService(
  workerRegisterService,
  queueRegisterService,
  eventsRegisterService,
  consumerOptions,
  workerService,
  eventBus,
  handlerRegisterService,
);

consumer.init(); // Spawns the workers and starts listening for jobs
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
import { AtomicBullMqEventPublisher, FanoutRouter, FlowRegisterService } from '@event-driven-architecture/bullmq';
import { FlowProducer } from 'bullmq';

const flowRegisterService = new FlowRegisterService();
flowRegisterService.addSingleton(new FlowProducer({ connection: { host: 'localhost', port: 6379 } }));

const fanoutRouter = new FanoutRouter();
const publisher = new AtomicBullMqEventPublisher(queueRegisterService, flowRegisterService, fanoutRouter);
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
