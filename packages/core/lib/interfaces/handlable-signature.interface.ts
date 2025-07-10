import { Handlable } from './handlable.interface';

export type HandlableSignature = new (...args: any[]) => Handlable;
