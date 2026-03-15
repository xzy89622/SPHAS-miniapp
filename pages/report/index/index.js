const reportApi = require('../../../utils/report');

Page({
  data: {
    activeTab: 'weekly',
    loading: false,
    errMsg: '',
    report: null
  },

  onLoad() {
    this.loadReport();
  },

  onPullDownRefresh() {
    this.loadReport().finally(() => {
      wx.stopPullDownRefresh();
    });
  },

  async loadReport() {
    this.setData({
      loading: true,
      errMsg: ''
    });

    try {
      let res = null;

      if (this.data.activeTab === 'weekly') {
        res = await reportApi.weeklyReport();
      } else {
        res = await reportApi.monthlyReport();
      }

      this.setData({
        report: this.normalizeReport(res || {})
      });
    } catch (e) {
      console.error('[report] load fail =', e);
      this.setData({
        errMsg: e.msg || e.message || '报告加载失败'
      });
    } finally {
      this.setData({
        loading: false
      });
    }
  },

  normalizeReport(raw) {
    const suggestions = Array.isArray(raw.suggestions) ? raw.suggestions : [];

    return {
      from: raw.from || '-',
      to: raw.to || '-',
      days: Number(raw.days || 0),
      avgWeight: this.formatNumber(raw.avgWeight, 'kg'),
      avgSteps: this.formatInteger(raw.avgSteps, '步'),
      avgSleepHours: this.formatNumber(raw.avgSleepHours, '小时'),
      weightTrend: raw.weightTrend || '数据不足',
      bpRisk: raw.bpRisk ? '有偏高风险' : '暂无明显风险',
      summary: raw.summary || '暂无总结',
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
  },

  switchWeekly() {
    if (this.data.activeTab === 'weekly') return;
    this.setData({
      activeTab: 'weekly'
    });
    this.loadReport();
  },

  switchMonthly() {
    if (this.data.activeTab === 'monthly') return;
    this.setData({
      activeTab: 'monthly'
    });
    this.loadReport();
  }
});