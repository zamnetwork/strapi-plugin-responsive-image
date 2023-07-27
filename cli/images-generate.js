const path = require('path');
const { responsive, thumbnail } = require('./generate');
const Strapi = require('@strapi/strapi');
const { version } = require('../package.json');
const { Command, Option } = require('commander');

(async () => {
  const appDir = '/opt/app';
  const distFolder = 'dist';
  const distDir = path.join(appDir, distFolder);
  await Strapi({ distDir, appDir }).load();
  const program = new Command();
  program
    .name('generate')
    .description('Generate subcommand.')
    .version(version);

  program.command('responsive')
    .description('Generate responsive images in Strapi')
    .addOption(new Option('-a, --all', 'Generate all images'))
    .addOption(new Option('-i, --ids <number...>', 'Image id(s)'))
    .addOption(new Option('-f, --filepath <string>', 'Filepath of JSON containing Ids'))
    .action(responsive);

  program.command('thumbnail')
    .description('Generate thumbnail for images in Strapi')
    .addOption(new Option('-a, --all', 'Generate all images'))
    .addOption(new Option('-i, --ids <number...>', 'Image id(s)'))
    .addOption(new Option('-f, --filepath <string>', 'Filepath of JSON containing Ids'))
    .action(thumbnail);

  await program.parseAsync();
  strapi.stop(0);
})();
