// pages/article/list/list.js
// 健康科普-文章列表（对接后端：GET /api/article/list）

const { request } = require('../../../utils/request');

Page({
  data: {
    list: [],
    loading: false,
    firstLoaded: false
  },

  onLoad() {
    this.loadList();
  },

  onPullDownRefresh() {
    this.loadList(true);
  },

  async loadList(fromPullDown = false) {
    try {
      this.setData({ loading: true });

      // 后端返回：R.ok(list) => request 通常会把 data 取出来
      const list = await request({
        url: '/api/article/list',
        method: 'GET'
      });

      // 兼容：如果 request 没有自动取 data，这里也能兜底
      const realList = Array.isArray(list) ? list : (list && list.data) ? list.data : [];

      this.setData({
        list: realList || [],
        loading: false,
        firstLoaded: true
      });
    } catch (e) {
      this.setData({ loading: false, firstLoaded: true });
    } finally {
      if (fromPullDown) wx.stopPullDownRefresh();
    }
  },

  goDetail(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/article/detail/detail?id=${id}` });
  }
});
