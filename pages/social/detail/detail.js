// pages/social/detail/detail.js
// 社区详情：详情 + 点赞 + 评论 + 删除
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

    commentText: '',
    comments: [],
    cLoading: false,
    pageNum: 1,
    pageSize: 10,
    hasMore: true
  },

  onLoad(options) {
    const id = Number(options.id || 0);
    this.setData({ id });
    this.loadAll();
  },

  async loadAll() {
    await Promise.all([
      this.loadDetail(),
      this.reloadComments()
    ]);
  },

  safeParseImages(imagesJson) {
    try {
      const arr = JSON.parse(imagesJson || '[]');
      if (!Array.isArray(arr)) return [];
      // 这里只做最基本过滤，避免假图把页面弄乱
      return arr.filter(url => typeof url === 'string' && url.trim());
    } catch (e) {
      return [];
    }
  },

  async loadDetail() {
    this.setData({ loading: true, errMsg: '' });
    try {
      const res = await socialApi.postDetail(this.data.id);

      const post = res && res.post ? res.post : null;
      const liked = !!(res && res.liked);
      const images = post ? this.safeParseImages(post.imagesJson) : [];

      // 兼容是否能删自己的帖子
      const uid = wx.getStorageSync('userId') || '';
      const canDelete = !!(uid && post && String(uid) === String(post.userId));

      this.setData({
        post,
        liked,
        images,
        canDelete
      });
    } catch (e) {
      this.setData({ errMsg: e.msg || '加载详情失败' });
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
      wx.showToast({ title: e.msg || '点赞失败', icon: 'none' });
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
          wx.showToast({ title: '删除成功', icon: 'success' });
          setTimeout(() => {
            wx.navigateBack();
          }, 300);
        } catch (e) {
          wx.showToast({ title: e.msg || '删除失败', icon: 'none' });
        }
      }
    });
  },

  onCommentInput(e) {
    this.setData({ commentText: e.detail.value || '' });
  },

  async sendComment() {
    const content = (this.data.commentText || '').trim();
    if (!content) {
      wx.showToast({ title: '评论不能为空', icon: 'none' });
      return;
    }

    try {
      await socialApi.addComment({
        postId: this.data.id,
        content
      });

      this.setData({ commentText: '' });
      await this.reloadComments();
      await this.loadDetail();
      wx.showToast({ title: '评论成功', icon: 'success' });
    } catch (e) {
      wx.showToast({ title: e.msg || '评论失败', icon: 'none' });
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
    this.setData({ pageNum: this.data.pageNum + 1 });
    await this.fetchComments(false);
  },

  async fetchComments(reset) {
    this.setData({ cLoading: true });
    try {
      const res = await socialApi.pageComments({
        postId: this.data.id,
        pageNum: this.data.pageNum,
        pageSize: this.data.pageSize
      });

      const records = res.records || [];
      const comments = reset ? records : this.data.comments.concat(records);
      const hasMore = comments.length < (res.total || comments.length);

      this.setData({
        comments,
        hasMore
      });
    } catch (e) {
      console.log('[social detail] fetchComments fail', e);
    } finally {
      this.setData({ cLoading: false });
    }
  }
});