export interface Event<TPayload extends object = object> {
  readonly payload: Readonly<TPayload>;
}
