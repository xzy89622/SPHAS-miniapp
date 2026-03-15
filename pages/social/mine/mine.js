const socialApi = require('../../api/social');

function formatTime(timeStr) {
  if (!timeStr) return '';
  return String(timeStr)
    .replace('T', ' ')
    .replace(/\.\d+$/, '')
    .slice(0, 16);
}

Page({
  data: {
    loading: false,
    errMsg: '',
    pageNum: 1,
    pageSize: 10,
    hasMore: true,
    list: [],
    stats: {
      total: 0,
      pending: 0,
      passed: 0,
      rejected: 0,
      hidden: 0
    }
  },

  onLoad() {
    this.loadAll();
  },

  onShow() {
    this.loadAll();
  },

  onPullDownRefresh() {
    this.loadAll().finally(() => {
      wx.stopPullDownRefresh();
    });
  },

  onReachBottom() {
    this.loadMore();
  },

  normalizeList(list) {
    if (!Array.isArray(list)) return [];

    return list.map(item => {
      const row = socialApi.normalizePost ? socialApi.normalizePost(item) : (item || {});
      const images = Array.isArray(row.images) ? row.images : [];
      const canEdit = Number(row.status) === 3;

      return {
        ...row,
        contentText: row.content || '',
        createTimeText: formatTime(row.createTime || row.createdAt || row.gmtCreate || ''),
        likeCountText: Number(row.likeCount || 0),
        commentCountText: Number(row.commentCount || 0),
        imageCount: images.length,
        firstImage: images.length > 0 ? images[0] : '',
        deletedFlag: Number(row.deletedFlag || 0),
        canEdit
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
      const [pageRes, statsRes] = await Promise.all([
        socialApi.myPosts({
          pageNum: 1,
          pageSize: this.data.pageSize
        }),
        socialApi.myPostStats().catch(() => ({
          total: 0,
          pending: 0,
          passed: 0,
          rejected: 0,
          hidden: 0
        }))
      ]);

      const records = this.normalizeList(pageRes.records || []);
      const total = Number(pageRes.total || 0);

      this.setData({
        list: records,
        pageNum: 1,
        hasMore: total > records.length,
        stats: statsRes
      });
    } catch (e) {
      console.error('[social mine] loadAll fail =', e);
      this.setData({
        errMsg: e.msg || e.message || '加载失败'
      });
    } finally {
      this.setData({
        loading: false
      });
    }
  },

  async loadMore() {
    if (this.data.loading || !this.data.hasMore) return;

    const nextPage = this.data.pageNum + 1;
    this.setData({ loading: true });

    try {
      const res = await socialApi.myPosts({
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
      console.error('[social mine] loadMore fail =', e);
      wx.showToast({
        title: e.msg || e.message || '加载更多失败',
        icon: 'none'
      });
    } finally {
      this.setData({
        loading: false
      });
    }
  },

  goPublish() {
    wx.navigateTo({
      url: '/pages/social/publish/publish'
    });
  },

  goDetail(e) {
    const id = Number(e.currentTarget.dataset.id || 0);
    if (!id) return;

    wx.navigateTo({
      url: `/pages/social/detail/detail?id=${id}`
    });
  },

  goEdit(e) {
    const id = Number(e.currentTarget.dataset.id || 0);
    const canEdit = !!e.currentTarget.dataset.canEdit;
    if (!id) return;

    if (!canEdit) {
      wx.showToast({
        title: '只有已驳回的帖子才能编辑',
        icon: 'none'
      });
      return;
    }

    wx.navigateTo({
      url: `/pages/social/edit/edit?id=${id}`
    });
  },

  async onDelete(e) {
    const id = Number(e.currentTarget.dataset.id || 0);
    if (!id) return;

    wx.showModal({
      title: '提示',
      content: '确定删除这条帖子吗？删除后不会在社区中显示。',
      success: async (res) => {
        if (!res.confirm) return;

        try {
          await socialApi.deletePost(id);

          wx.showToast({
            title: '删除成功',
            icon: 'success'
          });

          this.loadAll();
        } catch (e) {
          console.error('[social mine] delete fail =', e);
          wx.showToast({
            title: e.msg || e.message || '删除失败',
            icon: 'none'
          });
        }
      }
    });
  }
});