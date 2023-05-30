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