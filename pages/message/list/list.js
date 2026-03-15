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

Page({
  data: {
    loading: false,
    errMsg: '',
    pageNum: 1,
    pageSize: 10,
    hasMore: true,
    list: [],
    unreadCount: 0,
    currentFilter: 'all'
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
    return list.map(item => {
      const isRead = Number(item.isRead || 0) === 1;
      const titleText = item.title || '消息通知';
      const contentText = item.content || '暂无内容';

      return {
        ...item,
        isRead: isRead ? 1 : 0,
        typeText: getTypeText(item.type),
        typeIcon: getTypeIcon(item.type),
        typeClass: getTypeClass(item.type),
        timeText: formatTime(item.createTime),
        readText: isRead ? '已读' : '未读',
        titleText,
        contentText
      };
    });
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
      const params = {
        pageNum: 1,
        pageSize: this.data.pageSize
      };

      if (this.data.currentFilter === 'unread') {
        params.isRead = 0;
      }

      const [pageRes, unreadCount] = await Promise.all([
        api.pageMessages(params),
        api.unreadCount().catch(() => 0)
      ]);

      const records = this.normalizeList(pageRes.records || []);
      const total = Number(pageRes.total || 0);

      this.setData({
        list: records,
        unreadCount: Number(unreadCount || 0),
        pageNum: 1,
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
      const params = {
        pageNum: nextPage,
        pageSize: this.data.pageSize
      };

      if (this.data.currentFilter === 'unread') {
        params.isRead = 0;
      }

      const pageRes = await api.pageMessages(params);
      const records = this.normalizeList(pageRes.records || []);
      const total = Number(pageRes.total || 0);
      const newList = this.data.list.concat(records);

      this.setData({
        list: newList,
        pageNum: nextPage,
        hasMore: total > newList.length
      });
    } catch (e) {
      console.log('[message list] loadMore fail', e);
      this.setData({
        errMsg: e.msg || e.message || '加载更多失败'
      });
    } finally {
      this.setData({ loading: false });
    }
  },

  onFilterAll() {
    if (this.data.currentFilter === 'all') return;
    this.setData({ currentFilter: 'all' });
    this.loadAll();
  },

  onFilterUnread() {
    if (this.data.currentFilter === 'unread') return;
    this.setData({ currentFilter: 'unread' });
    this.loadAll();
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
      console.log('[message list] readAll fail', e);
      wx.showToast({
        title: e.msg || e.message || '操作失败',
        icon: 'none'
      });
    }
  },

  goDetail(e) {
    const id = Number(e.currentTarget.dataset.id || 0);
    if (!id) return;
    wx.navigateTo({
      url: `/pages/message/detail/detail?id=${id}`
    });
  }
});