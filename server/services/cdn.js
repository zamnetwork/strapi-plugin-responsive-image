const { getNewUrl } = require('../utils');

module.exports = (
  {
    strapi
  }
) => {
  return {
    
    async set({ id, url }) {
      const select = ['url', 'formats'];
      const entity = await strapi.plugin('responsive-image').service('upload-file').getOne(id, select);
      if (entity.url) entity.url = getNewUrl(entity.url, url);
      const { formats } = entity;
      if (formats) {
        Object.keys(formats).forEach(format => {
          const { url: oldUrl } = formats[format];
          formats[format]['url'] = getNewUrl(oldUrl, url);
        });
        entity.formats = formats;
      }
      console.log('Updating image in db');
      await strapi.plugin('upload').service('upload').update(id, {
        formats,
        url: entity.url
      })
        .catch(e => {
          console.log('Failed to update image in db');
          console.error(e);
          throw new Error(e);
        });
    },
  };
};
