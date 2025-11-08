import { Command } from 'commander';
import { pull } from './tasks';
const program = new Command();

program.command('pull')
  .description('Pull remotes from registry')
  .option('-r, --remote [remote]', 'Remote name', 'origin')
  .action((str, options) => {
    pull(str.remote.toString().replace(/^=?/, ''));
  });

program.parse();