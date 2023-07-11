const { existsSync } = require('fs');

module.exports = async function () {
  const opts = this.opts();
  const { ids, all, filepath, url } = opts;
  if (!all && !ids && !filepath) this.parent.error('Either use --all flag or pass item id --id or --filepath to pass json file containing ids or --cleanup');
  if (all && ids) this.parent.error('Cannot use --all flag along with --id flag and --cleanup flag');
  if (filepath && !existsSync(filepath)) this.parent.error(
    `${filepath} does not exist`
  );
  let entities = [];
  const select = ['id'];
  if (all) {
    const result = await strapi.plugin('responsive-image').service('upload-file').getAll(select);
    result.forEach(res => {
      const { id } = res;
      entities.push(id);
    })
  } else if (filepath) {
    entities = require(filepath);
  } else {
    entities = ids;
  }
  for (let x = 0; x < entities.length; x += 1) {
    console.log(`Processing ${x + 1} of ${entities.length}`);
    const id = entities[x];
    await strapi.plugin('responsive-image').service('cdn').set({
      id,
      url
    });
  }
}