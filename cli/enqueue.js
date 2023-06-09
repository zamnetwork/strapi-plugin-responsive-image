const { existsSync } = require('fs');

module.exports = async function () {
  const opts = this.opts();
  const { ids, all, filepath, cleanup } = opts;
  if (!all && !ids && !filepath && !cleanup) this.parent.error('Either use --all flag or pass item id --id or --filepath to pass json file containing ids or --cleanup');
  if (all && ids && cleanup) this.parent.error('Cannot use --all flag along with --id flag and --cleanup flag');
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
  } else if (cleanup) {
    entities = await strapi.plugin('responsive-image').service('upload-file').getCleanup();
  } else {
    entities = ids;
  }
  const plugin = 'responsive-image';
  const service = 'generate';
  const func = 'generateFromId';
  const data = [];
  entities.forEach(id => data.push({ id }));
  await strapi.plugin('sqs').service('sqs').enqueue(data, plugin, service, func);
}