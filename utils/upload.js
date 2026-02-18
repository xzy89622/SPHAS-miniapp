// utils/upload.js
// 作用：封装 wx.uploadFile，自动带 token，返回后端的 fileUrl（字符串）

const { getToken } = require('./auth');

function uploadFeedbackImage(filePath) {
  const token = getToken();

  const app = getApp && getApp();
  const BASE_URL = (app && app.globalData && app.globalData.BASE_URL) ? app.globalData.BASE_URL : 'http://localhost:8080';

  return new Promise((resolve, reject) => {
    wx.uploadFile({
      url: BASE_URL + '/api/feedback/upload',
      filePath,
      name: 'file',
      header: {
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      success(res) {
        try {
          const body = JSON.parse(res.data || '{}');
          if (body.code === 0) {
            resolve(body.data); // 后端返回 URL 字符串
          } else {
            reject(new Error(body.msg || '上传失败'));
          }
        } catch (e) {
          reject(new Error('上传返回解析失败'));
        }
      },
      fail(err) {
        reject(err);
      }
    });
  });
}

module.exports = { uploadFeedbackImage };
