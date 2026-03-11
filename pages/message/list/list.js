const api = require('../../api/message.js');

function formatTime(timeStr) {
  if (!timeStr) return '';
  return String(timeStr)
    .replace('T', ' ')
    .replace(/\.\d+$/, '')
    .slice(0, 16);
}

function getTypeText(type) {
  const map = {
    AUDIT: '审核通知',
    SYSTEM: '系统消息',
    ALERT: '风险提醒',
    NOTICE: '公告通知'
  };
  return map[type] || type || '消息';
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
    loading: false,
    errMsg: '',
    pageNum: 1,
    pageSize: 10,
    hasMore: true,
    list: [],
    unreadCount: 0
  },

  onLoad() {
    this.loadAll();
  },

  onShow() {
    this.loadAll();
  },

  onPullDownRefresh() {
    this.loadAll().finally(() => wx.stopPullDownRefresh());
  },

  onReachBottom() {
    this.loadMore();
  },

  normalizeList(list) {
    if (!Array.isArray(list)) return [];
    return list.map(item => ({
      ...item,
      typeText: getTypeText(item.type),
      typeIcon: getTypeIcon(item.type),
      typeClass: getTypeClass(item.type),
      timeText: formatTime(item.createTime),
      readText: item.readFlag ? '已读' : '未读',
      titleText: item.title || '消息通知',
      contentText: item.content || '暂无内容'
    }));
  },

  async loadAll() {
    this.setData({
      loading: true,
      errMsg: '',
      pageNum: 1,
      hasMore: true,
      list: []
    });

    try {
      const [pageRes, unreadCount] = await Promise.all([
        api.pageMessages({ pageNum: 1, pageSize: this.data.pageSize }),
        api.unreadCount().catch(() => 0)
      ]);

      const records = this.normalizeList(pageRes.records || []);
      const total = Number(pageRes.total || 0);

      this.setData({
        list: records,
        unreadCount: Number(unreadCount || 0),
        hasMore: total > records.length
      });
    } catch (e) {
      console.log('[message list] loadAll fail', e);
      this.setData({
        errMsg: e.msg || e.message || '加载失败'
      });
    } finally {
      this.setData({ loading: false });
    }
  },

  async loadMore() {
    if (this.data.loading || !this.data.hasMore) return;

    const nextPage = this.data.pageNum + 1;
    this.setData({ loading: true });

    try {
      const res = await api.pageMessages({
        pageNum: nextPage,
        pageSize: this.data.pageSize
      });

      const records = this.normalizeList(res.records || []);
      const all = this.data.list.concat(records);
      const total = Number(res.total || 0);

      this.setData({
        list: all,
        pageNum: nextPage,
        hasMore: total > all.length
      });
    } catch (e) {
      console.log('[message list] loadMore fail', e);
      wx.showToast({
        title: e.msg || e.message || '加载更多失败',
        icon: 'none'
      });
    } finally {
      this.setData({ loading: false });
    }
  },

  async readAll() {
    try {
      await api.readAllMessages();
      wx.showToast({
        title: '已全部设为已读',
        icon: 'success'
      });
      this.loadAll();
    } catch (e) {
      wx.showToast({
        title: e.msg || e.message || '操作失败',
        icon: 'none'
      });
    }
  },

  goDetail(e) {
    const id = e.currentTarget.dataset.id;
    if (!id) return;

    wx.navigateTo({
      url: `/pages/message/detail/detail?id=${id}`
    });
  }
});