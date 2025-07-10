/**
 * Base interface for all processable objects in the event-driven architecture.
 *
 * A Handlable represents any object that can be processed by a handler. It serves as the
 * foundation for both Events (things that have happened) and Tasks (work to be done).
 * All handlables contain a read-only payload with the data relevant to the handlable.
 *
 * @template TPayload - The type of data contained in the handlable's payload (must extend object)
 *
 * @see {@link Event} for event-specific handlables
 * @see {@link Task} for task-specific handlables
 */
export interface Handlable<TPayload extends object = object> {
  /**
   * The immutable payload data of the handlable.
   */
  readonly payload: Readonly<TPayload>;
}
