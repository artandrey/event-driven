export interface Handlable<TPayload extends object = object> {
  readonly payload: Readonly<TPayload>;
}
