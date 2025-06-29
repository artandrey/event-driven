/**
 * Base interface for all events in the event-driven system.
 * @template TPayload - payload data contained in the event
 */
export interface Event<TPayload extends object = object> {
  /**
   * The immutable payload data of the event.
   */
  readonly payload: Readonly<TPayload>;
}
