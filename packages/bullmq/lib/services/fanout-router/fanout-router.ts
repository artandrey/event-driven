import { Type } from '@event-driven-architecture/core';
import { JobsOptions } from 'bullmq';

import { DuplicateFanoutQueueNameException, InvalidFanoutRouteException } from '../../exceptions';
import { BullMqFanoutTask } from '../../tasks';

export interface FanoutRouteDefinition {
  event: Type<BullMqFanoutTask>;
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

  private constructor() {
    this._routes = new Map();
  }

  /**
   * Create a router instance optionally pre-populated with routes.
   */
  public static create(options?: FanoutOptions): FanoutRouter {
    const router = new FanoutRouter();
    if (options) {
      for (const route of options.routes) {
        router.validateRoute(route.route);
        router._routes.set(route.event, { queues: [...route.route.queues] });
      }
    }
    return router;
  }

  /**
   * Add a route for an event. If a route already exists, it will be replaced.
   */
  public addRoute(event: Type<BullMqFanoutTask>, route: FanoutRoute): void {
    this.validateRoute(route);
    this._routes.set(event, { queues: route.queues });
  }

  /**
   * Explicitly override an existing route for an event.
   */
  public overrideRoute(event: Type<BullMqFanoutTask>, route: FanoutRoute): void {
    this.validateRoute(route);
    this._routes.set(event, { queues: route.queues });
  }

  /**
   * Get a route for an event type or null when not found.
   */
  public getRoute(event: Function): FanoutRoute | null {
    const route = this._routes.get(event);
    return route ?? null;
  }

  private validateRoute(route: FanoutRoute): void {
    if (!Array.isArray(route.queues) || route.queues.length === 0) {
      throw new InvalidFanoutRouteException('Fanout route must contain at least one queue');
    }

    const seen = new Set<string>();
    for (const q of route.queues) {
      if (seen.has(q.name)) {
        throw new DuplicateFanoutQueueNameException(`Duplicate queue name in fanout route: ${q.name}`);
      }
      seen.add(q.name);
    }
  }
}
