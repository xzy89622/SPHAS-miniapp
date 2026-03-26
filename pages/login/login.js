const auth = require('../../utils/auth');

Page({
  data: {
    account: '',
    password: '',
    loading: false,
    wxLoading: false
  },

  onAccount(e) {
    this.setData({ account: e.detail.value });
  },

  onPassword(e) {
    this.setData({ password: e.detail.value });
  },

  onLogin() {
    this.doLogin();
  },

  goRegister() {
    if (this.data.loading || this.data.wxLoading) return;
    wx.navigateTo({ url: '/pages/register/register' });
  },

  async doLogin() {
    if (this.data.loading || this.data.wxLoading) return;

    const account = (this.data.account || '').trim();
    const password = (this.data.password || '').trim();

    if (!account) {
      wx.showToast({
        title: '请输入账号或手机号',
        icon: 'none'
      });
      return;
    }

    if (!password) {
      wx.showToast({
        title: '请输入密码',
        icon: 'none'
      });
      return;
    }

    this.setData({ loading: true });

    try {
      const token = await auth.login(account, password);

      if (!token) {
        wx.showToast({
          title: '登录失败：未返回 token',
          icon: 'none'
        });
        return;
      }

      await this.finishLogin(token);
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
  },

  // 一个按钮统一处理，优先手机号授权，拿不到就降级成 openid 登录
  async onGetPhoneNumber(e) {
    if (this.data.loading || this.data.wxLoading) return;

    this.setData({ wxLoading: true });

    try {
      const detail = (e && e.detail) || {};
      const phoneCode = detail.code || '';
      const loginCode = await this.getWxLoginCode();

      if (!loginCode) {
        wx.showToast({
          title: '获取微信登录凭证失败',
          icon: 'none'
        });
        return;
      }

      let token = '';

      if (phoneCode) {
        token = await auth.wxPhoneLogin(loginCode, phoneCode, '', '');
      } else {
        token = await auth.wxLogin(loginCode, '', '');
      }

      if (!token) {
        wx.showToast({
          title: '微信登录失败',
          icon: 'none'
        });
        return;
      }

      await this.finishLogin(token);
    } catch (err) {
      console.error('wx login error =>', err);

      wx.showToast({
        title: err.msg || err.message || '微信登录失败',
        icon: 'none'
      });
    } finally {
      this.setData({ wxLoading: false });
    }
  },

  getWxLoginCode() {
    return new Promise((resolve, reject) => {
      wx.login({
        success: (res) => {
          const code = (res && res.code) || '';
          if (!code) {
            reject(new Error('未获取到 code'));
            return;
          }
          resolve(code);
        },
        fail: (err) => {
          reject(err);
        }
      });
    });
  },

  async finishLogin(token) {
    auth.setToken(token);
    await auth.syncProfile();

    wx.showToast({
      title: '登录成功',
      icon: 'success'
    });

    setTimeout(() => {
      wx.reLaunch({
        url: '/pages/index/index'
      });
    }, 300);
  }
});