// Local failure drill only. Exit without cleanup at the chosen durability boundary.
import pg from 'pg';
import { databaseConfig } from '../src/config.mjs';
import { runOnce } from '../src/worker.mjs';
const mode=process.argv[2];
if(!['before-delivery','after-delivery'].includes(mode))throw new Error('Choose a crash boundary');
const db=new pg.Client(await databaseConfig());await db.connect();
await runOnce(db,mode==='before-delivery'?{afterClaim:()=>process.exit(23)}:{afterDelivery:()=>process.exit(23)});
await db.end();process.exitCode=24; // No queued job means the drill was not exercised.
