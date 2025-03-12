export interface IEvent<TPayload extends object = object> {
  readonly payload: Readonly<TPayload>;
}
