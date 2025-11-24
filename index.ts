import { Command } from 'commander';
import { list, login, logout, pull, push, register, remove, search, status } from './tasks';
import { createDataLayer } from './data';

const program = new Command();

const dataLayer = createDataLayer();

program.command('login')
  .description('Login to registry')
  .action(async () => {
    const result = await dataLayer.init();
    if (!result){
      console.error('Unable to connect to registry');
      return;
    }
    login(dataLayer);
  });

program.command('register')
  .description('Register an account to registry')
  .action(async () => {
    const result = await dataLayer.init();
    if (!result){
      console.error('Unable to connect to registry');
      return;
    }
    register(dataLayer);
  });

program.command('logout')
  .description('Logout from registry')
  .action(async () => {
    const result = await dataLayer.init();
    if (!result){
      console.error('Unable to connect to registry');
      return;
    }
    logout(dataLayer);
  });

program.command('pull')
  .description('Pull remotes from registry')
  .option('-r, --remote [remote]', 'Remote name', 'origin')
  .option('-f, --force', 'Force override local remotes')
  .action(async (options) => {
    const result = await dataLayer.init();
    if (!result){
      console.error('Unable to connect to registry');
      return;
    }
    pull(options.remote.toString().replace(/^=?/, ''), dataLayer, !!options.force);
  });

program.command('push')
  .description('Push remotes to registry')
  .option('-r, --remote [remote]', 'Remote name', 'origin')
  .option('-f, --force', 'Force override registry remotes')
  .action(async (options) => {
    const result = await dataLayer.init();
    if (!result){
      console.error('Unable to connect to registry');
      return;
    }
    push(options.remote.toString().replace(/^=?/, ''), dataLayer, !!options.force);
  });

program.command('status')
  .description('Show remote and registry synchronization status')
  .option('-r, --remote [remote]', 'Remote name', 'origin')
  .action(async (options) => {
    const result = await dataLayer.init();
    if (!result){
      console.error('Unable to connect to registry');
      return;
    }
    status(options.remote.toString().replace(/^=?/, ''), dataLayer);
  });

program.command('list')
  .description('List repository identifiers stored in the registry')
  .option('-r, --remotes', 'Print remote names too')
  .option('-u, --urls', 'Print remote names and urls too')
  .action(async (options) => {
    const result = await dataLayer.init();
    if (!result){
      console.error('Unable to connect to registry');
      return;
    }
    list(dataLayer, !!options.remotes, !!options.urls);
  });

program.command('search')
  .description('Search repository identifiers adn urls stored in the registry')
  .argument('<query>', 'Search query string')
  .option('-n, --no-url', 'Do not match urls, only identifiers')
  .option('-o, --only-once', 'Close after first answer')
  .action(async (query, options) => {
    const result = await dataLayer.init();
    if (!result){
      console.error('Unable to connect to registry');
      return;
    }
    search(dataLayer, query.toString(), !!options.url, !!options.onlyOnce);
  });


program.command('remove')
  .argument('[remote]', 'Remote name to remove (Not entire repository)')
  .description('Remove current repository remotes from registry')
  .option('-r, --remote [remote]', 'Remote name', 'origin')
  .action(async (remote, options) => {
    const result = await dataLayer.init();
    if (!result){
      console.error('Unable to connect to registry');
      return;
    }
    remove(options.remote.toString().replace(/^=?/, ''), dataLayer, remote);
  });


program.parse();