const socialApi = require('../../api/social.js');

function formatTime(timeStr) {
  if (!timeStr) return '';
  return String(timeStr)
    .replace('T', ' ')
    .replace(/\.\d+$/, '')
    .slice(0, 16);
}

function mapStatusText(status) {
  if (status === 1) return '已发布';
  if (status === 2) return '审核中';
  if (status === 3) return '已驳回';
  if (status === 0) return '已隐藏';
  return '未知状态';
}

function mapStatusClass(status) {
  if (status === 1) return 'ok';
  if (status === 2) return 'wait';
  if (status === 3) return 'reject';
  return 'hide';
}

Page({
  data: {
    loading: false,
    errMsg: '',
    pageNum: 1,
    pageSize: 10,
    hasMore: true,
    status: '',
    list: [],
    inited: false
  },

  onLoad() {
    const app = getApp();
    if (!app || typeof app.requireLogin !== 'function') return;
    if (!app.requireLogin()) return;
    this.reload();
  },

  onShow() {
    if (!this.data.inited) return;
    this.reload();
  },

  onPullDownRefresh() {
    this.reload().finally(() => wx.stopPullDownRefresh());
  },

  onReachBottom() {
    this.loadMore();
  },

  setStatus(e) {
    const status = e.currentTarget.dataset.status || '';
    if (String(status) === String(this.data.status)) return;

    this.setData({ status });
    this.reload();
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

  normalizeRow(item) {
    const status = Number(item.status);
    return {
      ...item,
      statusText: mapStatusText(status),
      statusClass: mapStatusClass(status),
      timeText: formatTime(item.createTime),
      updateTimeText: formatTime(item.updateTime),
      hasImages: socialApi.parseImagesJson(item.imagesJson).length > 0
    };
  },

  async fetchPage(reset) {
    this.setData({ loading: true });

    try {
      const params = {
        pageNum: this.data.pageNum,
        pageSize: this.data.pageSize
      };

      if (this.data.status !== '') {
        params.status = Number(this.data.status);
      }

      const res = await socialApi.pageMyPosts(params);
      const records = Array.isArray(res.records) ? res.records : [];
      const nextList = records.map(item => this.normalizeRow(item));
      const list = reset ? nextList : this.data.list.concat(nextList);
      const total = Number(res.total || 0);

      this.setData({
        list,
        hasMore: list.length < total,
        errMsg: '',
        inited: true
      });
    } catch (e) {
      console.error('[social mine] fetchPage fail =', e);
      this.setData({
        errMsg: e.msg || e.message || '加载失败',
        inited: true
      });
    } finally {
      this.setData({ loading: false });
    }
  },

  goDetail(e) {
    const id = e.currentTarget.dataset.id;
    if (!id) return;

    wx.navigateTo({
      url: `/pages/social/detail/detail?id=${id}`
    });
  },

  goMessage() {
    wx.navigateTo({
      url: '/pages/message/list/list'
    });
  }
});