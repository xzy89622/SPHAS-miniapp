// pages/register/register.js
const auth = require('../../utils/auth');

Page({
  data: {
    username: '',
    nickname: '',
    phone: '',
    password: '',
    password2: '',
    submitting: false
  },

  onUsername(e) {
    this.setData({ username: (e.detail.value || '').trim() });
  },

  onNickname(e) {
    this.setData({ nickname: e.detail.value || '' });
  },

  onPhone(e) {
    this.setData({ phone: (e.detail.value || '').trim() });
  },

  onPassword(e) {
    this.setData({ password: e.detail.value || '' });
  },

  onPassword2(e) {
    this.setData({ password2: e.detail.value || '' });
  },

  goLogin() {
    wx.navigateBack();
  },

  async onRegister() {
    const { username, nickname, phone, password, password2 } = this.data;

    if (!username) {
      wx.showToast({ title: '请输入账号', icon: 'none' });
      return;
    }

    if (!password) {
      wx.showToast({ title: '请输入密码', icon: 'none' });
      return;
    }

    if (password !== password2) {
      wx.showToast({ title: '两次密码不一致', icon: 'none' });
      return;
    }

    if (phone && !/^1\d{10}$/.test(phone)) {
      wx.showToast({ title: '手机号格式不正确', icon: 'none' });
      return;
    }

    try {
      this.setData({ submitting: true });
      wx.showLoading({ title: '注册中...' });

      // 1）注册
      await auth.register({
        username,
        password,
        nickname,
        phone
      });

      // 2）自动登录
      const token = await auth.login(username, password);
      auth.setToken(token);

      // 3）同步当前用户资料，存 userId / userInfo
      const profile = await auth.syncProfile();

      console.log('[register] profile =', profile);

      wx.hideLoading();
      wx.showToast({ title: '注册成功', icon: 'success' });

      setTimeout(() => {
        wx.reLaunch({ url: '/pages/index/index' });
      }, 200);
    } catch (e) {
      wx.hideLoading();

      const msg =
        (e && e.msg) ||
        (e && e.errMsg) ||
        (e && e.message) ||
        '注册失败';

      wx.showToast({ title: msg, icon: 'none' });
    } finally {
      this.setData({ submitting: false });
    }
  }
});