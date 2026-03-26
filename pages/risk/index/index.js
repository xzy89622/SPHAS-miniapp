const request = require('../../../utils/request');

const RISK_DETAIL_CACHE_KEY = 'RISK_DETAIL_CACHE';

Page({
  data: {
    loading: false,
    evaluating: false,
    days: 30,

    chartWidth: 320,
    chartHeight: 220,
    chartReady: false,

    chartHintVisible: false,
    chartHintLeft: 0,
    chartHintTop: 0,
    activeChartIndex: -1,
    activeChartLabel: '',
    activeChartValue: 0,

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
    this.chartMeta = null;
    this.chartPoints = [];
    this.chartRect = null;

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
        chartWidth: windowWidth - 36,
        chartHeight: 220,
        chartReady: true
      }, () => {
        this.measureChartRect();
        this.drawRiskTrend();
      });
    } catch (e) {
      console.error('[risk] initChartSize fail =', e);
    }
  },

  measureChartRect() {
    const query = wx.createSelectorQuery().in(this);
    query.select('#riskTrendCanvas').boundingClientRect(rect => {
      this.chartRect = rect || null;
    }).exec();
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
        historyList: Array.isArray(history) ? history.map(item => this.normalizeHistoryItem(item)) : []
      }, () => {
        this.measureChartRect();
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
    return request.get('/api/risk/history-with-advice', { limit: 10 });
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
        reasons = Array.isArray(parsed) ? parsed : [x.reasonsJson];
      } catch (e) {
        reasons = [x.reasonsJson];
      }
    }

    const advisorAdvice = x.advisorAdvice || null;

    return {
      id: x.id || '',
      riskLevel: x.riskLevel || '',
      riskLevelText: this.getRiskLevelText(x.riskLevel),
      riskScore: Number(x.riskScore || 0),
      reasons,
      advice: x.advice || '',
      aiSummary: x.aiSummary || '',
      createTime: x.createTime || '',
      createTimeText: this.formatTime(x.createTime),
      advisorAdvice,
      hasAdvisorAdvice: !!(advisorAdvice && advisorAdvice.messageId),
      advisorAdviceTitle: advisorAdvice && advisorAdvice.title ? advisorAdvice.title : '',
      advisorAdviceContent: advisorAdvice && advisorAdvice.content ? advisorAdvice.content : ''
    };
  },

  normalizeEvaluateResult(raw) {
    const aiPrediction = this.normalizeAiPrediction(raw.aiPrediction || null);

    return {
      riskLevel: raw.riskLevel || '',
      riskLevelText: this.getRiskLevelText(raw.riskLevel),
      riskScore: Number(raw.riskScore || 0),
      reasons: Array.isArray(raw.reasons) ? raw.reasons : [],
      advice: raw.advice || '',
      aiSummary: raw.aiSummary || '',
      aiPrediction
    };
  },

  normalizeAiPrediction(raw) {
    if (!raw) return null;

    const confidenceRaw = raw.confidence;
    let confidenceText = '-';

    if (confidenceRaw !== undefined && confidenceRaw !== null && confidenceRaw !== '') {
      const num = Number(confidenceRaw);
      if (!Number.isNaN(num)) {
        confidenceText = `${Math.round(num * 100)}%`;
      }
    }

    return {
      model: raw.model || '-',
      horizonDays: Number(raw.horizonDays || 0),
      predictedRiskScore: Number(raw.predictedRiskScore || 0),
      predictedLevel: raw.predictedLevel || '',
      predictedLevelText: this.getRiskLevelText(raw.predictedLevel),
      predictedWeightKg: raw.predictedWeightKg || '',
      trend: raw.trend || '',
      trendText: this.getTrendText(raw.trend),
      confidence: raw.confidence,
      confidenceText,
      historyCount: Number(raw.historyCount || 0),
      message: raw.message || '',
      suggestion: raw.suggestion || '',
      basis: Array.isArray(raw.basis) ? raw.basis : []
    };
  },

  getRiskLevelText(level) {
    if (level === 'HIGH') return '高风险';
    if (level === 'MID') return '中风险';
    return '低风险';
  },

  getTrendText(trend) {
    if (trend === 'UP') return '上升';
    if (trend === 'DOWN') return '下降';
    if (trend === 'STABLE') return '稳定';
    return trend || '-';
  },

  formatTime(timeStr) {
    if (!timeStr) return '';
    return String(timeStr).replace('T', ' ').replace(/\.\d+$/, '').slice(0, 19);
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
    this.setData({
      days,
      chartHintVisible: false,
      activeChartIndex: -1
    });
    this.refreshDashboardOnly();
  },

  refreshDashboardOnly() {
    this.setData({
      loading: true,
      errorMsg: ''
    });

    this.loadDashboard(this.data.days).then(dashboard => {
      this.setData({ dashboard }, () => {
        this.measureChartRect();
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

  goHistoryDetail(e) {
    const id = Number(e.currentTarget.dataset.id || 0);
    const item = this.data.historyList.find(row => Number(row.id) === id);
  
    if (!item) {
      wx.showToast({
        title: '记录不存在',
        icon: 'none'
      });
      return;
    }
  
    try {
      wx.setStorageSync('RISK_DETAIL_CACHE', item);
    } catch (err) {
      console.error('[risk] set cache fail =', err);
    }
  
    wx.navigateTo({
      url: `/pages/risk/detail/detail?id=${id}`
    });
  },

  drawRiskTrend() {
    if (!this.data.chartReady) return;

    const daily = Array.isArray(this.data.dashboard.daily) ? this.data.dashboard.daily : [];
    const width = this.data.chartWidth || 320;
    const height = this.data.chartHeight || 220;

    const ctx = wx.createCanvasContext('riskTrendCanvas', this);
    ctx.clearRect(0, 0, width, height);
    ctx.setFillStyle('#ffffff');
    ctx.fillRect(0, 0, width, height);

    if (!daily.length) {
      this.chartMeta = null;
      this.chartPoints = [];
      this.setData({
        chartHintVisible: false,
        activeChartIndex: -1
      });

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
        rawDate,
        label: this.formatShortDate(rawDate),
        value: Number(rawValue || 0)
      };
    });

    const padding = {
      top: 22,
      right: 20,
      bottom: 42,
      left: 34
    };

    const chartW = width - padding.left - padding.right;
    const chartH = height - padding.top - padding.bottom;
    const maxValue = Math.max(...parsed.map(i => i.value), 1);
    const yMax = Math.max(maxValue, 4);
    const stepX = parsed.length > 1 ? chartW / (parsed.length - 1) : 0;

    const points = parsed.map((item, idx) => {
      const x = parsed.length > 1 ? padding.left + stepX * idx : padding.left + chartW / 2;
      const y = padding.top + chartH - (item.value / yMax) * chartH;
      return {
        ...item,
        index: idx,
        x,
        y
      };
    });

    this.chartMeta = {
      width,
      height,
      padding,
      chartW,
      chartH,
      yMax,
      points
    };
    this.chartPoints = points;

    ctx.setStrokeStyle('#e5e7eb');
    ctx.setLineWidth(1);
    for (let i = 0; i <= 4; i++) {
      const y = padding.top + chartH * i / 4;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();
    }

    ctx.setFillStyle('#94a3b8');
    ctx.setFontSize(10);
    for (let i = 0; i <= 4; i++) {
      const value = Math.round(yMax * (4 - i) / 4);
      const y = padding.top + chartH * i / 4 + 4;
      ctx.fillText(String(value), 6, y);
    }

    const labelStep = this.getLabelStep(points.length);
    points.forEach((item, idx) => {
      const shouldShow =
        idx === 0 ||
        idx === points.length - 1 ||
        idx % labelStep === 0;

      if (!shouldShow) return;

      ctx.setFillStyle('#94a3b8');
      ctx.setFontSize(10);
      ctx.fillText(item.label, item.x - 12, height - 12);
    });

    ctx.setStrokeStyle('#2f6bff');
    ctx.setLineWidth(2);
    ctx.beginPath();
    points.forEach((item, idx) => {
      if (idx === 0) {
        ctx.moveTo(item.x, item.y);
      } else {
        ctx.lineTo(item.x, item.y);
      }
    });
    ctx.stroke();

    ctx.beginPath();
    points.forEach((item, idx) => {
      if (idx === 0) {
        ctx.moveTo(item.x, item.y);
      } else {
        ctx.lineTo(item.x, item.y);
      }
    });
    const last = points[points.length - 1];
    const first = points[0];
    ctx.lineTo(last.x, padding.top + chartH);
    ctx.lineTo(first.x, padding.top + chartH);
    ctx.closePath();
    ctx.setFillStyle('rgba(47,107,255,0.08)');
    ctx.fill();

    points.forEach(item => {
      ctx.setFillStyle('#2f6bff');
      ctx.beginPath();
      ctx.arc(item.x, item.y, 3, 0, Math.PI * 2);
      ctx.fill();
    });

    let lastValueLabelX = -999;
    points.forEach(item => {
      if (item.value <= 0) return;
      if (item.x - lastValueLabelX < 26) return;

      ctx.setFillStyle('#2f6bff');
      ctx.setFontSize(10);
      ctx.fillText(String(item.value), item.x - 4, item.y - 10);

      lastValueLabelX = item.x;
    });

    const activeIndex = this.data.activeChartIndex;
    if (activeIndex >= 0 && points[activeIndex]) {
      const active = points[activeIndex];

      ctx.setStrokeStyle('rgba(47,107,255,0.25)');
      ctx.setLineWidth(1);
      ctx.beginPath();
      ctx.moveTo(active.x, padding.top);
      ctx.lineTo(active.x, padding.top + chartH);
      ctx.stroke();

      ctx.setFillStyle('#ffffff');
      ctx.beginPath();
      ctx.arc(active.x, active.y, 6, 0, Math.PI * 2);
      ctx.fill();

      ctx.setStrokeStyle('#2f6bff');
      ctx.setLineWidth(3);
      ctx.beginPath();
      ctx.arc(active.x, active.y, 6, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.draw();
  },

  getLabelStep(length) {
    if (length <= 7) return 1;
    if (length <= 10) return 2;
    if (length <= 15) return 3;
    if (length <= 24) return 4;
    if (length <= 31) return 5;
    return 7;
  },

  formatShortDate(raw) {
    if (!raw) return '';
    const text = String(raw);
    if (text.includes('-')) {
      const arr = text.split('-');
      if (arr.length >= 3) {
        return `${arr[1]}/${arr[2]}`;
      }
    }
    return text.slice(-5);
  },

  getTouchCanvasPoint(e) {
    const touch =
      (e.touches && e.touches[0]) ||
      (e.changedTouches && e.changedTouches[0]) ||
      null;

    if (!touch || !this.chartRect) return null;

    return {
      x: touch.pageX - this.chartRect.left,
      y: touch.pageY - this.chartRect.top
    };
  },

  getNearestPointIndex(x) {
    const points = this.chartPoints || [];
    if (!points.length) return -1;

    let nearestIndex = 0;
    let minDistance = Infinity;

    points.forEach((item, idx) => {
      const distance = Math.abs(item.x - x);
      if (distance < minDistance) {
        minDistance = distance;
        nearestIndex = idx;
      }
    });

    return nearestIndex;
  },

  updateActivePoint(index) {
    const points = this.chartPoints || [];
    const point = points[index];
    if (!point) return;

    const hintWidth = 124;
    const hintHeight = 58;
    const width = this.data.chartWidth || 320;

    let left = point.x - hintWidth / 2;
    if (left < 8) left = 8;
    if (left + hintWidth > width - 8) left = width - hintWidth - 8;

    let top = point.y - hintHeight - 14;
    if (top < 8) {
      top = point.y + 14;
    }

    this.setData({
      activeChartIndex: index,
      activeChartLabel: point.rawDate || point.label,
      activeChartValue: point.value,
      chartHintVisible: true,
      chartHintLeft: left,
      chartHintTop: top
    }, () => {
      this.drawRiskTrend();
    });
  },

  onChartTap(e) {
    if (!this.chartPoints || !this.chartPoints.length) return;
    const pos = this.getTouchCanvasPoint(e);
    if (!pos) return;

    const index = this.getNearestPointIndex(pos.x);
    this.updateActivePoint(index);
  },

  onChartTouchStart(e) {
    this.onChartTap(e);
  },

  onChartTouchMove(e) {
    this.onChartTap(e);
  },

  onChartTouchEnd() {
  },

  hideChartHint() {
    this.setData({
      chartHintVisible: false,
      activeChartIndex: -1
    }, () => {
      this.drawRiskTrend();
    });
  },

  goLatest() {
    wx.navigateTo({
      url: '/pages/health/latest/latest'
    });
  },

  goRecord() {
    wx.navigateTo({
      url: '/pages/health/record/record'
    });
  }
});