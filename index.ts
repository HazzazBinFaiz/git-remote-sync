import { Command } from 'commander';
import { pull } from './tasks';
import { createDataLayer } from './data';
import { push } from './tasks/push';

const program = new Command();

const dataLayer = createDataLayer();


program.command('pull')
  .description('Pull remotes from registry')
  .option('-r, --remote [remote]', 'Remote name', 'origin')
  .option('-f, --force', 'Force override local remotes')
  .action((str, options) => {
    pull(str.remote.toString().replace(/^=?/, ''), dataLayer, !!str.force);
  });

program.command('push')
  .description('Push remotes to registry')
  .option('-r, --remote [remote]', 'Remote name', 'origin')
  .option('-f, --force', 'Force override registry remotes')
  .action((str, options) => {
    push(str.remote.toString().replace(/^=?/, ''), dataLayer, !!str.force);
  });

program.parse();