---
'@event-driven-architecture/core': minor
---

Changeset summary (plain-language focus):

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
