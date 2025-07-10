import { Handlable } from './handlable.interface';

export interface Event<TPayload extends object = object> extends Handlable<TPayload> {}
