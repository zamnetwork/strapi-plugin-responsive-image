"use strict";
const cdn = require("./cdn");
const generate = require("./generate");
const uploadFile = require("./uploadFile");
const responsiveImage = require("./responsive-image");

module.exports = {
  cdn,
  generate,
  "upload-file": uploadFile,
  "responsive-image": responsiveImage,
};
