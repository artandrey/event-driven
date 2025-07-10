import { Handlable } from './handlable.interface';

export interface Task<TPayload extends object = object> extends Handlable<TPayload> {}
