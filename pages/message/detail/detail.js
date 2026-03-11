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
    SYSTEM: '系统消息',
    ALERT: '风险提醒',
    NOTICE: '公告通知'
  };
  return map[type] || type || '消息通知';
}

function getTypeIcon(type) {
  const map = {
    AUDIT: '🛡️',
    SYSTEM: '📢',
    ALERT: '⚠️',
    NOTICE: '📌'
  };
  return map[type] || '🔔';
}

function getTypeClass(type) {
  const map = {
    AUDIT: 'audit',
    SYSTEM: 'system',
    ALERT: 'alert',
    NOTICE: 'notice'
  };
  return map[type] || 'system';
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
      const res = await api.messageDetail(id);
      const row = res || {};

      if (!row.readFlag) {
        try {
          await api.readMessage(id);
          row.readFlag = 1;
          row.readTime = row.readTime || new Date().toISOString();
        } catch (e) {
          console.log('[message detail] readMessage fail', e);
        }
      }

      const detail = {
        ...row,
        typeText: getTypeText(row.type),
        typeIcon: getTypeIcon(row.type),
        typeClass: getTypeClass(row.type),
        titleText: row.title || '消息通知',
        contentText: row.content || '暂无内容',
        createTimeText: formatTime(row.createTime),
        readTimeText: formatTime(row.readTime),
        readText: row.readFlag ? '已读' : '未读'
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
  }
});