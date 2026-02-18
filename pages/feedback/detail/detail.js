const { request } = require('../../../utils/request');
const { formatDateTime } = require('../../../utils/time');

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

  onPullDownRefresh() {
    this.load().finally(() => wx.stopPullDownRefresh());
  },

  async load() {
    this.setData({ loading: true });
    try {
      const detail = await request({
        url: `/api/feedback/${this.data.id}/detail`,
        method: 'GET'
      });

      // 统一时间格式
      if (detail && detail.feedback) {
        detail.feedback._time = formatDateTime(detail.feedback.createTime || detail.feedback.createdAt);
      }
      (detail.replies || []).forEach(r => {
        r._time = formatDateTime(r.createTime || r.createdAt);
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
