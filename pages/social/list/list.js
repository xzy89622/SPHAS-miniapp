const socialApi = require('../../api/social.js');

function formatTime(timeStr) {
  if (!timeStr) return '';
  return String(timeStr)
    .replace('T', ' ')
    .replace(/\.\d+$/, '')
    .slice(0, 16);
}

function getAvatarText(name) {
  const text = String(name || '用').trim();
  return text ? text.charAt(0) : '用';
}

function safeArray(list) {
  return Array.isArray(list) ? list.filter(Boolean) : [];
}

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
    const app = getApp();
    if (!app || typeof app.requireLogin !== 'function') return;
    if (!app.requireLogin()) return;
    this.reload();
  },

  onPullDownRefresh() {
    this.reload().finally(() => wx.stopPullDownRefresh());
  },

  onReachBottom() {
    this.loadMore();
  },

  async reload() {
    this.setData({
      loading: false,
      errMsg: '',
      pageNum: 1,
      hasMore: true,
      posts: []
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

  normalizePost(item) {
    const row = item || {};
    const images = safeArray(socialApi.parseImagesJson(row.imagesJson));
    const nickname =
      row.nickname ||
      row.nickName ||
      row.username ||
      row.userName ||
      `用户${row.userId || ''}`;
    const content =
      row.content ||
      row.postContent ||
      row.text ||
      '暂无内容';

    return {
      ...row,
      nicknameText: nickname,
      avatarText: getAvatarText(nickname),
      contentText: content,
      timeText: formatTime(row.createTime),
      imageList: images,
      hasImages: images.length > 0,
      likeText: String(row.likeCount || 0),
      commentText: String(row.commentCount || 0)
    };
  },

  async fetchPage(reset) {
    this.setData({ loading: true });

    try {
      const res = await socialApi.pagePosts({
        pageNum: this.data.pageNum,
        pageSize: this.data.pageSize
      });

      const records = Array.isArray(res.records) ? res.records : [];
      const newList = records.map(item => this.normalizePost(item));
      const posts = reset ? newList : this.data.posts.concat(newList);

      const total = Number(res.total || 0);
      const hasMore = posts.length < total;

      this.setData({
        posts,
        hasMore,
        errMsg: ''
      });
    } catch (e) {
      console.error('[social list] fetchPage fail =', e);
      this.setData({
        errMsg: e.msg || e.message || '加载失败'
      });
    } finally {
      this.setData({ loading: false });
    }
  },

  goPublish() {
    wx.navigateTo({
      url: '/pages/social/publish/publish'
    });
  },

  goMine() {
    wx.navigateTo({
      url: '/pages/social/mine/mine'
    });
  },

  goDetail(e) {
    const id = e.currentTarget.dataset.id;
    if (!id) return;
    wx.navigateTo({
      url: `/pages/social/detail/detail?id=${id}`
    });
  },

  previewImg(e) {
    const src = e.currentTarget.dataset.src;
    const urls = safeArray(e.currentTarget.dataset.urls);
    if (!src || urls.length === 0) return;

    wx.previewImage({
      current: src,
      urls
    });
  }
});