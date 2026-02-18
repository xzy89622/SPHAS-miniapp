const { request } = require('../../utils/request');
const { setToken } = require('../../utils/auth');

Page({
  data: {
    username: '',
    nickname: '',
    phone: '',
    password: '',
    password2: '',
    submitting: false
  },

  onUsername(e) { this.setData({ username: e.detail.value.trim() }); },
  onNickname(e) { this.setData({ nickname: e.detail.value }); },
  onPhone(e) { this.setData({ phone: e.detail.value.trim() }); },
  onPassword(e) { this.setData({ password: e.detail.value }); },
  onPassword2(e) { this.setData({ password2: e.detail.value }); },

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

      // 1) 注册（后端返回用户ID）
      await request({
        url: '/api/auth/register',
        method: 'POST',
        data: { username, password, nickname, phone }
      });

      // 2) 自动登录拿 token
      const token = await request({
        url: '/api/auth/login',
        method: 'POST',
        data: { username, password }
      });

      setToken(token);

      wx.hideLoading();
      wx.showToast({ title: '注册成功', icon: 'success' });
      wx.reLaunch({ url: '/pages/index/index' });
    } catch (e) {
      wx.hideLoading();
      // request.js 已经 toast 过了
    } finally {
      this.setData({ submitting: false });
    }
  }
});
