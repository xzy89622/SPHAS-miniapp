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

  if (/^https?:\/\/localhost:8080/i.test(value)) {
    return value.replace(/^https?:\/\/localhost:8080/i, base);
  }

  if (/^https?:\/\//i.test(value)) {
    return value;
  }

  if (value.startsWith('/')) {
    return base + value;
  }

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

function unwrapPage(res) {
  if (!res) {
    return {
      records: [],
      total: 0,
      pageNum: 1,
      pageSize: 10
    };
  }

  if (Array.isArray(res.records)) {
    return {
      records: res.records,
      total: Number(res.total || 0),
      pageNum: Number(res.current || res.pageNum || 1),
      pageSize: Number(res.size || res.pageSize || 10)
    };
  }

  if (res.data && Array.isArray(res.data.records)) {
    return {
      records: res.data.records,
      total: Number(res.data.total || 0),
      pageNum: Number(res.data.current || res.data.pageNum || 1),
      pageSize: Number(res.data.size || res.data.pageSize || 10)
    };
  }

  return {
    records: [],
    total: 0,
    pageNum: 1,
    pageSize: 10
  };
}

function uploadImage(filePath) {
  return new Promise((resolve, reject) => {
    const base = getBaseUrl();
    if (!base) {
      reject({ msg: 'BASE_URL 未配置' });
      return;
    }

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

function createPost(payload) {
  return request.post('/api/social/post/create', payload);
}

function updateRejectedPost(payload) {
  return request.post('/api/social/post/updateRejected', payload);
}

async function pagePosts(params) {
  const res = await request.get('/api/social/post/page', params || {});
  return unwrapPage(res);
}

async function pageMyPosts(params) {
  const res = await request.get('/api/social/query/v2/post/my/page', params || {});
  return unwrapPage(res);
}

function postDetail(postId) {
  return request.get('/api/social/post/detail', { postId });
}

async function pageComments(params) {
  const res = await request.get('/api/social/comment/page', params || {});
  return unwrapPage(res);
}

function addComment(payload) {
  return request.post('/api/social/comment/add', payload);
}

function toggleLike(payload) {
  return request.post('/api/social/like/toggle', payload);
}

function deletePost(postId) {
  return request.post(`/api/social/post/delete?postId=${postId}`, {});
}

module.exports = {
  getBaseUrl,
  getToken,
  toAbsoluteUrl,
  normalizeImageUrls,
  parseImagesJson,
  uploadImage,
  createPost,
  updateRejectedPost,
  pagePosts,
  pageMyPosts,
  postDetail,
  pageComments,
  addComment,
  toggleLike,
  deletePost
};