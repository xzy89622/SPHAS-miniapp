// pages/social/list/list.js
const api = require('../../api/social');

Page({
  data: {
    loading: false,
    errMsg: '',
    pageNum: 1,
    pageSize: 10,
    hasMore: true,
    posts: []
  },

  onLoad() {
    this.reload();
  },

  onPullDownRefresh() {
    this.reload().finally(() => wx.stopPullDownRefresh());
  },

  onReachBottom() {
    this.loadMore();
  },

  async reload() {
    this.setData({ pageNum: 1, hasMore: true, posts: [], errMsg: '' });
    await this.fetchPage(true);
  },

  async loadMore() {
    if (this.data.loading || !this.data.hasMore) return;
    this.setData({ pageNum: this.data.pageNum + 1 });
    await this.fetchPage(false);
  },

  async fetchPage(reset) {
    this.setData({ loading: true });
    try {
      const res = await api.pagePosts({ pageNum: this.data.pageNum, pageSize: this.data.pageSize });

      // 后端是 MyBatis-Plus Page：{records, total, ...}
      const records = res.records || [];
      const list = records.map(p => ({
        ...p,
        _images: this.safeParseImages(p.imagesJson)
      }));

      const posts = reset ? list : this.data.posts.concat(list);
      const hasMore = posts.length < (res.total || posts.length);

      this.setData({ posts, hasMore });
    } catch (e) {
      this.setData({ errMsg: e.msg || '加载失败' });
    } finally {
      this.setData({ loading: false });
    }
  },

  safeParseImages(imagesJson) {
    try {
      const arr = JSON.parse(imagesJson || '[]');
      if (!Array.isArray(arr)) return [];
  
      return arr.filter(url => {
        if (typeof url !== 'string') return false;
        const u = url.trim();
        if (!u) return false;
  
        // 过滤明显假的测试图
        if (u.includes('http://xx/')) return false;
  
        // 允许 https；也允许你本地后端静态资源地址
        return u.startsWith('https://') || u.startsWith('http://localhost:8080/') || u.startsWith('http://127.0.0.1:8080/');
      });
    } catch (e) {
      return [];
    }
  },

  goPublish() {
    wx.navigateTo({ url: '/pages/social/publish/publish' });
  },

  goDetail(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/social/detail/detail?id=${id}` });
  },

  previewImg(e) {
    // 阻止卡片跳转
    const src = e.currentTarget.dataset.src;
    wx.previewImage({ urls: [src], current: src });
  }
});