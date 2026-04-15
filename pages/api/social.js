const request = require('../../utils/request');

// 这里把社区相关接口统一一下，后面页面都走这一份

function parseImagesJson(imagesJson) {
  if (!imagesJson) return [];
  if (Array.isArray(imagesJson)) return imagesJson.filter(Boolean);

  try {
    const arr = JSON.parse(imagesJson);
    return Array.isArray(arr) ? arr.filter(Boolean) : [];
  } catch (e) {
    return [];
  }
}

function formatStatus(status) {
  const value = Number(status);

  // 后端现在是：0隐藏 1通过 2待审核 3驳回
  if (value === 1) {
    return {
      value: 1,
      text: '已发布',
      className: 'ok'
    };
  }

  if (value === 2) {
    return {
      value: 2,
      text: '待审核',
      className: 'pending'
    };
  }

  if (value === 3) {
    return {
      value: 3,
      text: '已驳回',
      className: 'reject'
    };
  }

  return {
    value: 0,
    text: '已隐藏',
    className: 'hidden'
  };
}

function normalizePost(post) {
  const row = post || {};
  const images = parseImagesJson(row.imagesJson || row.images);
  const statusInfo = formatStatus(row.status);
  const nickname = row.nickname || row.nickName || row.username || row.userName || `用户${row.userId || ''}`;

  return {
    ...row,
    id: Number(row.id || 0),
    userId: Number(row.userId || 0),
    nickname,
    images,
    coverImage: images.length ? images[0] : '',
    imageCount: images.length,
    likeCount: Number(row.likeCount || 0),
    commentCount: Number(row.commentCount || 0),
    deletedFlag: Number(row.deletedFlag || 0),
    status: statusInfo.value,
    statusText: statusInfo.text,
    statusClass: statusInfo.className
  };
}

function normalizePostPage(res) {
  const page = res || {};
  const records = Array.isArray(page.records) ? page.records : [];

  return {
    ...page,
    records: records.map(normalizePost),
    total: Number(page.total || 0),
    current: Number(page.current || page.pageNum || 1),
    size: Number(page.size || page.pageSize || 10)
  };
}

function normalizeComment(comment) {
  const row = comment || {};
  return {
    ...row,
    id: Number(row.id || 0),
    postId: Number(row.postId || 0),
    userId: Number(row.userId || 0),
    nickname: row.nickname || row.nickName || row.username || row.userName || `用户${row.userId || ''}`,
    content: row.content || row.commentContent || ''
  };
}

function normalizeCommentPage(res) {
  const page = res || {};
  const records = Array.isArray(page.records) ? page.records : [];

  return {
    ...page,
    records: records.map(normalizeComment),
    total: Number(page.total || 0),
    current: Number(page.current || page.pageNum || 1),
    size: Number(page.size || page.pageSize || 10)
  };
}

// 社区流分页
async function pagePosts(params) {
  const res = await request.get('/api/social/query/v2/post/page', params || {});
  return normalizePostPage(res);
}

// 我的帖子分页
async function myPosts(params) {
  const res = await request.get('/api/social/query/v2/post/my/page', params || {});
  return normalizePostPage(res);
}

// 我的帖子统计
async function myPostStats() {
  const res = await request.get('/api/social/query/v2/post/my/stats', {});
  return {
    total: Number(res.totalCount || 0),
    pending: Number(res.pendingCount || 0),
    passed: Number(res.publishedCount || 0),
    rejected: Number(res.rejectedCount || 0),
    hidden: Number(res.hiddenCount || 0)
  };
}

// 帖子详情
async function postDetail(postId) {
  const res = await request.get('/api/social/post/detail', { postId });
  const post = normalizePost(res && res.post ? res.post : {});

  return {
    ...res,
    post,
    liked: !!(res && res.liked)
  };
}

// 发布帖子
function createPost(data) {
  return request.post('/api/social/post/create', {
    content: data && data.content ? String(data.content).trim() : '',
    imagesJson: data && data.imagesJson ? data.imagesJson : '[]'
  });
}

// 只允许驳回后重新提交
function updatePost(data) {
  return request.post('/api/social/post/updateRejected', {
    postId: data && data.postId ? Number(data.postId) : Number(data && data.id),
    content: data && data.content ? String(data.content).trim() : '',
    imagesJson: data && data.imagesJson ? data.imagesJson : '[]'
  });
}

function deletePost(postId) {
  const id = Number(postId || 0);
  return request.post(`/api/social/post/delete?postId=${id}`, {});
}

function toggleLike(postId) {
  return request.post('/api/social/like/toggle', {
    postId: Number(postId)
  });
}

async function commentList(postId, params) {
  const query = Object.assign(
    {
      postId: Number(postId),
      pageNum: 1,
      pageSize: 20
    },
    params || {}
  );

  const res = await request.get('/api/social/query/v2/comment/page', query);
  return normalizeCommentPage(res);
}

function addComment(data) {
  return request.post('/api/social/comment/add', {
    postId: Number(data && data.postId),
    content: data && data.content ? String(data.content).trim() : ''
  });
}

function uploadSocialImage(filePath) {
  return new Promise((resolve, reject) => {
    const token = wx.getStorageSync('token') || '';
    const baseUrl = (wx.getStorageSync('BASE_URL') || '').replace(/\/+$/, '');

    if (!baseUrl) {
      reject(new Error('BASE_URL 未配置'));
      return;
    }

    wx.uploadFile({
      url: `${baseUrl}/api/social/upload`,
      filePath,
      name: 'file',
      header: token
        ? { Authorization: token.startsWith('Bearer ') ? token : `Bearer ${token}` }
        : {},
      success(res) {
        try {
          const data = JSON.parse(res.data || '{}');
          if (data.code === 200 || data.code === 0 || data.code === '200' || data.code === '0') {
            resolve(data.data || '');
            return;
          }
          reject(new Error(data.msg || '上传失败'));
        } catch (e) {
          reject(new Error('上传结果解析失败'));
        }
      },
      fail(err) {
        reject(err);
      }
    });
  });
}

module.exports = {
  parseImagesJson,
  formatStatus,
  normalizePost,
  normalizePostPage,
  normalizeComment,
  normalizeCommentPage,
  pagePosts,
  myPosts,
  myPostStats,
  postDetail,
  createPost,
  updatePost,
  deletePost,
  toggleLike,
  commentList,
  addComment,
  uploadSocialImage
};