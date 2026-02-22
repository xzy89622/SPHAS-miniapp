const api = require("../../../utils/request");

Page({
  data: {
    tab: 0,
    list: [],
  },

  onShow() {
    this.load();
  },

  setTab(e) {
    this.setData({ tab: Number(e.currentTarget.dataset.tab) }, () => this.load());
  },

  async load() {
    // ✅ 假设你后端消息接口：/api/message/page?isRead=0/1
    const isRead = this.data.tab === 0 ? 0 : 1;
    const data = await api.get("/api/message/page", { pageNum: 1, pageSize: 50, isRead });
    this.setData({ list: data.records || [] });
  },

  goDetail(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/message/detail/detail?id=${id}` });
  },
});