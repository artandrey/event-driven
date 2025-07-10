---
'@event-driven-architecture/core': major
---

**Breaking Changes & Improvements for 1.0.0 Release**

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
