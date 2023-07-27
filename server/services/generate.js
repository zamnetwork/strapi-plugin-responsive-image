'use strict';
const os = require('os');
const jsdom = require('jsdom');
const axios = require('axios');
const fse = require('fs-extra');
const crypto = require('crypto');
const stream = require('stream');
const { promisify } = require('util');
const { parse, dirname, basename, join, format } = require('path');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { rmSync, readFileSync, createReadStream, createWriteStream } = require('fs');
const { getNewUrl } = require('../utils');
const { JSDOM } = jsdom;

async function download(url, filepath) {
  console.log(`Downloading image from ${url} to ${filepath}`);
  const result = await axios({
    url,
    method: 'get',
    responseType: 'stream'
  });
  const downloadStream = result.data;
  const writeStream = createWriteStream(filepath);
  const pipeline = promisify(stream.pipeline);
  await pipeline(downloadStream, writeStream)
    .catch(e => {
      console.error(`Downloading image failed: ${e}`);
    });
}

async function upload(filepath, Key) {
  console.log(`Uploading ${filepath} to S3`);
  const { providerOptions } = strapi.config.get('plugin.upload');
  const { params, credentials, region } = providerOptions;
  const { Bucket } = params;
  const Body = readFileSync(filepath);
  const client = new S3Client({ credentials, region });
  const uploadParams = {
    ACL: 'public-read',
    Bucket,
    Key,
    Body
  };
  const command = new PutObjectCommand(uploadParams);
  await client.send(command);
  const location = `https://${Bucket}.s3.amazonaws.com/${Key}`;
  return location;
}

function getS3KeyFromUrl(url, width, height) {
  url = new URL(url);
  const parsed = parse(url.pathname);
  const { dir, name, ext } = parsed;
  let key = `${dir}/${name}-${width}x${height}${ext}`;
  if (key.startsWith('/')) key = key.substring(1);
  return key;
}

async function uploadResponsiveFormats(formats, url, tmpWorkingDirectory) {
  for (let x = 0; x < formats.length; x +=1) {
    const { width, height } = formats[x].file;
    const key = getS3KeyFromUrl(url, width, height);
    const filepath = `${tmpWorkingDirectory}/${formats[x].file.hash}`;
    const location = await upload(filepath, key);
    formats[x].file.url = location;
    formats[x].file.path = dirname(key);
  }
  rmSync(tmpWorkingDirectory, { recursive: true, force: true });
}

async function generateResponsiveFormats(tmpWorkingDirectory, name, ext, hash, mime) {
  console.log('Generating the responsive formats');
  const file = {
    name,
    hash,
    ext,
    mime,
    tmpWorkingDirectory,
    getStream: () => createReadStream(`${tmpWorkingDirectory}/${name}`)
  }
  const files = await strapi.plugin('upload').service('image-manipulation').generateResponsiveFormats(file)
    .catch(e => {
      console.log('Failed to generate responsive formats')
      console.error(e)
    });
  return files;
}

async function generateThumbnail(tmpWorkingDirectory, name, ext, hash, mime, width, height) {
  console.log('Generating the thumbnail');
  const file = {
    name,
    hash,
    ext,
    mime,
    width,
    height,
    tmpWorkingDirectory,
    getStream: () => createReadStream(`${tmpWorkingDirectory}/${name}`)
  }
  const thumbnail = await strapi.plugin('upload').service('image-manipulation').generateThumbnail(file)
    .catch(e => {
      console.log('Failed to generate responsive formats')
      console.error(e)
    });
  return thumbnail;
}

module.exports = (
  {
    strapi
  }
) => {
  return {
    async generate(id, url, name, ext, hash, mime, formats) {
      const randomSuffix = crypto.randomBytes(5).toString('hex');
      const tmpWorkingDirectory = await fse.mkdtemp(join(os.tmpdir(), randomSuffix));
      const tmpFilepath = `${tmpWorkingDirectory}/${name}`;
      await download(url, tmpFilepath);
      const generatedFormats = await generateResponsiveFormats(tmpWorkingDirectory, name, ext, hash, mime);
      await uploadResponsiveFormats(generatedFormats, url, tmpWorkingDirectory);
      const formatsToKeep = ['thumbnail'];
      const updatedFormats = {}
      generatedFormats.forEach(format => {
        const { key, file } = format;
        updatedFormats[key] = file;
      });
      formatsToKeep.forEach(format => {
        if (Object.keys(formats).includes(format)) updatedFormats[format] = formats[format];
      });
      console.log('Updating image in db');
      await strapi.plugin('upload').service('upload').update(id, {
        formats: updatedFormats
      })
        .catch(e => {
          console.log('Failed to update image in db');
          console.error(e);
          throw new Error(e);
        });
    },
    async thumbnail(id, url, name, ext, hash, mime, formats, width, height) {
      const randomSuffix = crypto.randomBytes(5).toString('hex');
      const tmpWorkingDirectory = await fse.mkdtemp(join(os.tmpdir(), randomSuffix));
      const tmpFilepath = `${tmpWorkingDirectory}/${name}`;
      await download(url, tmpFilepath);
      const file = await generateThumbnail(tmpWorkingDirectory, name, ext, hash, mime, width, height);
      if (file) {
        await uploadResponsiveFormats([{file}], url, tmpWorkingDirectory);
        formats['thumbnail'] = file;
        await strapi.plugin('upload').service('upload').update(id, {
          formats
        })
          .catch(e => {
            console.log('Failed to update image in db');
            console.error(e);
            throw new Error(e);
          });
      }
    },
    async generateFromId({ id }) {
      const entity = await strapi.plugin('upload').service('upload').findOne(id, {
        populate: '*'
      });
      const { url, name, ext, hash, mime, formats } = entity;
      const unsupported = ['.mp4', '.bmp', '.heic', '.webm'];
      if (unsupported.includes(ext)) console.log(`Unsupported format ${ext}, ${url}`);
      else await this.generate(id, url, name, ext, hash, mime, formats);
    },
    async generateThumbnailFromId({ id }) {
      const entity = await strapi.plugin('upload').service('upload').findOne(id, {
        populate: '*'
      });
      const { url, name, ext, hash, mime, formats, width, height } = entity;
      const unsupported = ['.mp4', '.bmp', '.heic', '.webm'];
      if (unsupported.includes(ext)) console.log(`Unsupported format ${ext}, ${url}`);
      else await this.thumbnail(id, url, name, ext, hash, mime, formats, width, height);
    },
    async imgAttrSrcset(src) {
      const select = ['url', 'formats', 'width'];
      const name = basename(src);
      const where = { name };
      const entity = await strapi.plugin('responsive-image').service('upload-file').getOne(where, select);
      let srcset = '';
      if (entity) {
        const { cdn: { url: cdnUrl } } = strapi.config.get('plugin.upload');
        const { formats, width, url } = entity;
        srcset = `${url} ${width}w`;
        Object.keys(formats).forEach(format => {
          if (format !== 'thumbnail') {
            let { width: fWidth, url: fUrl } = formats[format];
            const parsed = new URL(fUrl);
            if (parsed.origin !== cdnUrl) fUrl = getNewUrl(fUrl, cdnUrl);
            srcset += `, ${fUrl} ${fWidth}w`;
          }
        });
      }
      return srcset;
    },
    imgAttrSizes() {
      let { img: { attrs: { sizes } } } = strapi.config.get('plugin.upload');
      if (!sizes) sizes = '100vw';
      return `${sizes}`;
    },
    async cleanContentImageUrls(content, cdnUrl) {
      const html = new JSDOM(content);
      const imageElements = html.window.document.getElementsByTagName('img');
      if (imageElements && imageElements.length) {
        for (let x = 0; x < imageElements.length; x += 1) {
          const element = imageElements[x];
          const src = element.getAttribute('src');
          // const attrsToKeep = ['src', 'srcset', 'alt', 'sizes', 'width'];
          const newUrl = getNewUrl(src, cdnUrl);
          element.setAttribute('src', newUrl);
          // const srcset = await this.imgAttrSrcset(newUrl);
          // element.setAttribute('srcset', srcset);
          let origSrcset = element.getAttribute('srcset');
          if (origSrcset) {
            origSrcset = strapi.plugin('responsive-image').service('cdn').updateSrcSet(origSrcset, cdnUrl);
            // const srcset = await this.imgAttrSrcset(newUrl);
            // element.setAttribute('srcset', `${origSrcset}, ${srcset}`);
            element.setAttribute('srcset', origSrcset);
          }
          // const sizes = this.imgAttrSizes();
          // element.setAttribute('sizes', sizes);
          // const attrs = element.getAttributeNames();
          // attrs.forEach(attr => {
          //   if (!attrsToKeep.includes(attr)) element.removeAttribute(attr);
          // });
        };
        return html.window.document.documentElement.outerHTML;
      }
    }
  };
};
