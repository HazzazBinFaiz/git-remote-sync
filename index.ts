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
  .action(async (str, options) => {
    const result = await dataLayer.init();
    if (!result){
      console.error('Unable to connect to registry');
      return;
    }
    pull(str.remote.toString().replace(/^=?/, ''), dataLayer, !!str.force);
  });

program.command('push')
  .description('Push remotes to registry')
  .option('-r, --remote [remote]', 'Remote name', 'origin')
  .option('-f, --force', 'Force override registry remotes')
  .action(async (str, options) => {
    const result = await dataLayer.init();
    if (!result){
      console.error('Unable to connect to registry');
      return;
    }
    push(str.remote.toString().replace(/^=?/, ''), dataLayer, !!str.force);
  });

program.command('status')
  .description('Show remote and registry synchronization status')
  .option('-r, --remote [remote]', 'Remote name', 'origin')
  .action(async (str, options) => {
    const result = await dataLayer.init();
    if (!result){
      console.error('Unable to connect to registry');
      return;
    }
    status(str.remote.toString().replace(/^=?/, ''), dataLayer);
  });

program.command('list')
  .description('List repository identifiers stored in the registry')
  .option('-r, --remotes', 'Print remote names too')
  .option('-u, --urls', 'Print remote names and urls too')
  .action(async (str, options) => {
    const result = await dataLayer.init();
    if (!result){
      console.error('Unable to connect to registry');
      return;
    }
    list(dataLayer, !!str.remotes, !!str.urls);
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
  .description('Remove current repository remotes from registry')
  .option('-r, --remote [remote]', 'Remote name', 'origin')
  .action(async (str, options) => {
    const result = await dataLayer.init();
    if (!result){
      console.error('Unable to connect to registry');
      return;
    }
    remove(str.remote.toString().replace(/^=?/, ''), dataLayer);
  });


program.parse();