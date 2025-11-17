import { accReportsQueue } from './acc-reports.queue';

async function main() {
  const [cmd, ...args] = process.argv.slice(2);
  if (!accReportsQueue) {
    console.error('Queue not initialised');
    return;
  }
  if (cmd === 'run') {
    const [start, end, cache] = args;
    const job = await accReportsQueue.add('trial-balance', {
      startDate: start,
      endDate: end,
      cache: cache === 'true',
    });
    console.log('enqueued', job.id);
  } else if (cmd === 'status') {
    const [id] = args;
    const job = await accReportsQueue.getJob(id);
    if (!job) {
      console.log('not found');
      return;
    }
    const state = await job.getState();
    console.log({
      id: job.id,
      state,
      progress: job.progress,
      result: job.returnvalue,
    });
  } else {
    console.log('usage: ts-node src/acc-reports/cli.ts <run|status> [args]');
  }
}

main().catch((err) => {
  console.error(err);
});
