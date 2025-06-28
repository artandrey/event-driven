import { Type } from '@event-driven-architecture/core';
import { JobsOptions } from 'bullmq';

import { BullMqFanoutEvent } from '../../events';

export interface FanoutRouteDefinition {
  event: Type<BullMqFanoutEvent>;
  route: FanoutRoute;
}

export type FanoutJobOptionsStrategy = 'rewrite' | 'override';

export interface FanoutQueueRouteBase {
  name: string;
}

export interface FanoutQueueRouteWithOptions extends FanoutQueueRouteBase {
  jobOptions: JobsOptions;
  jobOptionsStrategy: FanoutJobOptionsStrategy;
}

export type FanoutQueueRoute = FanoutQueueRouteBase | FanoutQueueRouteWithOptions;

export interface FanoutRoute {
  readonly queues: readonly FanoutQueueRoute[];
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
