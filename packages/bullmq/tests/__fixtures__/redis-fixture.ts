import { RedisContainer, StartedRedisContainer } from '@testcontainers/redis';
import { ConnectionOptions } from 'bullmq';
import { afterEach, beforeEach } from 'vitest';

export function withRedisContainer(image = 'redis:7.2') {
  let container: StartedRedisContainer | undefined;

  beforeEach(async () => {
    container = await new RedisContainer(image).start();
  }, 60_000);

  afterEach(async () => {
    if (container) {
      await container.stop();
      container = undefined;
    }
  });

  return () => {
    return {
      host: container?.getHost(),
      port: container?.getFirstMappedPort(),
    } satisfies ConnectionOptions;
  };
}
