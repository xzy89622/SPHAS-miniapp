const api = require('../../api/message.js');

function formatTime(timeStr) {
  if (!timeStr) return '-';
  return String(timeStr)
    .replace('T', ' ')
    .replace(/\.\d+$/, '')
    .slice(0, 19);
}

function getTypeText(type) {
  const map = {
    AUDIT: '审核通知',
    RISK: '风险预警',
    INACTIVE: '未登录提醒',
    CHALLENGE: '挑战通知',
    PLAN: '计划提醒',
    SYSTEM: '系统消息',
    NOTICE: '公告通知',
    BADGE: '勋章提醒',
    ADVICE: '健康建议'
  };
  return map[type] || '消息通知';
}

function getTypeIcon(type) {
  const map = {
    AUDIT: '🛡️',
    RISK: '⚠️',
    INACTIVE: '⏰',
    CHALLENGE: '🏆',
    PLAN: '📋',
    SYSTEM: '📢',
    NOTICE: '📌',
    BADGE: '🎖️',
    ADVICE: '🩺'
  };
  return map[type] || '🔔';
}

function getTypeClass(type) {
  const map = {
    AUDIT: 'audit',
    RISK: 'alert',
    INACTIVE: 'notice',
    CHALLENGE: 'system',
    PLAN: 'plan',
    SYSTEM: 'system',
    NOTICE: 'notice',
    BADGE: 'badge',
    ADVICE: 'advice'
  };
  return map[type] || 'system';
}

function getSubText(type) {
  if (type === 'ADVICE') return 'AI健康顾问给你的建议内容';
  return '查看消息详情与状态信息';
}

Page({
  data: {
    loading: true,
    errMsg: '',
    detail: null
  },

  onLoad(options) {
    const id = Number(options.id || 0);
    if (!id) {
      this.setData({
        loading: false,
        errMsg: '消息ID无效'
      });
      return;
    }
    this.loadDetail(id);
  },

  async loadDetail(id) {
    this.setData({
      loading: true,
      errMsg: ''
    });

    try {
      const row = await api.messageDetail(id);

      if (Number(row.isRead || 0) === 0) {
        try {
          await api.readMessage(id);
          row.isRead = 1;
          row.readTime = row.readTime || new Date().toISOString();
        } catch (e) {
          console.log('[message detail] readMessage fail', e);
        }
      }

      const isRead = Number(row.isRead || 0) === 1;
      const type = row.type || '';
      const bizId = row.bizId ? Number(row.bizId) : 0;

      const detail = {
        ...row,
        isRead: isRead ? 1 : 0,
        bizId,
        typeText: getTypeText(type),
        typeIcon: getTypeIcon(type),
        typeClass: getTypeClass(type),
        titleText: row.title || '消息通知',
        contentText: row.content || '暂无内容',
        createTimeText: formatTime(row.createTime),
        readTimeText: formatTime(row.readTime),
        readText: isRead ? '已读' : '未读',
        subText: getSubText(type),
        sourceText: type === 'ADVICE' ? 'AI健康顾问建议' : '系统消息',
        canGoRisk: type === 'ADVICE' && bizId > 0
      };

      this.setData({
        detail
      });
    } catch (e) {
      console.log('[message detail] load fail', e);
      this.setData({
        errMsg: e.msg || e.message || '加载失败'
      });
    } finally {
      this.setData({
        loading: false
      });
    }
  },

  goRiskRecord() {
    const detail = this.data.detail || {};
    if (!detail.canGoRisk || !detail.bizId) return;

    wx.navigateTo({
      url: `/pages/risk/index/index?focusId=${detail.bizId}`
    });
  }
});