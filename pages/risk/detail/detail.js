Page({
  data: {
    detail: null,
    errMsg: ''
  },

  onLoad(options) {
    const id = Number(options.id || 0);
    let cache = null;

    try {
      cache = wx.getStorageSync('RISK_DETAIL_CACHE');
    } catch (e) {
      console.error('[risk detail] read cache fail =', e);
    }

    if (!cache) {
      this.setData({
        errMsg: '预警详情不存在，请返回列表重试'
      });
      return;
    }

    if (id && Number(cache.id) !== id) {
      this.setData({
        errMsg: '预警详情不存在，请返回列表重试'
      });
      return;
    }

    this.setData({
      detail: this.normalizeDetail(cache)
    });
  },

  normalizeDetail(row) {
    const x = row || {};
    const adviceInfo = x.advisorAdvice || null;

    return {
      id: x.id || '',
      riskLevel: x.riskLevel || '',
      riskLevelText: x.riskLevelText || this.getRiskLevelText(x.riskLevel),
      riskScore: Number(x.riskScore || 0),
      reasons: Array.isArray(x.reasons) ? x.reasons : [],
      advice: x.advice || '',
      aiSummary: x.aiSummary || '',
      createTimeText: x.createTimeText || this.formatTime(x.createTime),
      advisorAdvice: adviceInfo,
      hasAdvisorAdvice: !!(adviceInfo && adviceInfo.messageId),
      advisorAdviceTitle: adviceInfo && adviceInfo.title ? adviceInfo.title : '顾问建议',
      advisorAdviceContent: adviceInfo && adviceInfo.content ? adviceInfo.content : ''
    };
  },

  getRiskLevelText(level) {
    if (level === 'HIGH') return '高风险';
    if (level === 'MID') return '中风险';
    return '低风险';
  },

  formatTime(timeStr) {
    if (!timeStr) return '';
    return String(timeStr).replace('T', ' ').replace(/\.\d+$/, '').slice(0, 19);
  },

  goAdviceDetail() {
    const detail = this.data.detail || {};
    const advice = detail.advisorAdvice || null;

    if (!advice || !advice.messageId) {
      wx.showToast({
        title: '暂无顾问消息',
        icon: 'none'
      });
      return;
    }

    wx.navigateTo({
      url: `/pages/message/detail/detail?id=${advice.messageId}`
    });
  }
});