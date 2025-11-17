import { Command } from 'commander';
import { login, logout, pull, push, register, status } from './tasks';
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


program.parse();