const api = require('../../api/challenge.js');

function formatDateText(v) {
  if (!v) return '-';
  return String(v).slice(0, 10);
}

function mapTypeText(type) {
  const map = {
    STEP: '步数挑战',
    RUN: '跑步挑战',
    DIET: '饮食挑战'
  };
  return map[type] || type || '健康挑战';
}

function toBool(v) {
  return v === true || v === 1 || v === '1';
}

Page({
  data: {
    loading: false,
    errMsg: '',
    status: 'all',
    pageNum: 1,
    pageSize: 10,
    hasMore: true,
    list: []
  },

  onLoad() {
    const app = getApp();
    if (!app || typeof app.requireLogin !== 'function') return;
    if (!app.requireLogin()) return;
    this.reload();
  },

  onShow() {
    this.reload();
  },

  onPullDownRefresh() {
    this.reload().finally(() => wx.stopPullDownRefresh());
  },

  onReachBottom() {
    this.loadMore();
  },

  switchTab(e) {
    const status = e.currentTarget.dataset.status || 'all';
    if (status === this.data.status) return;

    this.setData({ status });
    this.reload();
  },

  goMyChallenge() {
    wx.navigateTo({
      url: '/pages/challenge/my/my'
    });
  },

  goDetail(e) {
    const id = e.currentTarget.dataset.id;
    if (!id) return;

    wx.navigateTo({
      url: `/pages/challenge/detail/detail?id=${id}`
    });
  },

  normalizeItem(item) {
    const row = item || {};
    return {
      ...row,
      typeText: mapTypeText(row.type),
      targetValue: Number(row.targetValue || row.target_value || row.target || 0),
      rewardPoints: Number(row.rewardPoints || row.reward_points || row.points || 0),
      startDateText: formatDateText(row.startDate || row.start_date || row.startTime),
      endDateText: formatDateText(row.endDate || row.end_date || row.endTime),
      joined: toBool(row.joined || row.isJoined)
    };
  },

  async reload() {
    this.setData({
      loading: false,
      errMsg: '',
      pageNum: 1,
      hasMore: true,
      list: []
    });
    await this.fetchPage(true);
  },

  async loadMore() {
    if (this.data.loading || !this.data.hasMore) return;

    this.setData({
      pageNum: this.data.pageNum + 1
    });

    await this.fetchPage(false);
  },

  async fetchPage(reset) {
    this.setData({ loading: true });

    try {
      const params = {
        pageNum: this.data.pageNum,
        pageSize: this.data.pageSize
      };

      if (this.data.status && this.data.status !== 'all') {
        params.status = this.data.status;
      }

      const res = await api.challengePage(params);

      const records = Array.isArray(res.records) ? res.records : [];
      const nextList = records.map(item => this.normalizeItem(item));
      const list = reset ? nextList : this.data.list.concat(nextList);
      const total = Number(res.total || 0);

      this.setData({
        list,
        hasMore: total > list.length,
        errMsg: ''
      });
    } catch (e) {
      console.error('[challenge list] fetchPage fail =', e);
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