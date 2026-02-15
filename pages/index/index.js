// pages/index/index.js
const { clearToken } = require('../../utils/auth');

Page({
  goNotice() {
    wx.navigateTo({ url: '/pages/notice/list/list' });
  },
  

  goArticle() {
    wx.navigateTo({ url: '/pages/article/list/list' });
  },

  goMetrics() {
    wx.showToast({ title: '下一步做体质模块', icon: 'none' });
  },

  goRisk() {
    wx.showToast({ title: '下一步做风险模块', icon: 'none' });
  },

  goFeedback() {
    wx.showToast({ title: '下一步做反馈模块', icon: 'none' });
  },

  logout() {
    clearToken();
    wx.showToast({ title: '已退出', icon: 'success' });
    wx.reLaunch({ url: '/pages/login/login' });
  }
});
