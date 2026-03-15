const auth = require('../../utils/auth');

Page({
  data: {
    username: '',
    password: '',
    loading: false
  },

  onUsername(e) {
    this.setData({ username: e.detail.value });
  },

  onPassword(e) {
    this.setData({ password: e.detail.value });
  },

  onLogin() {
    this.doLogin();
  },

  goRegister() {
    if (this.data.loading) return;
    wx.navigateTo({ url: '/pages/register/register' });
  },

  async doLogin() {
    if (this.data.loading) return;

    const username = (this.data.username || '').trim();
    const password = (this.data.password || '').trim();

    if (!username) {
      wx.showToast({ title: '请输入账号', icon: 'none' });
      return;
    }

    if (!password) {
      wx.showToast({ title: '请输入密码', icon: 'none' });
      return;
    }

    this.setData({ loading: true });

    try {
      const token = await auth.login(username, password);

      if (!token) {
        wx.showToast({ title: '登录失败：未返回 token', icon: 'none' });
        return;
      }

      auth.setToken(token);
      await auth.syncProfile();

      wx.showToast({ title: '登录成功', icon: 'success' });

      setTimeout(() => {
        wx.reLaunch({ url: '/pages/index/index' });
      }, 300);
    } catch (e) {
      console.error('login error =>', e);

      const msg =
        (e && e.msg) ||
        (e && e.errMsg) ||
        (e && e.message) ||
        '登录失败';

      wx.showToast({
        title: msg,
        icon: 'none'
      });
    } finally {
      this.setData({ loading: false });
    }
  }
});