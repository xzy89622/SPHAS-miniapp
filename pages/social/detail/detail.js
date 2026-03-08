// pages/social/detail/detail.js
const socialApi = require('../../api/social.js');

Page({
  data: {
    id: 0,
    loading: true,
    errMsg: '',
    post: null,
    images: [],
    liked: false,
    canDelete: false,

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

  onShow() {
    const app = getApp();
    if (!app || typeof app.requireLogin !== 'function') return;
    if (!app.requireLogin()) return;
  
    const currentUserId = wx.getStorageSync('userId') || '';
    if (String(currentUserId) !== String(this.data.currentUserId || '')) {
      this.setData({ currentUserId });
      if (this.data.post) {
        this.updateCanDelete(this.data.post, currentUserId);
      }
    }
  },

  async loadAll() {
    await Promise.all([
      this.loadDetail(),
      this.reloadComments()
    ]);
  },

  safeParseImages(imagesJson) {
    return socialApi.parseImagesJson(imagesJson);
  },

  formatTime(timeStr) {
    if (!timeStr) return '';
    return String(timeStr)
      .replace('T', ' ')
      .replace(/\.\d+$/, '')
      .slice(0, 16);
  },

  updateCanDelete(post, currentUserId) {
    const uid = currentUserId || wx.getStorageSync('userId') || '';
    const canDelete = !!(uid && post && String(uid) === String(post.userId));
    this.setData({ canDelete });
  },

  async loadDetail() {
    this.setData({ loading: true, errMsg: '' });

    try {
      const res = await socialApi.postDetail(this.data.id);

      const postRaw = res && res.post ? res.post : null;
      const liked = !!(res && res.liked);
      const images = postRaw ? this.safeParseImages(postRaw.imagesJson) : [];

      const post = postRaw
        ? {
            ...postRaw,
            showTime: this.formatTime(postRaw.createTime),
            showLikeCount: postRaw.likeCount || 0,
            showCommentCount: postRaw.commentCount || 0
          }
        : null;

      this.setData({
        post,
        liked,
        images
      });

      this.updateCanDelete(post, this.data.currentUserId);
    } catch (e) {
      this.setData({
        errMsg: e.msg || '加载详情失败'
      });
      console.log('[social detail] loadDetail fail', e);
    } finally {
      this.setData({ loading: false });
    }
  },

  previewImg(e) {
    const src = e.currentTarget.dataset.src;
    if (!src) return;

    wx.previewImage({
      urls: this.data.images,
      current: src
    });
  },

  async toggleLike() {
    try {
      await socialApi.toggleLike({ postId: this.data.id });
      await this.loadDetail();
    } catch (e) {
      wx.showToast({
        title: e.msg || '点赞失败',
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
            title: e.msg || '删除失败',
            icon: 'none'
          });
        }
      }
    });
  },

  onCommentInput(e) {
    this.setData({
      commentText: e.detail.value || ''
    });
  },

  async sendComment() {
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
        title: e.msg || '评论失败',
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
    if (!Array.isArray(list)) return [];
    return list.map(item => ({
      ...item,
      showTime: this.formatTime(item.createTime || item.updateTime)
    }));
  },

  async fetchComments(reset) {
    this.setData({ cLoading: true });

    try {
      const res = await socialApi.pageComments({
        postId: this.data.id,
        pageNum: this.data.pageNum,
        pageSize: this.data.pageSize
      });

      const records = this.normalizeComments(res.records || []);
      const comments = reset ? records : this.data.comments.concat(records);
      const total = Number(res.total || 0);
      const hasMore = total > comments.length;

      this.setData({
        comments,
        hasMore
      });
    } catch (e) {
      console.log('[social detail] fetchComments fail', e);
      wx.showToast({
        title: e.msg || '评论加载失败',
        icon: 'none'
      });
    } finally {
      this.setData({ cLoading: false });
    }
  }
});