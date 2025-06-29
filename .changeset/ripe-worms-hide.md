---
'@event-driven-architecture/core': minor
---

BREAKING CHANGE: Use `eventBus.setPublisher(publisher)` instead of `eventBus.publisher = publisher`

- Add explicit `setPublisher()` method for publisher registration
- Remove optional `publishAll` fallback - now required in EventPublisher interface
