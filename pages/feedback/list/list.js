const { request } = require('../../../utils/request');
const { formatDateTime } = require('../../../utils/time');

Page({
  data: {
    loading: true,
    list: []
  },

  onShow() {
    this.load();
  },

  onPullDownRefresh() {
    this.load().finally(() => wx.stopPullDownRefresh());
  },

  async load() {
    this.setData({ loading: true });
    try {
      const list = await request({ url: '/api/feedback/my', method: 'GET' });

      const mapped = (list || []).map(x => ({
        ...x,
        // 统一字段兼容：createTime / createdAt
        _time: formatDateTime(x.createTime || x.createdAt),
        _statusText: x.status === 'CLOSED' ? '已处理' : (x.status === 'OPEN' ? '待处理' : '处理中'),
        _statusClass: x.status === 'CLOSED' ? 'ok' : 'warn'
      }));

      this.setData({ list: mapped });
    } catch (e) {
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
