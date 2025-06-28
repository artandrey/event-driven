import { Type } from '@event-driven-architecture/core';

import { BullMqFanoutEvent } from '../../events';

export interface FanoutRouteDefinition {
  event: Type<BullMqFanoutEvent>;
  route: FanoutRoute;
}

export interface FanoutRoute {
  readonly queues: readonly string[];
}

export interface FanoutOptions {
  routes: FanoutRouteDefinition[];
}

export class FanoutRouter {
  private readonly _routes: Map<Function, FanoutRoute>;

  constructor(options?: FanoutOptions) {
    this._routes = new Map();

    if (options) {
      for (const route of options.routes) {
        this._routes.set(route.event, { queues: [...route.route.queues] });
      }
    }
  }

  public addRoute(event: Type<BullMqFanoutEvent>, route: FanoutRoute): void {
    this._routes.set(event, { queues: route.queues });
  }

  public getRoute(event: Function): FanoutRoute | null {
    const route = this._routes.get(event);
    return route ?? null;
  }
}
