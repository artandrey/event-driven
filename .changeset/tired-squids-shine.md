---
'@event-driven-architecture/core': minor
---

Changeset: Refactoring Core to Support Tasks, Results, and Generic "Handlables"

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
