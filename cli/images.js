const path = require('path');
const enqueue = require('./enqueue');
const generate = require('./generate');
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
    .name('images')
    .description('CLI to work images in strapi.')
    .version(version);

  program.command('generate')
    .description('Generate responsive images in Strapi')
    .addOption(new Option('-a, --all', 'Generate all images'))
    .addOption(new Option('-i, --ids <number...>', 'Image id(s)'))
    .addOption(new Option('-f, --filepath <string>', 'Filepath of JSON containing Ids'))
    .action(generate)

  program.command('enqueue')
    .description('Enqueue images to be resized')
    .addOption(new Option('-a, --all', 'Enqueue all images to be resized'))
    .addOption(new Option('-i, --ids <number...>', 'Image id(s)'))
    .addOption(new Option('-f, --filepath <string>', 'Filepath of JSON containing Ids'))
    .addOption(new Option('-c, --cleanup', 'Enqueue images to be resized which do not have the strapi formats'))
    .action(enqueue)

  await program.parseAsync();
  strapi.stop(0);
})();
