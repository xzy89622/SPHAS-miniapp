const request = require('../../../utils/request');

Page({
  data: {
    loading: false,
    evaluating: false,
    days: 30,

    chartWidth: 320,
    chartHeight: 180,
    chartReady: false,

    dashboard: {
      days: 30,
      total: 0,
      levelCounts: {
        LOW: 0,
        MID: 0,
        HIGH: 0
      },
      levelRatio: {
        LOW: 0,
        MID: 0,
        HIGH: 0
      },
      daily: [],
      latestHighTime: '',
      aiConclusion: ''
    },

    latestResult: null,
    historyList: [],
    errorMsg: ''
  },

  onLoad() {
    this.initChartSize();
    this.reloadAll();
  },

  onShow() {
    this.reloadAll();
  },

  onPullDownRefresh() {
    this.reloadAll(true);
  },

  initChartSize() {
    try {
      const sys = wx.getSystemInfoSync();
      const windowWidth = sys.windowWidth || 375;

      this.setData({
        chartWidth: windowWidth - 24,
        chartHeight: 180,
        chartReady: true
      }, () => {
        this.drawRiskTrend();
      });
    } catch (e) {
      console.error('[risk] initChartSize fail =', e);
    }
  },

  reloadAll(fromPullDown) {
    this.setData({
      loading: true,
      errorMsg: ''
    });

    Promise.all([
      this.loadDashboard(this.data.days),
      this.loadHistory()
    ]).then(([dashboard, history]) => {
      this.setData({
        dashboard: dashboard || this.data.dashboard,
        historyList: Array.isArray(history) ? history.map(this.normalizeHistoryItem) : []
      }, () => {
        this.drawRiskTrend();
      });
    }).catch(e => {
      console.error('[risk] reloadAll fail =', e);
      this.setData({
        errorMsg: (e && e.msg) || (e && e.message) || '风险页面加载失败'
      });
    }).finally(() => {
      this.setData({ loading: false });
      if (fromPullDown) {
        wx.stopPullDownRefresh();
      }
    });
  },

  loadDashboard(days) {
    return request.get('/api/risk/dashboard', { days }).then(res => {
      return this.normalizeDashboard(res || {});
    });
  },

  loadHistory() {
    return request.get('/api/risk/history', { limit: 10 });
  },

  normalizeDashboard(raw) {
    const levelCounts = raw.levelCounts || {};
    const levelRatio = raw.levelRatio || {};

    return {
      days: raw.days || this.data.days || 30,
      total: Number(raw.total || 0),
      levelCounts: {
        LOW: Number(levelCounts.LOW || 0),
        MID: Number(levelCounts.MID || 0),
        HIGH: Number(levelCounts.HIGH || 0)
      },
      levelRatio: {
        LOW: Number(levelRatio.LOW || 0),
        MID: Number(levelRatio.MID || 0),
        HIGH: Number(levelRatio.HIGH || 0)
      },
      daily: Array.isArray(raw.daily) ? raw.daily : [],
      latestHighTime: raw.latestHighTime || '',
      aiConclusion: raw.aiConclusion || ''
    };
  },

  normalizeHistoryItem(item) {
    const x = item || {};
    let reasons = [];

    if (Array.isArray(x.reasons)) {
      reasons = x.reasons;
    } else if (typeof x.reasonsJson === 'string' && x.reasonsJson) {
      try {
        const parsed = JSON.parse(x.reasonsJson);
        if (Array.isArray(parsed)) {
          reasons = parsed;
        } else {
          reasons = [x.reasonsJson];
        }
      } catch (e) {
        reasons = [x.reasonsJson];
      }
    }

    return {
      id: x.id || '',
      riskLevel: x.riskLevel || '',
      riskScore: Number(x.riskScore || 0),
      reasons: reasons,
      advice: x.advice || '',
      aiSummary: x.aiSummary || '',
      createTime: x.createTime || ''
    };
  },

  normalizeEvaluateResult(raw) {
    return {
      riskLevel: raw.riskLevel || '',
      riskScore: Number(raw.riskScore || 0),
      reasons: Array.isArray(raw.reasons) ? raw.reasons : [],
      advice: raw.advice || '',
      aiSummary: raw.aiSummary || '',
      aiPrediction: raw.aiPrediction || null
    };
  },

  doEvaluate() {
    this.setData({
      evaluating: true,
      errorMsg: ''
    });

    request.post('/api/risk/evaluate', {}).then(res => {
      const latestResult = this.normalizeEvaluateResult(res || {});
      this.setData({ latestResult });

      wx.showToast({
        title: '评估完成',
        icon: 'success'
      });

      this.reloadAll();
    }).catch(e => {
      console.error('[risk] doEvaluate fail =', e);
      this.setData({
        errorMsg: (e && e.msg) || (e && e.message) || '生成预警失败'
      });
    }).finally(() => {
      this.setData({ evaluating: false });
    });
  },

  changeDays(e) {
    const days = Number(e.currentTarget.dataset.days || 30);
    this.setData({ days });
    this.refreshDashboardOnly();
  },

  refreshDashboardOnly() {
    this.setData({
      loading: true,
      errorMsg: ''
    });

    this.loadDashboard(this.data.days).then(dashboard => {
      this.setData({ dashboard }, () => {
        this.drawRiskTrend();
      });
    }).catch(e => {
      console.error('[risk] refreshDashboardOnly fail =', e);
      this.setData({
        errorMsg: (e && e.msg) || (e && e.message) || '刷新看板失败'
      });
    }).finally(() => {
      this.setData({ loading: false });
    });
  },

  drawRiskTrend() {
    if (!this.data.chartReady) return;

    const daily = Array.isArray(this.data.dashboard.daily) ? this.data.dashboard.daily : [];
    const width = this.data.chartWidth || 320;
    const height = this.data.chartHeight || 180;

    const ctx = wx.createCanvasContext('riskTrendCanvas', this);
    ctx.clearRect(0, 0, width, height);
    ctx.setFillStyle('#ffffff');
    ctx.fillRect(0, 0, width, height);

    if (!daily.length) {
      ctx.setFillStyle('#999999');
      ctx.setFontSize(14);
      ctx.fillText('暂无趋势数据', width / 2 - 42, height / 2);
      ctx.draw();
      return;
    }

    const parsed = daily.map(item => {
      const rawDate = item.day || item.date || item.label || '';
      const rawValue = item.count !== undefined
        ? item.count
        : (item.total !== undefined ? item.total : (item.value !== undefined ? item.value : 0));

      return {
        label: this.formatShortDate(rawDate),
        value: Number(rawValue || 0)
      };
    });

    const padding = {
      top: 20,
      right: 16,
      bottom: 32,
      left: 30
    };

    const chartW = width - padding.left - padding.right;
    const chartH = height - padding.top - padding.bottom;

    const maxValue = Math.max.apply(null, parsed.map(item => item.value).concat([1]));
    const pointCount = parsed.length;
    const stepX = pointCount > 1 ? chartW / (pointCount - 1) : chartW / 2;

    ctx.setStrokeStyle('#dddddd');
    ctx.setLineWidth(1);
    ctx.beginPath();
    ctx.moveTo(padding.left, padding.top);
    ctx.lineTo(padding.left, padding.top + chartH);
    ctx.lineTo(padding.left + chartW, padding.top + chartH);
    ctx.stroke();

    const gridCount = 4;
    for (let i = 0; i <= gridCount; i++) {
      const y = padding.top + (chartH / gridCount) * i;

      ctx.setStrokeStyle('#f0f0f0');
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(padding.left + chartW, y);
      ctx.stroke();

      const val = Math.round(maxValue - (maxValue / gridCount) * i);
      ctx.setFillStyle('#999999');
      ctx.setFontSize(10);
      ctx.fillText(String(val), 4, y + 3);
    }

    const points = parsed.map((item, index) => {
      const x = pointCount > 1
        ? padding.left + stepX * index
        : padding.left + chartW / 2;
      const y = padding.top + chartH - (item.value / maxValue) * chartH;

      return {
        x,
        y,
        label: item.label,
        value: item.value
      };
    });

    if (points.length > 0) {
      ctx.beginPath();
      ctx.moveTo(points[0].x, padding.top + chartH);
      points.forEach(p => {
        ctx.lineTo(p.x, p.y);
      });
      ctx.lineTo(points[points.length - 1].x, padding.top + chartH);
      ctx.closePath();
      ctx.setFillStyle('rgba(47,107,255,0.12)');
      ctx.fill();

      ctx.beginPath();
      points.forEach((p, index) => {
        if (index === 0) {
          ctx.moveTo(p.x, p.y);
        } else {
          ctx.lineTo(p.x, p.y);
        }
      });
      ctx.setStrokeStyle('#2f6bff');
      ctx.setLineWidth(2);
      ctx.stroke();

      points.forEach(p => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
        ctx.setFillStyle('#2f6bff');
        ctx.fill();
      });

      const labelStep = pointCount > 10 ? Math.ceil(pointCount / 6) : 1;
      points.forEach((p, index) => {
        if (index % labelStep !== 0 && index !== points.length - 1) return;
        ctx.setFillStyle('#999999');
        ctx.setFontSize(10);
        ctx.fillText(p.label, p.x - 12, padding.top + chartH + 18);
      });
    }

    ctx.draw();
  },

  formatShortDate(dateStr) {
    if (!dateStr) return '';
    const s = String(dateStr);
    if (s.indexOf('-') > -1) {
      const arr = s.split('-');
      if (arr.length >= 3) {
        return arr[1] + '-' + arr[2];
      }
    }
    return s.length > 5 ? s.slice(-5) : s;
  },

  goRecord() {
    wx.navigateTo({
      url: '/pages/health/record/record'
    });
  },

  goLatest() {
    wx.navigateTo({
      url: '/pages/health/latest/latest'
    });
  }
});