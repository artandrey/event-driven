# @event-driven-architecture/bullmq

## 0.5.0

### Patch Changes

- Updated dependencies [b3940a7]
  - @event-driven-architecture/core@0.5.0

## 0.4.0

### Minor Changes

- 96d6e1f: Support bullmq 3.x.x || 4.x.x || 5.x.x

## 0.3.0

### Minor Changes

- 024a4a3: Rename singleton flow producer to default in FlowRegisterService
- c2f9915: Add ability to rewrite or override job options for each queue in fanout
- 0de6046: Implement fanout routing

### Patch Changes

- f34d8bd: Define custom exceptions

## 0.2.1

### Patch Changes

- 1c39df5: Update docs to match updated imports from core
- a098df3: Fix event consumption
- ebbd5cb: Specify generic type for EventPublisher for BaseEventBus declaration
- Updated dependencies [0d8a564]
  - @event-driven-architecture/core@0.4.1

## 0.2.0

### Minor Changes

- adb279b: Introduce flow jobs processing support
- adb279b: Introduce @event-driven-architecture/bullmq package
- adb279b: Add automatic metadata creation and event registration through HandlesBullMq and BullMqEventConsumerService
- adb279b: Migrate to @event-driven-architecture/core 0.4.0
