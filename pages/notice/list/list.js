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

function detectNoticeType(title) {
  const t = String(title || '');

  if (
    t.includes('风险预警') ||
    t.includes('高风险') ||
    t.includes('预警')
  ) {
    return {
      uiTag: '风险提醒',
      uiTagClass: 'tag-risk',
      uiTypeClass: 'notice-risk',
      uiSummary: '请及时查看详情并结合健康记录、评估与推荐内容尽快处理。'
    };
  }

  if (
    t.includes('维护') ||
    t.includes('更新') ||
    t.includes('升级') ||
    t.includes('修复')
  ) {
    return {
      uiTag: '系统通知',
      uiTagClass: 'tag-maintain',
      uiTypeClass: 'notice-maintain',
      uiSummary: '这是一条系统维护或功能更新类通知，建议进入详情页了解完整说明。'
    };
  }

  return {
    uiTag: '公告',
    uiTagClass: 'tag-normal',
    uiTypeClass: 'notice-normal',
    uiSummary: '这是一条普通系统公告，点击可查看完整内容。'
  };
}

function enhanceItem(item) {
  const info = detectNoticeType(item.title);
  return {
    ...item,
    uiTime: formatTime(item.createTime),
    uiTag: info.uiTag,
    uiTagClass: info.uiTagClass,
    uiTypeClass: info.uiTypeClass,
    uiSummary: info.uiSummary
  };
}

Page({
  data: {
    list: [],
    pageNum: 1,
    pageSize: 10,
    total: 0,
    loading: false,
    finished: false,
    firstLoaded: false
  },

  onLoad() {
    this.refresh();
  },

  onPullDownRefresh() {
    this.refresh(true);
  },

  onReachBottom() {
    this.loadMore();
  },

  async refresh(fromPullDown = false) {
    this.setData({
      list: [],
      pageNum: 1,
      total: 0,
      loading: false,
      finished: false,
      firstLoaded: false
    });

    await this.fetchPage(1);

    if (fromPullDown) {
      wx.stopPullDownRefresh();
      wx.showToast({ title: '已刷新', icon: 'success' });
    }
  },

  async loadMore() {
    if (this.data.loading || this.data.finished) return;
    const next = this.data.pageNum + 1;
    await this.fetchPage(next);
  },

  async fetchPage(pageNum) {
    try {
      this.setData({ loading: true });

      const res = await request({
        url: '/api/notice/list',
        method: 'GET',
        data: {
          pageNum,
          pageSize: this.data.pageSize
        }
      });

      const page = res && res.data ? res.data : res;

      const records = (page && page.records)
        ? page.records
        : (page && page.list)
          ? page.list
          : [];

      const total = Number((page && page.total) || 0);

      const enhancedRecords = records.map(enhanceItem);
      const merged = pageNum === 1
        ? enhancedRecords
        : this.data.list.concat(enhancedRecords);

      let finished = false;
      if (total > 0) {
        finished = merged.length >= total;
      } else {
        finished = records.length < this.data.pageSize;
      }

      this.setData({
        list: merged,
        pageNum,
        total,
        finished,
        loading: false,
        firstLoaded: true
      });
    } catch (e) {
      console.error('[notice list] fetch fail:', e);
      this.setData({
        loading: false,
        firstLoaded: true
      });

      wx.showToast({
        title: '加载失败，请稍后重试',
        icon: 'none'
      });
    }
  },

  goDetail(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/notice/detail/detail?id=${id}`
    });
  }
});