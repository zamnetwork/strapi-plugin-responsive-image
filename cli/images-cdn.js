const path = require('path');
const { set, setEmbedded } = require('./cdn');
const Strapi = require('@strapi/strapi');
const { version } = require('../package.json');
const { Command, Option } = require('commander');

(async () => {
  const appDir = '/opt/app';
  const distFolder = 'dist';
  const distDir = path.join(appDir, distFolder);
  await Strapi({ distDir, appDir }).load();
  const { cdn: { url } } = strapi.config.get('plugin.upload');
  const program = new Command();
  program
    .name('cdn')
    .description('CDN subcommand.')
    .version(version);

  program.command('set')
    .description('Set the CDN url for images')
    .addOption(new Option('-a, --all', 'Set for all images'))
    .addOption(new Option('-i, --ids <number...>', 'Image id(s)'))
    .addOption(new Option('-f, --filepath <string>', 'Filepath of JSON containing Ids'))
    .addOption(new Option('-u, --url <string>', 'Url to set').default(url))
    .action(set)
  
  program.command('set-embedded')
    .description('Set the CDN url for images embeded in post content')
    .addOption(new Option('-a, --all', 'Set for all posts'))
    .addOption(new Option('-i, --ids <number...>', 'Post id(s)'))
    .addOption(new Option('-f, --filepath <string>', 'Filepath of JSON containing Ids'))
    .addOption(new Option('-u, --url <string>', 'Url to set').default(url))
    .action(setEmbedded)

  await program.parseAsync();
  strapi.stop(0);
})();
