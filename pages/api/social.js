// pages/api/social.js
// 社区日志 API（跟后端 /api/social 对齐）

const request = require('../../utils/request');

function getBaseUrl() {
  const url = wx.getStorageSync('BASE_URL') || '';
  return String(url).trim().replace(/\/+$/, '');
}

function getToken() {
  return wx.getStorageSync('token') || '';
}

// ✅ 上传图片：返回可访问的图片 URL
function uploadImage(filePath) {
  return new Promise((resolve, reject) => {
    const base = getBaseUrl();
    if (!base) return reject({ msg: 'BASE_URL 未配置' });

    const token = getToken();
    const header = {};
    if (token) header.Authorization = token.startsWith('Bearer ') ? token : `Bearer ${token}`;

    wx.uploadFile({
      url: base + '/api/social/upload',
      filePath,
      name: 'file',
      header,
      success(res) {
        try {
          const data = JSON.parse(res.data || '{}');
          // 兼容后端 R 结构：{code,msg,data}
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

// ✅ 发帖（content + imagesJson）
function createPost(payload) {
  return request.post('/api/social/post/create', payload);
}

// ✅ 帖子分页
function pagePosts(params) {
  return request.get('/api/social/post/page', params || {});
}

// ✅ 帖子详情
function postDetail(postId) {
  return request.get('/api/social/post/detail', { postId });
}

// ✅ 评论分页
function pageComments(params) {
  return request.get('/api/social/comment/page', params || {});
}

// ✅ 评论
function addComment(payload) {
  return request.post('/api/social/comment/add', payload);
}

// ✅ 点赞/取消
function toggleLike(payload) {
  return request.post('/api/social/like/toggle', payload);
}

// ✅ 删除帖子
function deletePost(postId) {
  // 后端是 @RequestParam，所以用 query
  return request.post('/api/social/post/delete', {}, { url: `/api/social/post/delete?postId=${postId}` });
}

module.exports = {
  uploadImage,
  createPost,
  pagePosts,
  postDetail,
  pageComments,
  addComment,
  toggleLike,
  deletePost
};