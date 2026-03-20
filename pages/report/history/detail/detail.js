const reportApi = require('../../../../utils/report');

Page({
  data: {
    id: null,
    loading: false,
    errMsg: '',
    detail: null
  },

  onLoad(options) {
    const id = Number(options.id || 0);
    if (!id) {
      this.setData({
        errMsg: '报告ID无效'
      });
      return;
    }

    this.setData({ id });
    this.loadDetail();
  },

  onPullDownRefresh() {
    this.loadDetail().finally(() => {
      wx.stopPullDownRefresh();
    });
  },

  async loadDetail() {
    this.setData({
      loading: true,
      errMsg: ''
    });

    try {
      const res = await reportApi.historyDetail(this.data.id);

      this.setData({
        detail: this.normalizeDetail(res || {})
      });
    } catch (e) {
      console.error('[report detail] load fail =', e);
      this.setData({
        errMsg: e.msg || e.message || '报告详情加载失败'
      });
    } finally {
      this.setData({
        loading: false
      });
    }
  },

  normalizeDetail(raw) {
    const riskTips = Array.isArray(raw.riskTips) ? raw.riskTips : [];
    const suggestions = Array.isArray(raw.suggestions) ? raw.suggestions : [];

    return {
      id: raw.id,
      title: raw.title || '健康报告',
      reportTypeText: raw.reportType === 'MONTH' ? '月报' : '周报',
      weekStart: raw.weekStart || '-',
      weekEnd: raw.weekEnd || '-',
      summary: raw.summary || '暂无总结',
      avgWeight: this.formatNumber(raw.avgWeight, 'kg'),
      avgSteps: this.formatInteger(raw.avgSteps, '步'),
      avgSleepHours: this.formatNumber(raw.avgSleepHours, '小时'),
      weightTrend: raw.weightTrend || '数据不足',
      bpRiskCount: Number(raw.bpRiskCount || 0),
      recordCount: Number(raw.recordCount || 0),
      userCount: Number(raw.userCount || 0),
      updatedAt: raw.updatedAt || raw.createdAt || '',
      riskTips,
      suggestions
    };
  },

  formatNumber(v, unit) {
    if (v === null || v === undefined || v === '') {
      return '--';
    }
    const n = Number(v);
    if (Number.isNaN(n)) {
      return '--';
    }
    return `${n}${unit || ''}`;
  },

  formatInteger(v, unit) {
    if (v === null || v === undefined || v === '') {
      return '--';
    }
    const n = Number(v);
    if (Number.isNaN(n)) {
      return '--';
    }
    return `${parseInt(n, 10)}${unit || ''}`;
  }
});