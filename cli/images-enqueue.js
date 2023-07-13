const path = require('path');

const Strapi = require('@strapi/strapi');
const { version } = require('../package.json');
const { responsive, thumbnail, setCdn, setCdnEmbedded } = require('./enqueue');
const { Command, Option } = require('commander');

(async () => {
  const appDir = '/opt/app';
  const distFolder = 'dist';
  const distDir = path.join(appDir, distFolder);
  await Strapi({ distDir, appDir }).load();
  const { cdn: { url } } = strapi.config.get('plugin.upload');
  const program = new Command();
  program
    .name('enqueue')
    .description('Enqueue subcommand.')
    .version(version);

  program.command('responsive')
    .description('Enqueue responsive images to be generated')
    .addOption(new Option('-a, --all', 'Enqueue all images to be resized'))
    .addOption(new Option('-i, --ids <number...>', 'Image id(s)'))
    .addOption(new Option('-f, --filepath <string>', 'Filepath of JSON containing Ids'))
    .addOption(new Option('-c, --cleanup', 'Enqueue images to be resized which do not have the strapi formats'))
    .action(responsive);

  program.command('thumbnail')
    .description('Enqueue thumbnails to be generate')
    .addOption(new Option('-a, --all', 'Enqueue all thumbnails to be generated'))
    .addOption(new Option('-i, --ids <number...>', 'Image id(s)'))
    .addOption(new Option('-f, --filepath <string>', 'Filepath of JSON containing Ids'))
    .action(thumbnail);

  program.command('set-cdn')
    .description('Enqueue setting the CDN url for images')
    .addOption(new Option('-a, --all', 'Set for all images'))
    .addOption(new Option('-i, --ids <number...>', 'Image id(s)'))
    .addOption(new Option('-f, --filepath <string>', 'Filepath of JSON containing Ids'))
    .addOption(new Option('-u, --url <string>', 'Url to set').default(url))
    .action(setCdn)

  program.command('set-embedded')
    .description('Enqueue setting the CDN url for images embeded in post content')
    .addOption(new Option('-a, --all', 'Set for all posts'))
    .addOption(new Option('-i, --ids <number...>', 'Post id(s)'))
    .addOption(new Option('-f, --filepath <string>', 'Filepath of JSON containing Ids'))
    .addOption(new Option('-u, --url <string>', 'Url to set').default(url))
    .action(setCdnEmbedded)

  await program.parseAsync();
  strapi.stop(0);
})();
