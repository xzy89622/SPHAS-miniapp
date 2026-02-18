// pages/index/index.js
const { clearToken } = require('../../utils/auth');

Page({
  goNotice() {
    wx.navigateTo({ url: '/pages/notice/list/list' });
  },
  goArticle() {
    wx.navigateTo({ url: '/pages/article/list/list' });
  },
  goFeedback() {
    wx.navigateTo({ url: '/pages/feedback/list/list' });
  },

  // ✅ 体质记录：去录入页
  goRecord() {
    wx.navigateTo({ url: '/pages/health/record/record' });
  },

  // ✅ 最近记录
  goLatest() {
    wx.navigateTo({ url: '/pages/health/latest/latest' });
  },

  // ✅ 风险预警：先跳到风险页（占位页），后面我们再对接真实接口
  goRisk() {
    wx.navigateTo({ url: '/pages/risk/index/index' });
  },

  logout() {
    clearToken();
    wx.reLaunch({ url: '/pages/login/login' });
  }
});
