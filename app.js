// app.js
App({
  globalData: {},

  onLaunch() {
    const stored = (wx.getStorageSync('BASE_URL') || '').trim();
    if (!stored) {
      wx.setStorageSync('BASE_URL', 'http://127.0.0.1:8080');
    }

    console.log('[app] BASE_URL =', wx.getStorageSync('BASE_URL'));
    console.log('[app] requireLogin exists =', typeof this.requireLogin);
    console.log('[app] logoutAndJump exists =', typeof this.logoutAndJump);
  },

  isLogin() {
    const token = wx.getStorageSync('token') || '';
    return !!token;
  },

  requireLogin() {
    const token = wx.getStorageSync('token') || '';
    if (token) return true;

    wx.showToast({
      title: '请先登录',
      icon: 'none'
    });

    setTimeout(() => {
      wx.reLaunch({
        url: '/pages/login/login'
      });
    }, 200);

    return false;
  },

  logoutAndJump() {
    wx.removeStorageSync('token');
    wx.removeStorageSync('userId');
    wx.removeStorageSync('userInfo');

    wx.reLaunch({
      url: '/pages/login/login'
    });
  },

  onPageNotFound() {
    wx.reLaunch({ url: '/pages/login/login' });
  }
});