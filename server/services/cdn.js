const { getNewUrl } = require('../utils');

module.exports = (
  {
    strapi
  }
) => {
  return {
    async set({ id, url }) {
      const select = ['url', 'formats'];
      const where = { id };
      const entity = await strapi.plugin('responsive-image').service('upload-file').getOne(where, select);
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
    async setEmbedded({ id, url }) {
      const select = ['content', 'updatedAt'];
      const where = { id };
      const entity = await strapi.db.query('api::post.post').findOne({
        select,
        where
      });
      if (entity) {
        const { content } = entity;
        const cleanedContent = await strapi.plugin('responsive-image').service('generate').cleanContentImageUrls(content, url);
        if (cleanedContent) {
          await strapi.entityService.update('api::post.post', id, {
            data: {
              content: cleanedContent
            }
          });
        }
      }
    },
    updateSrcSet(srcset, cdnUrl) {
      const sets = srcset.split(', ');
      let newSrcset = '';
      sets.forEach(set => {
        let [ url, width ] = set.split(' ');
        const newUrl = getNewUrl(url, cdnUrl);
        newSrcset += `${newUrl} ${width}, `;
      });
      return newSrcset.slice(0, -2); //remove trailing ', '
    }
  };
};
