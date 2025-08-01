# @event-driven-architecture/core

## 1.0.0

### Major Changes

- 4d4d2e4: **Breaking Changes & Improvements for 1.0.0 Release**
  - **BREAKING**: Updated `EventHandler` interface to support both synchronous and asynchronous handlers. The `handle` method now returns `void | Promise<void>` instead of just `void`
  - **BREAKING**: Changed `TContext` generic parameter from `void` to `unknown` and made context parameter optional in handler methods
  - **BREAKING**: Enhanced exception constructors to accept additional context parameters for better error messages
  - **BREAKING**: `synchronouslyConsumeByMultipleHandlers` now throws `MultipleHandlersFailedException` instead of the first error when multiple handlers fail

  **New Features:**
  - Added support for async event handlers alongside existing sync handlers
  - **NEW**: Introduced `MultipleHandlersFailedException` for better error handling when multiple handlers fail in `synchronouslyConsumeByMultipleHandlers`
    - Captures all handler failures with their indices and error details
    - Provides `getFailureDetails()` method for formatted error summary
    - Provides `getErrors()` method to extract all errors as an array
    - Includes event name and routing metadata in error message
  - Improved error handling in `synchronouslyConsumeByMultipleHandlers` - now uses `Promise.allSettled` to handle multiple handlers properly and reports all failures

  **Bug Fixes:**
  - Fixed context parameter not being passed to handlers in both single and multiple handler consumption methods
  - Fixed issue where failed handlers in multiple handler scenarios would prevent other handlers from executing
  - Fixed issue where only the first handler failure was reported in multi-handler scenarios

  **Package Improvements:**
  - Added keywords to package.json: "event driven", "event bus", "backend", "architecture", "event handler"
  - Improved exception messages with more descriptive context:
    - `HandlerNotFoundException` now includes event name and routing metadata
    - `MultipleHandlersFoundException` now includes event name, routing metadata, and handler count
    - `PublisherNotSetException` now includes usage instructions
    - `MultipleHandlersFailedException` provides comprehensive failure reporting

  **Internal Improvements:**
  - Better type safety for context handling
  - More robust error propagation and aggregation in multi-handler scenarios
  - Enhanced debugging capabilities with detailed failure information

### Minor Changes

- f5a3707: Process internal event bus exceptions using result pattern
- 0a5b943: Make TContext optional in `Handler`, `EventHandler` and `TaskProcessor`. Default TContext to unknown instead of void
- 86ec565: Update event bus and publisher to support asynchronous operations
- 33bb1ac: Changeset: Refactoring Core to Support Tasks, Results, and Generic "Handlables"

  Overview
  The core package no longer revolves exclusively around events. A generic abstraction—Handlable—now represents any object that can be processed by a handler. Two concrete specialisations currently exist:
  - Event
  - Task

  Alongside this, the event bus can now return results from synchronous processing.

  Core Concepts Introduced
  1. Handlable<TPayload>
     A minimal contract: read-only payload. Both Event and Task extend it.
  2. Handler / TaskProcessor / EventHandler
     Handler<THandlable, TResult, TContext> – generic processor interface.
     EventHandler extends Handler<Event, void, TContext>.
     TaskProcessor extends Handler<Task, TResult, TContext>.
  3. Publisher<THandlable>
     Replaces the event-only publisher, enabling publication of any handlable.
  4. HandlingResult<TResult>
     Wrapper object returned by the bus when you process handlables synchronously. Allows retrieval of a handler’s output.
  5. HandlerScope (enum)
     Extracted from EventHandler to its own file.
  6. Signatures
     • HandlableSignature – constructor type of a handlable
     • HandlerSignature – replaces EventHandlerSignature. Uses handles: HandlableSignature instead of event.

  Event Bus Changes
  • BaseEventBus is now generic in <THandlable, TResult>.
  • publish / publishAll accept any handlable subtype.
  • synchronouslyConsumeByStrictlySingleHandler returns Promise<HandlingResult<TResult>>.
  • synchronouslyConsumeByMultipleHandlers returns Promise<HandlingResult<TResult>[]>.

  Breaking API Changes
  1. EventPublisher interface removed -> use Publisher.
  2. EventHandlerSignature renamed to HandlerSignature. Property renamed:
     - event: EventSignature -> handles: HandlableSignature
  3. HandlerRegister API changes
     - Generic parameters now refer to generic Handler<Handlable>.
     - Methods `addHandler`, `addScopedHandler` and `get` expect/return HandlerSignature and handlable arguments.
  4. HandlerRetrievalOptions property renamed:
     − event -> handlable
  5. EventHandlerScope enum moved to separate file and renamed HandlerScope.
  6. EventBus synchronous methods now return HandlingResult(s) instead of void.

  Migration Guide (high-level)
  - Update handler signatures: replace `{ event: MyEvent }` with `{ handles: MyEvent }`.
  - Where you registered handlers via addHandler / addScopedHandler, update the signature object and ensure instances implement new Handler interface.
  - If you relied on EventBus synchronous methods returning void, adjust for HandlingResult or HandlingResult[].
  - Replace EventPublisher implementations with Publisher equivalents.
  - Import HandlerScope instead of EventHandlerScope.

  This refactor preserves event semantics, adds task support, and allows retrieving handler results, at the cost of the breaking changes listed above.

### Patch Changes

- 780f2d0: Add detailed JSDoc
- d343f80: Update JSDoc to cover api updates and include usage examples
- 6dd6aca: Update error message in PublisherNotSetException

## 0.6.0

### Minor Changes

- 4d9a15d: BREAKING CHANGE: Use `eventBus.setPublisher(publisher)` instead of `eventBus.publisher = publisher`
  - Add explicit `setPublisher()` method for publisher registration
  - Remove optional `publishAll` fallback - now required in EventPublisher interface

## 0.5.0

### Minor Changes

- b3940a7: Drop EventOption type as it was never used

## 0.4.2

### Patch Changes

- 65ce00b: Add default values for BaseHandlerRegister generics to improve developer experience

## 0.4.1

### Patch Changes

- 0d8a564: Update docs: fix imports in code snippet

## 0.4.0

### Minor Changes

- ec65bb6: Update intefaces naming: remove 'I' prefix from interfaces naming

## 0.3.0

### Minor Changes

- 5ac313c: Changeset summary:

  Package: @event-driven-architecture/core
  Release type: major
  1. New capability
     Event handlers are now resolved by a composite key that combines the event itself with optional routing metadata. This allows different handlers to react to the same event class while still being distinguished by metadata (for example, tenant ID, version, channel).
  2. Public-API breaking changes
     • The object that identifies a handler (`IEventHandlerSignature`) now stores its metadata in a field called “routingMetadata.”
     • When you register handlers, you no longer supply a plain string key; you provide the full signature object (event plus optional routingMetadata).
     • Retrieving handlers follows the same pattern: instead of passing only the event instance, you pass an options object containing the event, optional routingMetadata, and optional context.
     • Internally, the register keeps handlers in hash maps keyed by the pair {event, routingMetadata}. The former `handlerKey` / `routingKey` string mechanism has been retired.
  3. Updates to EventBus
     Both synchronous-consume methods now forward the composite retrieval options (event, context, routingMetadata) to the register. This means that if the caller supplies routing metadata via the existing `IHandlerCallOptions`, the EventBus will automatically route the event to the correct handlers.
  4. Migration guidance
     – When adding handlers, provide the full signature object alongside the handler or class instead of a text key.
     – When requesting handlers or consuming events, supply the same metadata you used during registration (if any).
     – Code that relied on class-name-only routing keeps working; simply omit the routingMetadata field.

## 0.2.0

### Minor Changes

- 2fa486b: Add exceptions export to package exports
- 061c91c: Add missing exports for EventOption, EventSignature types

## 0.1.0

### Minor Changes

- f18c038: Introduce @event-driven-architecture/core package
