'use strict';
module.exports = (
  {
    strapi
  }
) => {
  return {
    async getAll(select = '*') {
      console.log('Getting all Images');
      const entities = await strapi.db.query('plugin::upload.file').findMany({
        select
      });
      return entities;
    },
    async getOne(id, select = '*') {
      console.log('Getting image by id');
      const entity = await strapi.db.query('plugin::upload.file').findOne({
        select,
        where: { id }
      });
      return entity;
    },
    async getCleanup() {
      const { formats } = await strapi.plugin('responsive-image').service('responsive-image').getSettings();
      const formatNames = [];
      formats.forEach(format => formatNames.push(format.name));
      if (!formatNames.includes('thumbnail')) formatNames.push('thumbnail');
      const select = ['id', 'formats'];
      const allEntities = await this.getAll(select);
      const entities = [];
      for (let x = 0; x < allEntities.length; x += 1) {
        const entity = allEntities[x];
        let add = false;
        const { id, formats: entityFormats } = entity;
        const entityFormatNames = Object.keys(entityFormats);
        for (let y = 0; y < formatNames.length; y += 1) {
          const name = formatNames[y];
          if (!entityFormatNames.includes(name)) {
            add = true;
            break;
          }
        };
        if (add) {
          entities.push(id);
          continue;
        } else if (formatNames.length != entityFormatNames.length) {
          entities.push(id);
        }
      };
      return entities;
    },
    async getFromFile(filepath, select = '*') {
      console.log(`Getting Images for ids in ${filepath}`);
      const $in = require(filepath);
      const where = {
        id: {
          $in
        }
      }
      const entities = await strapi.db.query('plugin::upload.file').findMany({
        select,
        where
      });
      return entities;
    },
    async getFromIds(ids, select = '*') {
      console.log(`Getting Images for ids: ${ids}`);
      const where = {
        id: {
          $in: ids
        }
      }
      const entities = await strapi.db.query('plugin::upload.file').findMany({
        select,
        where
      });
      return entities;
    }
  };
};