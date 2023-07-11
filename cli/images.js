const { version } = require('../package.json');
const { Command } = require('commander');

(async () => {
  const program = new Command();
  program
    .name('images')
    .description('CLI to work images in strapi.')
    .version(version);

  program.command('generate', 'Generate subcommand')
  program.command('enqueue', 'Enqueue subcommand')
  program.command('cdn', 'CDN subcommand')

  await program.parseAsync();
})();
