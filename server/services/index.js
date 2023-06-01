"use strict";
const generate = require("./generate");
const uploadFile = require("./uploadFile");
const responsiveImage = require("./responsive-image");

module.exports = {
  generate,
  "upload-file": uploadFile,
  "responsive-image": responsiveImage,
};
