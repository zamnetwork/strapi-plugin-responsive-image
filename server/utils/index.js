'use strict';

const getService = name => {
  return strapi.plugin('responsive-image').service(name);
};

const getNewUrl = (oldUrl, newUrl) => {
  const parsed = new URL(oldUrl);
  return `${newUrl}${parsed.pathname}`;
};

module.exports = {
  getService,
  getNewUrl,
};