const { existsSync } = require('fs');

module.exports = async function () {
  const opts = this.opts();
  const { ids, all, filepath } = opts;
  if (!all && !ids && !filepath) this.parent.error('Either use --all flag or pass item id --id or --filepath to pass json file containing ids');
  if (all && ids) this.parent.error('Cannot use --all flag along with --id flag');
  if (filepath && !existsSync(filepath)) this.parent.error(
    `${filepath} does not exist`
  );
  let entities = [];
  if (all) {
    entities = await strapi.plugin('responsive-image').service('upload-file').getAll();
  } else if (filepath) {
    entities = await strapi.plugin('responsive-image').service('upload-file').getFromFile(filepath);
  } else {
    entities = await strapi.plugin('responsive-image').service('upload-file').getFromIds(ids);
  }
  for (let x = 0; x < entities.length; x += 1) {
    console.log(`Processing ${x + 1} of ${entities.length}`);
    const { id, url, name, ext, hash, mime, formats, width, height } = entities[x];
    await strapi.plugin('responsive-image').service('generate').thumbnail(
      id, url, name, ext, hash, mime, formats, width, height
    );
  }
}