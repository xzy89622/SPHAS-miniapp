// pages/login/login.js
// 这里先做 token 存取测试：点击登录会保存一个假 token 并立刻读取出来弹窗显示

const { request } = require('../../utils/request');
const { setToken } = require('../../utils/auth');


Page({
  data: {
    username: '',
    password: ''
  },

  onUsername(e) {
    this.setData({ username: e.detail.value });
  },

  onPassword(e) {
    this.setData({ password: e.detail.value });
  },

  async onLogin() {
    const { username, password } = this.data;
  
    if (!username || !password) {
      wx.showToast({ title: '请输入账号和密码', icon: 'none' });
      return;
    }
  
    this.setData({ submitting: true });
  
    // ✅ 一定要放 try/finally，确保任何情况都能关 loading
    try {
      wx.showLoading({ title: '登录中...' });
  
      const token = await request({
        url: '/api/auth/login',
        method: 'POST',
        data: { username, password }
      });
  
      setToken(token);
  
      wx.hideLoading(); // ✅ 导航前先关
      wx.reLaunch({ url: '/pages/index/index' });
    } catch (e) {
      // ✅ request.js 已 toast 过，这里确保 loading 被关就行
    } finally {
      wx.hideLoading(); // ✅ 再兜底一次
      this.setData({ submitting: false });
    }
  },
  
  

  goRegister() {
    wx.navigateTo({ url: '/pages/register/register' });
  }
});
