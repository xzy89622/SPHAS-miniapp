// pages/social/list/list.js
const socialApi = require('../../api/social.js');

Page({
  data: {
    loading: false,
    errMsg: '',
    pageNum: 1,
    pageSize: 10,
    hasMore: true,
    posts: []
  },

  onLoad() {
    const app = getApp();
    if (!app || typeof app.requireLogin !== 'function') return;
    if (!app.requireLogin()) return;
    this.reload();
  },
  
  onShow() {
    const app = getApp();
    if (!app || typeof app.requireLogin !== 'function') return;
    if (!app.requireLogin()) return;
    this.reload();
  },

  onPullDownRefresh() {
    this.reload().finally(() => wx.stopPullDownRefresh());
  },

  onReachBottom() {
    this.loadMore();
  },

  formatTime(timeStr) {
    if (!timeStr) return '';
    return String(timeStr)
      .replace('T', ' ')
      .replace(/\.\d+$/, '')
      .slice(0, 16);
  },

  async reload() {
    this.setData({
      pageNum: 1,
      hasMore: true,
      posts: [],
      errMsg: ''
    });
    await this.fetchPage(true);
  },

  async loadMore() {
    if (this.data.loading || !this.data.hasMore) return;
    this.setData({ pageNum: this.data.pageNum + 1 });
    await this.fetchPage(false);
  },

  async fetchPage(reset) {
    this.setData({ loading: true });

    try {
      const res = await socialApi.pagePosts({
        pageNum: this.data.pageNum,
        pageSize: this.data.pageSize
      });

      console.log('[social list] page res =', res);

      const records = Array.isArray(res.records) ? res.records : [];
      const list = records.map(p => {
        const images = socialApi.parseImagesJson(p.imagesJson);
        return {
          ...p,
          _images: images,
          coverImage: images[0] || '',
          showTime: this.formatTime(p.createTime)
        };
      });

      const posts = reset ? list : this.data.posts.concat(list);
      const total = Number(res.total || 0);
      const hasMore = total > posts.length;

      this.setData({
        posts,
        hasMore
      });
    } catch (e) {
      console.log('[social list] fetchPage fail =', e);
      this.setData({
        errMsg: e.msg || '加载失败'
      });
    } finally {
      this.setData({ loading: false });
    }
  },

  goPublish() {
    wx.navigateTo({ url: '/pages/social/publish/publish' });
  },

  goDetail(e) {
    const id = e.currentTarget.dataset.id;
    if (!id) return;
    wx.navigateTo({ url: `/pages/social/detail/detail?id=${id}` });
  },

  previewImg(e) {
    const src = e.currentTarget.dataset.src;
    if (!src) return;

    wx.previewImage({
      urls: [src],
      current: src
    });
  }
});