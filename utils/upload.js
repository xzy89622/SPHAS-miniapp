const request = require('./request');

function getBaseUrl() {
  return String(wx.getStorageSync('BASE_URL') || '').trim().replace(/\/+$/, '');
}

function getToken() {
  return wx.getStorageSync('token') || '';
}

function uploadFeedbackImage(filePath) {
  return new Promise((resolve, reject) => {
    const base = getBaseUrl();
    if (!base) {
      reject({ msg: 'BASE_URL 未配置' });
      return;
    }

    const token = getToken();
    const header = {};
    if (token) {
      header.Authorization = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
    }

    wx.uploadFile({
      url: base + '/api/feedback/upload',
      filePath,
      name: 'file',
      header,
      success(res) {
        try {
          const data = JSON.parse(res.data || '{}');
          if (data.code === 0 || data.code === 200 || data.code === '0' || data.code === '200') {
            resolve(data.data);
          } else {
            reject({ msg: data.msg || '上传失败', body: data });
          }
        } catch (e) {
          reject({ msg: '上传返回解析失败', raw: res.data });
        }
      },
      fail(err) {
        reject({ msg: err.errMsg || '上传失败', err });
      }
    });
  });
}

module.exports = { uploadFeedbackImage };