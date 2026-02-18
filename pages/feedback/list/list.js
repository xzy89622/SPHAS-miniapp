const { request } = require('../../../utils/request');

Page({
  data: {
    loading: true,
    list: []
  },

  onShow() {
    this.load();
  },

  async load() {
    this.setData({ loading: true });
    try {
      const list = await request({ url: '/api/feedback/my', method: 'GET' });
      // 后端直接返回 List<Feedback>
      this.setData({ list: list || [] });
    } catch (e) {
      // request.js 已处理 toast
    } finally {
      this.setData({ loading: false });
    }
  },

  goSubmit() {
    wx.navigateTo({ url: '/pages/feedback/submit/submit' });
  },

  goDetail(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/feedback/detail/detail?id=${id}` });
  }
});
