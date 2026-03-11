const { clearToken } = require('../../utils/auth');
const messageApi = require('../api/message');
const socialApi = require('../api/social');
const pointsApi = require('../api/points');

Page({
  data: {
    unreadCount: 0,
    totalPoints: 0,
    socialPendingCount: 0,
    socialRejectedCount: 0,
    socialHiddenCount: 0
  },

  onShow() {
    this.loadHomeStats();
  },

  async loadHomeStats() {
    await Promise.all([
      this.loadUnreadCount(),
      this.loadPointSummary(),
      this.loadMySocialStats()
    ]);
  },

  async loadUnreadCount() {
    try {
      const unreadCount = await messageApi.unreadCount();
      this.setData({
        unreadCount: Number(unreadCount || 0)
      });
    } catch (e) {
      console.log('[index] unreadCount fail', e);
    }
  },

  async loadPointSummary() {
    try {
      const res = await pointsApi.myPointSummary();
      this.setData({
        totalPoints: Number((res && res.totalPoints) || 0)
      });
    } catch (e) {
      console.log('[index] point summary fail', e);
    }
  },

  async loadMySocialStats() {
    try {
      const [pendingPage, rejectedPage, hiddenPage] = await Promise.all([
        socialApi.pageMyPosts({ pageNum: 1, pageSize: 1, status: 2 }).catch(() => ({ total: 0 })),
        socialApi.pageMyPosts({ pageNum: 1, pageSize: 1, status: 3 }).catch(() => ({ total: 0 })),
        socialApi.pageMyPosts({ pageNum: 1, pageSize: 1, status: 0 }).catch(() => ({ total: 0 }))
      ]);

      this.setData({
        socialPendingCount: Number(pendingPage.total || 0),
        socialRejectedCount: Number(rejectedPage.total || 0),
        socialHiddenCount: Number(hiddenPage.total || 0)
      });
    } catch (e) {
      console.log('[index] social stats fail', e);
    }
  },

  goNotice() {
    wx.navigateTo({ url: '/pages/notice/list/list' });
  },

  goArticle() {
    wx.navigateTo({ url: '/pages/article/list/list' });
  },

  goRecord() {
    wx.navigateTo({ url: '/pages/health/record/record' });
  },

  goRisk() {
    wx.navigateTo({ url: '/pages/risk/index/index' });
  },

  goLatest() {
    wx.navigateTo({ url: '/pages/health/latest/latest' });
  },

  goFeedback() {
    wx.navigateTo({ url: '/pages/feedback/list/list' });
  },

  goMessage() {
    wx.navigateTo({ url: '/pages/message/list/list' });
  },

  goAssessment() {
    wx.navigateTo({ url: '/pages/assessment/index/index' });
  },

  goRecommend() {
    wx.navigateTo({ url: '/pages/recommend/today/index' });
  },

  goSocial() {
    wx.navigateTo({ url: '/pages/social/list/list' });
  },

  goMySocial() {
    wx.navigateTo({ url: '/pages/social/mine/mine' });
  },

  goChallenge() {
    wx.navigateTo({ url: '/pages/challenge/list/list' });
  },

  goPoints() {
    wx.navigateTo({ url: '/pages/points/index/index' });
  },

  goDashboard() {
    wx.navigateTo({ url: '/pages/dashboard/index' });
  },

  logout() {
    clearToken();
    wx.reLaunch({ url: '/pages/login/login' });
  }
});