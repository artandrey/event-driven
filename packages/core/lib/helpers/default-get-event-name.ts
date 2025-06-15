import { Event } from '../interfaces/event.interface';

export const defaultGetEventName = <EventBase extends Event = Event>(event: EventBase): string => {
  const { constructor } = Object.getPrototypeOf(event);
  return constructor.name as string;
};
