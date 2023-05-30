const os = require('os');
const axios = require('axios');
const fse = require('fs-extra');
const crypto = require('crypto');
const stream = require('stream');
const { promisify } = require('util');
const { parse, dirname, join, format } = require('path');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { rmSync, readFileSync, createReadStream, createWriteStream } = require('fs');

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

module.exports = async function () {
  const opts = this.opts();
  const { ids, all, filepath } = opts;
  if (!all && !ids && !filepath) this.parent.error('Either use --all flag or pass item id --id or --filepath to pass json file containing ids');
  if (all && ids) this.parent.error('Cannot use --all flag along with --id flag');
  if (filepath && !existsSync(filepath)) this.parent.error(
    `${filepath} does not exist`
  );
  if (all) {
    console.log('Getting all Image ids');
    const select = '*';
    const entities = await strapi.db.query('plugin::upload.file').findMany({
      select
    });
    for (let x = 0; x < entities.length; x += 1) {
      console.log(`Processing ${x + 1} of ${entities.length}`);
      const { id, url, name, ext, hash, mime, formats } = entities[x];
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
    }
  }
}