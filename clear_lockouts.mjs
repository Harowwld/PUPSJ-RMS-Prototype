import { sysDbRun } from './next-app/src/lib/systemDb.js';

async function clear() {
  await sysDbRun("DELETE FROM rate_limit_violations");
  await sysDbRun("DELETE FROM rate_limit_hits");
  console.log("All rate limits cleared!");
  process.exit(0);
}

clear();
