App({
  globalData: {
    defaultBaseUrl: 'https://api.jiankangzhushouxzy.xyz'
  },

  onLaunch() {
    wx.setStorageSync('BASE_URL', this.globalData.defaultBaseUrl);
    console.log('[app] BASE_URL =', wx.getStorageSync('BASE_URL'));
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
    wx.reLaunch({
      url: '/pages/login/login'
    });
  }
});