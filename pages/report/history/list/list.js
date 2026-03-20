const reportApi = require('../../../../utils/report');

Page({
  data: {
    activeTab: 'WEEK',
    loading: false,
    finished: false,
    pageNum: 1,
    pageSize: 10,
    list: [],
    total: 0,
    errMsg: ''
  },

  onLoad() {
    this.reloadList();
  },

  onPullDownRefresh() {
    this.reloadList().finally(() => {
      wx.stopPullDownRefresh();
    });
  },

  async reloadList() {
    this.setData({
      pageNum: 1,
      list: [],
      total: 0,
      finished: false
    });
    await this.loadList();
  },

  async loadList() {
    if (this.data.loading || this.data.finished) return;

    this.setData({
      loading: true,
      errMsg: ''
    });

    try {
      const res = await reportApi.historyPage({
        pageNum: this.data.pageNum,
        pageSize: this.data.pageSize,
        reportType: this.data.activeTab
      });

      const records = Array.isArray(res.records) ? res.records : [];
      const merged = this.data.list.concat(records.map(this.normalizeItem));

      this.setData({
        list: merged,
        total: Number(res.total || 0),
        pageNum: this.data.pageNum + 1,
        finished: merged.length >= Number(res.total || 0)
      });
    } catch (e) {
      console.error('[report history] load fail =', e);
      this.setData({
        errMsg: e.msg || e.message || '历史报告加载失败'
      });
    } finally {
      this.setData({
        loading: false
      });
    }
  },

  normalizeItem(raw) {
    return {
      id: raw.id,
      title: raw.title || '健康报告',
      reportType: raw.reportType || 'WEEK',
      reportTypeText: raw.reportType === 'MONTH' ? '月报' : '周报',
      weekStart: raw.weekStart || '-',
      weekEnd: raw.weekEnd || '-',
      summary: raw.summary || '暂无总结',
      updatedAt: raw.updatedAt || raw.createdAt || ''
    };
  },

  switchWeek() {
    if (this.data.activeTab === 'WEEK') return;
    this.setData({
      activeTab: 'WEEK'
    });
    this.reloadList();
  },

  switchMonth() {
    if (this.data.activeTab === 'MONTH') return;
    this.setData({
      activeTab: 'MONTH'
    });
    this.reloadList();
  },

  goDetail(e) {
    const id = e.currentTarget.dataset.id;
    if (!id) return;

    wx.navigateTo({
      url: `/pages/report/history/detail/detail?id=${id}`
    });
  },

  onReachBottom() {
    this.loadList();
  }
});