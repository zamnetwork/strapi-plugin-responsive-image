"use strict";
/**
 * Image manipulation functions
 */
const fs = require("fs");
const { join, parse } = require("path");
const sharp = require("sharp");

const { bytesToKbytes } = require("@strapi/plugin-upload/server/utils/file");
const { getService } = require("../utils");
const imageManipulation = require("@strapi/plugin-upload/server/services/image-manipulation");

const writeStreamToFile = (stream, path) =>
  new Promise((resolve, reject) => {
    const writeStream = fs.createWriteStream(path);
    // Reject promise if there is an error with the provided stream
    stream.on("error", reject);
    stream.pipe(writeStream);
    writeStream.on("close", resolve);
    writeStream.on("error", reject);
  });

const getMetadata = (file) =>
  new Promise((resolve, reject) => {
    const pipeline = sharp();
    pipeline.metadata().then(resolve).catch(reject);
    file.getStream().pipe(pipeline);
  });

const THUMBNAIL_RESIZE_OPTIONS = {
  width: 245,
  height: 156,
  fit: 'inside',
};

const resizeFileTo = async (
  file,
  options,
  quality,
  progressive,
  autoOrientation,
  { hash, ext }
) => {
  const filePath = join(file.tmpWorkingDirectory, hash);

  let sharpInstance = autoOrientation ? sharp().rotate() : sharp();

  if (options.convertToFormat) {
    sharpInstance = sharpInstance.toFormat(options.convertToFormat);
  }

  await writeStreamToFile(
    file.getStream().pipe(
      sharpInstance
        .resize(options)
        .jpeg({ quality, progressive, force: false })
        .png({
          compressionLevel: Math.floor((quality / 100) * 9),
          progressive,
          force: false,
        })
        .webp({ quality, force: false })
        .tiff({ quality, force: false })
    ),
    filePath
  );
  const newFile = {
    hash,
    ext,
    mime: file.mime,
    path: file.path || null,
    getStream: () => fs.createReadStream(filePath),
  };

  const { width, height, size } = await getMetadata(newFile);

  Object.assign(newFile, { width, height, size: bytesToKbytes(size) });
  return newFile;
};

const generateThumbnail = async (file) => {
  if (
    file.width > THUMBNAIL_RESIZE_OPTIONS.width ||
    file.height > THUMBNAIL_RESIZE_OPTIONS.height
  ) {
    const quality = 87;
    const progressive = true;
    const autoOrientation = false;
    const parsed = parse(file.name);
    const newFile = await resizeFileTo(file, THUMBNAIL_RESIZE_OPTIONS,
      quality, progressive, autoOrientation, {
      hash: `thumbnail_${file.hash}`,
    });
    const { name, ext } = parsed;
    newFile.name = `${name}-${newFile.width}x${newFile.height}${ext}`;
    newFile.ext = ext;
    return newFile;
  }

  return null;
};

const generateResponsiveFormats = async (file) => {
  const { responsiveDimensions = false, autoOrientation = false } = await strapi
    .plugin("upload")
    .service("upload")
    .getSettings();

  if (!responsiveDimensions) return [];

  // if (!(await isImage(file))) {
  //   return [];
  // }

  const { formats, quality, progressive } = await getService(
    "responsive-image"
  ).getSettings();

  const x2Formats = [];
  const x1Formats = formats.map((format) => {
    if (format.x2) {
      x2Formats.push(
        generateBreakpoint(`${format.name}_x2`, {
          file,
          format: {
            ...format,
            width: format.width * 2,
            height: format.height ? format.height * 2 : null,
          },
          quality,
          progressive,
          autoOrientation,
        })
      );
    }
    return generateBreakpoint(format.name, {
      file,
      format,
      quality,
      progressive,
      autoOrientation,
    });
  });

  return Promise.all([...x1Formats, ...x2Formats]);
};

const getFileExtension = (file, { convertToFormat }) => {
  if (!convertToFormat) {
    return file.ext;
  }

  return `.${convertToFormat}`;
};

const generateBreakpoint = async (
  key,
  { file, format, quality, progressive, autoOrientation }
) => {
  const newFile = await resizeFileTo(
    file,
    format,
    quality,
    progressive,
    autoOrientation,
    {
      hash: `${key}_${file.hash}`,
      ext: getFileExtension(file, format),
    }
  );
  const parsed = parse(file.name);
  const { name, ext } = parsed;
  newFile.name = `${name}-${newFile.width}x${newFile.height}${ext}`;
  return {
    key,
    file: newFile,
  };
};

module.exports = () => ({
  ...imageManipulation(),
  generateThumbnail,
  generateResponsiveFormats,
});
