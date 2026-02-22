const { clearToken } = require('../../utils/auth');

Page({
  goNotice() { wx.navigateTo({ url: '/pages/notice/list/list' }); },
  goArticle() { wx.navigateTo({ url: '/pages/article/list/list' }); },
  goRecord() { wx.navigateTo({ url: '/pages/health/record/record' }); },
  goRisk() { wx.navigateTo({ url: '/pages/risk/index/index' }); },
  goLatest() { wx.navigateTo({ url: '/pages/health/latest/latest' }); },
  
  goDashboard() {
    wx.navigateTo({
      url: "/pages/dashboard/index"
    });
  },
  // ✅ 补回：问题反馈
  goFeedback() { wx.navigateTo({ url: '/pages/feedback/list/list' }); },

  logout() {
    clearToken();
    wx.reLaunch({ url: '/pages/login/login' });
  }

});
