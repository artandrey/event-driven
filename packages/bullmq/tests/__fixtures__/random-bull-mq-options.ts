import { JobsOptions } from 'bullmq';

export function randomBullMqOptions(): JobsOptions {
  const options: Partial<JobsOptions> = {};

  if (Math.random() > 0.5) options.delay = Math.floor(Math.random() * 1000);
  if (Math.random() > 0.5) options.attempts = Math.floor(Math.random() * 10);
  if (Math.random() > 0.5) options.lifo = Math.random() > 0.5;
  if (Math.random() > 0.5) options.removeOnComplete = Math.random() > 0.5;
  if (Math.random() > 0.5) options.removeOnFail = Math.random() > 0.5;

  if (Object.keys(options).length === 0) {
    options.delay = Math.floor(Math.random() * 1000);
  }

  return options as JobsOptions;
}
