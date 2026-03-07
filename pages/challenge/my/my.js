// pages/challenge/my/my.js
const api = require('../../api/challenge');

Page({
  data: {
    loading: false,
    errMsg: '',
    list: []
  },

  onLoad() {
    this.loadList();
  },

  onPullDownRefresh() {
    this.loadList().finally(() => wx.stopPullDownRefresh());
  },

  async loadList() {
    this.setData({ loading: true, errMsg: '' });
    try {
      const res = await api.myChallenges();
      const list = Array.isArray(res) ? res : (res.records || res.list || []);
      this.setData({ list });
    } catch (e) {
      this.setData({ errMsg: e.msg || '加载失败' });
    } finally {
      this.setData({ loading: false });
    }
  },

  goDetail(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/challenge/detail/detail?id=${id}` });
  }
});