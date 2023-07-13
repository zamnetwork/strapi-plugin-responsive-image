'use strict';

const getService = name => {
  return strapi.plugin('responsive-image').service(name);
};

const getNewUrl = (oldUrl, newUrl) => {
  const parsed = new URL(oldUrl);
  let url = `${newUrl}${parsed.pathname}`;
  url = url.replace('wp-content/', ''); // for stuff coming from wp
  return url;
};

module.exports = {
  getService,
  getNewUrl,
};