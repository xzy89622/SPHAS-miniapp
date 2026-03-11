const socialApi = require('../../api/social.js');

function formatTime(timeStr) {
  if (!timeStr) return '';
  return String(timeStr)
    .replace('T', ' ')
    .replace(/\.\d+$/, '')
    .slice(0, 16);
}

function getUserName(post) {
  if (!post) return '用户';
  return post.nickname || post.nickName || post.username || post.userName || `用户${post.userId || ''}`;
}

function getAvatarText(name) {
  const text = String(name || '用').trim();
  return text ? text.slice(0, 1) : '用';
}

function safeArray(list) {
  return Array.isArray(list) ? list.filter(Boolean) : [];
}

function mapStatusText(status) {
  if (status === 1) return '已发布';
  if (status === 2) return '审核中';
  if (status === 3) return '已驳回';
  if (status === 0) return '已隐藏';
  return '未知状态';
}

function mapStatusTip(status) {
  if (status === 1) return '该帖子已通过审核，社区用户可见。';
  if (status === 2) return '该帖子正在等待管理员审核，审核通过后才会展示到社区。';
  if (status === 3) return '该帖子已被管理员驳回，你可以修改后重新提交审核。';
  if (status === 0) return '该帖子当前已被隐藏，具体原因请到消息中心查看审核通知。';
  return '';
}

Page({
  data: {
    id: 0,
    loading: true,
    errMsg: '',

    post: null,
    images: [],
    liked: false,
    likeBtnText: '点赞',
    canDelete: false,

    statusText: '',
    statusTip: '',
    canInteract: false,
    isOwnerView: false,
    canEditRejected: false,

    currentUserId: '',
    commentText: '',

    comments: [],
    cLoading: false,
    pageNum: 1,
    pageSize: 10,
    hasMore: true
  },

  onLoad(options) {
    const app = getApp();
    if (!app || typeof app.requireLogin !== 'function') return;
    if (!app.requireLogin()) return;

    const id = Number(options.id || 0);
    const currentUserId = wx.getStorageSync('userId') || '';

    this.setData({
      id,
      currentUserId
    });

    this.loadAll();
  },

  onPullDownRefresh() {
    this.loadAll().finally(() => wx.stopPullDownRefresh());
  },

  onReachBottom() {
    if (this.data.canInteract) {
      this.loadMore();
    }
  },

  async loadAll() {
    await this.loadDetail();

    if (this.data.canInteract) {
      await this.reloadComments();
    } else {
      this.setData({
        comments: [],
        hasMore: false,
        cLoading: false
      });
    }
  },

  updateOwnerFlags(post, currentUserId) {
    const uid = currentUserId || wx.getStorageSync('userId') || '';
    const isOwnerView = !!(uid && post && String(uid) === String(post.userId));
    const canDelete = isOwnerView;
    const canEditRejected = isOwnerView && Number(post.status) === 3;

    this.setData({
      canDelete,
      isOwnerView,
      canEditRejected
    });
  },

  async loadDetail() {
    this.setData({
      loading: true,
      errMsg: ''
    });

    try {
      const res = await socialApi.postDetail(this.data.id);
      const raw = res && res.post ? res.post : {};
      const liked = !!(res && res.liked);
      const images = safeArray(socialApi.parseImagesJson(raw.imagesJson));

      const nicknameText = getUserName(raw);
      const contentText = raw.content || raw.postContent || raw.text || '暂无内容';
      const status = Number(raw.status);

      const post = {
        ...raw,
        nicknameText,
        avatarText: getAvatarText(nicknameText),
        timeText: formatTime(raw.createTime),
        updateTimeText: formatTime(raw.updateTime),
        contentText,
        likeText: String(raw.likeCount || 0),
        commentText: String(raw.commentCount || 0)
      };

      const canInteract = status === 1;

      this.setData({
        post,
        images,
        liked,
        likeBtnText: liked ? '已点赞' : '点赞',
        statusText: mapStatusText(status),
        statusTip: mapStatusTip(status),
        canInteract
      });

      this.updateOwnerFlags(post, this.data.currentUserId);
    } catch (e) {
      console.error('[social detail] loadDetail fail =', e);
      this.setData({
        errMsg: e.msg || e.message || '加载详情失败'
      });
    } finally {
      this.setData({ loading: false });
    }
  },

  previewImg(e) {
    const src = e.currentTarget.dataset.src;
    const urls = safeArray(this.data.images);
    if (!src || urls.length === 0) return;

    wx.previewImage({
      current: src,
      urls
    });
  },

  async toggleLike() {
    if (!this.data.canInteract) {
      wx.showToast({
        title: '当前状态不可点赞',
        icon: 'none'
      });
      return;
    }

    try {
      await socialApi.toggleLike({
        postId: this.data.id
      });
      await this.loadDetail();
    } catch (e) {
      wx.showToast({
        title: e.msg || e.message || '操作失败',
        icon: 'none'
      });
    }
  },

  deletePost() {
    wx.showModal({
      title: '提示',
      content: '确认删除这条日志吗？',
      success: async (res) => {
        if (!res.confirm) return;

        try {
          await socialApi.deletePost(this.data.id);

          wx.showToast({
            title: '删除成功',
            icon: 'success'
          });

          setTimeout(() => {
            wx.navigateBack();
          }, 300);
        } catch (e) {
          wx.showToast({
            title: e.msg || e.message || '删除失败',
            icon: 'none'
          });
        }
      }
    });
  },

  goMessage() {
    wx.navigateTo({
      url: '/pages/message/list/list'
    });
  },

  goEditRejected() {
    if (!this.data.canEditRejected) return;
    wx.navigateTo({
      url: `/pages/social/edit/edit?id=${this.data.id}`
    });
  },

  onCommentInput(e) {
    this.setData({
      commentText: e.detail.value || ''
    });
  },

  async sendComment() {
    if (!this.data.canInteract) {
      wx.showToast({
        title: '当前状态不可评论',
        icon: 'none'
      });
      return;
    }

    const content = (this.data.commentText || '').trim();
    if (!content) {
      wx.showToast({
        title: '评论不能为空',
        icon: 'none'
      });
      return;
    }

    try {
      await socialApi.addComment({
        postId: this.data.id,
        content
      });

      this.setData({
        commentText: ''
      });

      await this.reloadComments();
      await this.loadDetail();

      wx.showToast({
        title: '评论成功',
        icon: 'success'
      });
    } catch (e) {
      wx.showToast({
        title: e.msg || e.message || '评论失败',
        icon: 'none'
      });
    }
  },

  async reloadComments() {
    this.setData({
      pageNum: 1,
      hasMore: true,
      comments: []
    });

    await this.fetchComments(true);
  },

  async loadMore() {
    if (this.data.cLoading || !this.data.hasMore) return;

    this.setData({
      pageNum: this.data.pageNum + 1
    });

    await this.fetchComments(false);
  },

  normalizeComments(list) {
    const arr = safeArray(list);

    return arr.map(item => {
      const row = item || {};
      const userText =
        row.nickname ||
        row.nickName ||
        row.username ||
        row.userName ||
        `用户${row.userId || ''}`;

      return {
        ...row,
        userText,
        avatarText: getAvatarText(userText),
        timeText: formatTime(row.createTime || row.updateTime),
        contentText: row.content || row.commentContent || row.text || '暂无内容'
      };
    });
  },

  async fetchComments(reset) {
    if (!this.data.canInteract) return;

    this.setData({
      cLoading: true
    });

    try {
      const res = await socialApi.pageComments({
        postId: this.data.id,
        pageNum: this.data.pageNum,
        pageSize: this.data.pageSize
      });

      const records = this.normalizeComments(res.records || []);
      const comments = reset ? records : this.data.comments.concat(records);
      const total = Number(res.total || 0);
      const hasMore = comments.length < total;

      this.setData({
        comments,
        hasMore
      });
    } catch (e) {
      console.error('[social detail] fetchComments fail =', e);
      wx.showToast({
        title: e.msg || e.message || '评论加载失败',
        icon: 'none'
      });
    } finally {
      this.setData({
        cLoading: false
      });
    }
  }
});