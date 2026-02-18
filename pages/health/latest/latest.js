const { request } = require('../../../utils/request');

Page({
  data: { loading: false, list: [] },

  onLoad() { this.loadList(); },
  onShow() { this.loadList(); },

  onPullDownRefresh() { this.loadList(true); },

  async loadList(fromPullDown = false) {
    try {
      this.setData({ loading: true });
      const list = await request({
        url: '/api/health/latest',
        method: 'GET',
        data: { limit: 7 }
      });
      this.setData({ list: Array.isArray(list) ? list : [] });
    } catch (e) {
      console.error(e);
    } finally {
      this.setData({ loading: false });
      if (fromPullDown) wx.stopPullDownRefresh();
    }
  },

  goRecord() {
    wx.navigateTo({ url: '/pages/health/record/record' });
  },

  edit(e) {
    const date = e.currentTarget.dataset.date;
    wx.navigateTo({ url: `/pages/health/record/record?recordDate=${date}` });
  }
});
