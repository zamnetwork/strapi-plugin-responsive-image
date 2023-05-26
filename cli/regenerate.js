module.exports = async function () {
  const opts = this.opts();
  const { ids, all, filepath } = opts;
  if (!all && !ids && !filepath) this.parent.error('Either use --all flag or pass item id --id or --filepath to pass json file containing ids');
  if (all && ids.length) this.parent.error('Cannot use --all flag along with --id flag');
  if (filepath && !existsSync(filepath)) this.parent.error(
    `${filepath} does not exist`
  );
  if (all) {
    console.log('Getting all Image ids');
    const select = ['id', 'formats'];
    const limit = 10;
    const files = await strapi.db.query('plugin::upload.file').findMany({
      select,
      limit
    });
    console.log(files);
  }
}