import { Queue, Worker, Job, JobsOptions } from "bullmq";
import { logger } from "../utils/logger";

// Background jobs. With REDIS_URL set, jobs go through BullMQ (retries with
// backoff, survive restarts). Without it, they run right away in this
// process, once, which keeps development and tests free of Redis.

type JobHandler<T> = (data: T, attempt: number) => Promise<void>;

interface JobDefinition<T> {
  handler: JobHandler<T>;
  options: JobsOptions;
}

const QUEUE_NAME = "cerqueira-jobs";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const definitions = new Map<string, JobDefinition<any>>();

// Inline mode: state of the jobs that have a dedupe key.
const inlineState = new Map<string, "waiting" | "running" | "rerun">();

export interface EnqueueOptions {
  // Run the job only after this many milliseconds.
  delay?: number;
  // While a job with this key waits, new ones with the same key are dropped
  // (the waiting job reads fresh data when it runs). While it runs, one new
  // job is kept and starts after it, so two never run at the same time.
  dedupeKey?: string;
}

let queue: Queue | null = null;
let worker: Worker | null = null;

export const isQueueEnabled = (): boolean => Boolean(process.env.REDIS_URL);

const connection = () => {
  const url = new URL(process.env.REDIS_URL as string);
  return {
    host: url.hostname,
    port: Number(url.port || 6379),
    username: url.username || undefined,
    password: url.password ? decodeURIComponent(url.password) : undefined,
    db: url.pathname.length > 1 ? Number(url.pathname.slice(1)) : 0,
    tls: url.protocol === "rediss:" ? {} : undefined,
    // Required by BullMQ for blocking connections.
    maxRetriesPerRequest: null
  };
};

const getQueue = (): Queue => {
  if (!queue) {
    queue = new Queue(QUEUE_NAME, {
      connection: connection(),
      defaultJobOptions: {
        removeOnComplete: { age: 24 * 3600, count: 1000 },
        removeOnFail: { age: 7 * 24 * 3600 }
      }
    });
  }
  return queue;
};

export const defineJob = <T>(
  name: string,
  handler: JobHandler<T>,
  options: JobsOptions = {}
): void => {
  definitions.set(name, { handler, options });
};

export const enqueue = async <T>(
  name: string,
  data: T,
  { delay = 0, dedupeKey }: EnqueueOptions = {}
): Promise<void> => {
  const definition = definitions.get(name);
  if (!definition) {
    throw new Error(`Unknown job: ${name}`);
  }

  if (!isQueueEnabled()) {
    const state = dedupeKey ? inlineState.get(dedupeKey) : undefined;
    if (dedupeKey && state) {
      if (state === "running") inlineState.set(dedupeKey, "rerun");
      return;
    }
    if (dedupeKey) inlineState.set(dedupeKey, "waiting");

    // Inline mode: the caller is not delayed and errors are only logged.
    const run = async () => {
      if (dedupeKey) inlineState.set(dedupeKey, "running");
      try {
        await definition.handler(data, 1);
      } catch (err) {
        logger.error({ info: "Inline job failed", job: name, err });
      }
      if (!dedupeKey) return;
      const again = inlineState.get(dedupeKey) === "rerun";
      inlineState.delete(dedupeKey);
      if (again) await enqueue(name, data, { delay, dedupeKey });
    };
    if (delay > 0) setTimeout(run, delay);
    else setImmediate(run);
    return;
  }

  await getQueue().add(name, data, {
    ...definition.options,
    ...(delay > 0 ? { delay } : {}),
    ...(dedupeKey
      ? { deduplication: { id: dedupeKey, keepLastIfActive: true } }
      : {})
  });
};

export const startWorker = (): void => {
  if (!isQueueEnabled() || worker) return;

  worker = new Worker(
    QUEUE_NAME,
    async (job: Job) => {
      const definition = definitions.get(job.name);
      if (!definition) {
        logger.warn({ info: "No handler for job", job: job.name });
        return;
      }
      await definition.handler(job.data, job.attemptsMade + 1);
    },
    {
      connection: connection(),
      concurrency: Number(process.env.QUEUE_CONCURRENCY || 5)
    }
  );

  worker.on("failed", (job, err) => {
    logger.warn({
      info: "Job failed",
      job: job?.name,
      attempt: job?.attemptsMade,
      err: err.message
    });
  });

  logger.info("Background job worker started (Redis)");
};

export const closeQueue = async (): Promise<void> => {
  await Promise.all([worker?.close(), queue?.close()]);
  worker = null;
  queue = null;
};

export const queueHealth = async (): Promise<"inline" | "ok" | "down"> => {
  if (!isQueueEnabled()) return "inline";
  try {
    const client = (await getQueue().client) as unknown as {
      ping(): Promise<string>;
    };
    await client.ping();
    return "ok";
  } catch {
    return "down";
  }
};
