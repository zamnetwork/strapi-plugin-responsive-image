const path = require('path');
const Strapi = require('@strapi/strapi');
const regenerate = require('./regenerate');
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

  program.command('regenerate')
    .description('Regenerate responsive images in Strapi')
    .addOption(new Option('-a, --all', 'Regenerate all images'))
    .addOption(new Option('-i, --ids <number...>', 'Image id(s)'))
    .addOption(new Option('-f, --filepath <string>', 'Filepath of JSON containing Ids'))
    .action(regenerate)

  await program.parseAsync();
  strapi.stop(0);
})();
