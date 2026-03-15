const { request } = require('../../../utils/request');

function pad2(n) {
  return String(n).padStart(2, '0');
}

function formatTime(value) {
  if (!value) return '';
  const text = String(value).replace('T', ' ');
  const date = new Date(text.replace(/-/g, '/'));
  if (Number.isNaN(date.getTime())) {
    return text.slice(0, 16);
  }
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())} ${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

function buildSummary(item) {
  if (item && item.summary) return item.summary;
  if (item && item.content) {
    const plain = String(item.content)
      .replace(/<[^>]+>/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    return plain ? `${plain.slice(0, 34)}${plain.length > 34 ? '...' : ''}` : '点击查看完整科普内容';
  }
  return '点击查看完整科普内容';
}

function enhanceItem(item) {
  return {
    ...item,
    uiTag: '健康科普',
    uiTime: formatTime(item.publishTime || item.createTime || item.updateTime),
    uiSummary: buildSummary(item)
  };
}

Page({
  data: {
    list: [],
    loading: false,
    firstLoaded: false
  },

  onLoad() {
    this.loadList();
  },

  onPullDownRefresh() {
    this.loadList(true);
  },

  async loadList(fromPullDown = false) {
    try {
      this.setData({ loading: true });

      const list = await request({
        url: '/api/article/list',
        method: 'GET'
      });

      const realList = Array.isArray(list)
        ? list
        : (list && list.data)
          ? list.data
          : [];

      this.setData({
        list: (realList || []).map(enhanceItem),
        loading: false,
        firstLoaded: true
      });
    } catch (e) {
      console.error('[article list] load fail:', e);
      this.setData({ loading: false, firstLoaded: true });
      wx.showToast({
        title: '加载失败，请稍后重试',
        icon: 'none'
      });
    } finally {
      if (fromPullDown) wx.stopPullDownRefresh();
    }
  },

  goDetail(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/article/detail/detail?id=${id}` });
  }
});