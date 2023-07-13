const { existsSync } = require('fs');

module.exports = async function () {
  const opts = this.opts();
  const { ids, all, filepath, url } = opts;
  if (!all && !ids && !filepath) this.parent.error('Either use --all flag or pass post id --id or --filepath to pass json file containing ids');
  if (all && ids) this.parent.error('Cannot use --all flag along with --id flag and');
  if (filepath && !existsSync(filepath)) this.parent.error(
    `${filepath} does not exist`
  );
  let entities = [];
  if (all) {
    const fields = ['id'];
    const result = await strapi.entityService.findMany('api::post.post', {
      fields
    });
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
    await strapi.plugin('responsive-image').service('cdn').setEmbedded({
      id,
      url
    });
  }
}