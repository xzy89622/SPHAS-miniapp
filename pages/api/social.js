// pages/api/social.js
const request = require('../../utils/request');

function getBaseUrl() {
  const url = wx.getStorageSync('BASE_URL') || '';
  return String(url).trim().replace(/\/+$/, '');
}

function getToken() {
  return wx.getStorageSync('token') || '';
}

function toAbsoluteUrl(url) {
  const value = String(url || '').trim();
  if (!value) return '';

  const base = getBaseUrl();
  if (!base) return value;

  // 把 localhost 替换成当前 BASE_URL
  if (/^https?:\/\/localhost:8080/i.test(value)) {
    return value.replace(/^https?:\/\/localhost:8080/i, base);
  }

  // 已经是完整地址
  if (/^https?:\/\//i.test(value)) {
    return value;
  }

  // /upload/xxx.png
  if (value.startsWith('/')) {
    return base + value;
  }

  // upload/xxx.png
  return `${base}/${value.replace(/^\/+/, '')}`;
}

function normalizeImageUrls(images) {
  if (!Array.isArray(images)) return [];
  return images.map(item => toAbsoluteUrl(item)).filter(Boolean);
}

function parseImagesJson(imagesJson) {
  try {
    const arr = JSON.parse(imagesJson || '[]');
    return normalizeImageUrls(arr);
  } catch (e) {
    return [];
  }
}

// 上传图片
function uploadImage(filePath) {
  return new Promise((resolve, reject) => {
    const base = getBaseUrl();
    if (!base) return reject({ msg: 'BASE_URL 未配置' });

    const token = getToken();
    const header = {};
    if (token) {
      header.Authorization = token.startsWith('Bearer ')
        ? token
        : `Bearer ${token}`;
    }

    wx.uploadFile({
      url: base + '/api/social/upload',
      filePath,
      name: 'file',
      header,
      success(res) {
        try {
          const data = JSON.parse(res.data || '{}');
          if (data.code === 0 || data.code === 200 || data.code === '0' || data.code === '200') {
            resolve(toAbsoluteUrl(data.data));
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

// 发帖
function createPost(payload) {
  return request.post('/api/social/post/create', payload);
}

// 帖子分页
function pagePosts(params) {
  return request.get('/api/social/post/page', params || {});
}

// 帖子详情
function postDetail(postId) {
  return request.get('/api/social/post/detail', { postId });
}

// 评论分页
function pageComments(params) {
  return request.get('/api/social/comment/page', params || {});
}

// 评论
function addComment(payload) {
  return request.post('/api/social/comment/add', payload);
}

// 点赞/取消
function toggleLike(payload) {
  return request.post('/api/social/like/toggle', payload);
}

// 删除帖子
function deletePost(postId) {
  return request.post(`/api/social/post/delete?postId=${postId}`, {});
}

module.exports = {
  getBaseUrl,
  toAbsoluteUrl,
  normalizeImageUrls,
  parseImagesJson,
  uploadImage,
  createPost,
  pagePosts,
  postDetail,
  pageComments,
  addComment,
  toggleLike,
  deletePost
};