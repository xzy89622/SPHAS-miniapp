// pages/notice/list/list.js
// 公告列表：下拉刷新 + 触底分页 + 更稳的“是否还有更多”判断
// 兼容常见返回：
// 1) { records: [], total: 123 }
// 2) { data: { records: [], total: 123 } }
// 3) { list: [], total: 123 } / { data: { list: [], total: 123 } }

const { request } = require('../../../utils/request');

Page({
  data: {
    list: [],
    pageNum: 1,
    pageSize: 10,
    total: 0,

    loading: false,    // 正在请求
    finished: false,   // 没有更多
    firstLoaded: false // 首次是否加载完成（用于空状态）
  },

  onLoad() {
    this.refresh();
  },

  // 下拉刷新
  onPullDownRefresh() {
    this.refresh(true);
  },

  // 触底加载更多
  onReachBottom() {
    this.loadMore();
  },

  async refresh(fromPullDown = false) {
    // 重置状态
    this.setData({
      list: [],
      pageNum: 1,
      total: 0,
      loading: false,
      finished: false,
      firstLoaded: false
    });

    await this.fetchPage(1);

    // 结束下拉动画
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
        data: { pageNum, pageSize: this.data.pageSize }
      });

      // 兼容 data 包裹
      const page = res && res.data ? res.data : res;

      // 兼容 records/list 两种字段
      const records = (page && page.records) ? page.records
                    : (page && page.list) ? page.list
                    : [];

      // total 可能不存在
      const total = Number((page && page.total) || 0);

      // 合并列表
      const merged = pageNum === 1 ? records : this.data.list.concat(records);

      // ✅ 更稳的 finished 判断：
      // - 如果后端给 total： merged.length >= total
      // - 如果后端不给 total：本次返回数量 < pageSize 视为结束
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
        loading: true,
        firstLoaded: true
      });
    } catch (e) {
      this.setData({
        loading: false,
        firstLoaded: true
      });
    }
  },

  goDetail(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/notice/detail/detail?id=${id}` });
  }
});
