const { request } = require('../../../utils/request');

Page({
  data: {
    id: null,
    loading: true,
    detail: null
  },

  onLoad(options) {
    this.setData({ id: options.id });
    this.load();
  },

  async load() {
    this.setData({ loading: true });
    try {
      const detail = await request({
        url: `/api/feedback/${this.data.id}/detail`,
        method: 'GET'
      });
      this.setData({ detail });
    } catch (e) {
    } finally {
      this.setData({ loading: false });
    }
  },

  previewRemote(e) {
    const src = e.currentTarget.dataset.src;
    const urls = (this.data.detail.attachments || []).map(a => a.fileUrl);
    wx.previewImage({ current: src, urls });
  }
});
