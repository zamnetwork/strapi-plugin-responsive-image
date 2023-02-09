const pluginPkg = require('../../package.json');
const pluginId = pluginPkg.name.replace(
  /^@zam\/strapi-plugin-/i,
  ''
);

module.exports = pluginId;
