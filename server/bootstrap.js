'use strict';
const { getNewUrl } = require('./utils');
/**
 * Upload plugin bootstrap.
 *
 * It initializes the provider and sets the default settings in db.
 */

module.exports = async (
  {
    strapi
  }
) => {
  // set plugin store
  const configurator = strapi.store({
    type: 'plugin',
    name: 'responsive-image',
    key: 'settings',
  });

  // if provider config does not exist set one by default
  const config = await configurator.get();

  if (!config) {
    await configurator.set({
      value: {
        formats: [
          {
            name: "large",
            width: 1000,
            fit: "cover",
            position: "centre",
            withoutEnlargement: false,
            convertToFormat: "",
          },
          {
            name: "medium",
            width: 750,
            fit: "cover",
            position: "centre",
            withoutEnlargement: false,
            convertToFormat: "",
          },
          {
            name: "small",
            width: 500,
            fit: "cover",
            position: "centre",
            withoutEnlargement: false,
            convertToFormat: "",
          },
        ],
        quality: 87,
        progressive: true,
      },
    });
  }

  strapi.db.lifecycles.subscribe({
    models: ['plugin::upload.file'],
    // use cdn url instead of origin
    async beforeCreate(data) {
      const { cdn: { url } } = strapi.config.get('plugin.upload');
      const { params: { data: { url: oldUrl, formats }}} = data;
      data.params.data.url = getNewUrl(oldUrl, url);
      if (formats) {
        Object.keys(formats).forEach(format => {
          const { url: oldUrl } = formats[format];
          formats[format]['url'] = getNewUrl(oldUrl, url);
        });
        data.params.data.formats = formats;
      }
    },
  });
};