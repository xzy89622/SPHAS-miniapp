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
      wx.showToast({ title: '请输入用户名和密码', icon: 'none' });
      return;
    }
  
    try {
      wx.showLoading({ title: '登录中...' });
  
      // ✅ 对接后端：POST /api/auth/login
      // 后端返回 data = token 字符串
      const token = await request({
        url: '/api/auth/login',
        method: 'POST',
        data: { username, password }
      });
  
      // 保存 token
      setToken(token);
  
      wx.hideLoading();
      wx.showToast({ title: '登录成功', icon: 'success' });
  
      // 先不做首页，先跳到 index 页验证登录后的跳转
      wx.reLaunch({ url: '/pages/index/index' });
    } catch (e) {
      wx.hideLoading();
      // request.js 里已经 toast 过了，这里可以不重复提示
    }
  },
  

  goRegister() {
    wx.navigateTo({ url: '/pages/register/register' });
  }
});
