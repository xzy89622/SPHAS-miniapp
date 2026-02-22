// utils/upload.js
// 说明：统一上传入口，跟 utils/request.js 一个逻辑，避免上传能用、普通请求不能用。

const api = require("./request");

function uploadFeedbackImage(filePath) {
  // 后端：/api/feedback/upload
  return api.upload("/api/feedback/upload", filePath, "file", {});
}

module.exports = { uploadFeedbackImage };