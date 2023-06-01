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
  await strapi.plugin('wp-migrate').service('sqs').enqueueIds(entities, 'responsive-image');
}