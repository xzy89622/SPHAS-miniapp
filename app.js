App({
  globalData: {
    // 这里改成你自己的后端地址
    // 本地联调一般填你电脑的局域网 IP
    // 例如：http://192.168.1.10:8080
    defaultBaseUrl: 'http://192.168.1.10:8080'
  },

  onLaunch() {
    const stored = (wx.getStorageSync('BASE_URL') || '').trim();

    // 第一次启动时，如果本地没存地址，就写入默认地址
    if (!stored) {
      wx.setStorageSync('BASE_URL', this.globalData.defaultBaseUrl);
    }

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