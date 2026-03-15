const auth = require('../../utils/auth');
const request = require('../../utils/request');

Page({
  data: {
    form: {
      username: '',
      nickname: '',
      phone: '',
      password: '',
      confirmPassword: ''
    },
    submitting: false
  },

  // 输入账号
  onUsername(e) {
    this.setData({
      'form.username': e.detail.value
    });
  },

  // 输入昵称
  onNickname(e) {
    this.setData({
      'form.nickname': e.detail.value
    });
  },

  // 输入手机号
  onPhone(e) {
    this.setData({
      'form.phone': e.detail.value
    });
  },

  // 输入密码
  onPassword(e) {
    this.setData({
      'form.password': e.detail.value
    });
  },

  // 输入确认密码
  onPassword2(e) {
    this.setData({
      'form.confirmPassword': e.detail.value
    });
  },

  // 返回登录
  goLogin() {
    if (this.data.submitting) return;

    wx.navigateBack({
      delta: 1,
      fail: () => {
        wx.redirectTo({
          url: '/pages/login/login'
        });
      }
    });
  },

  // 注册
  async onRegister() {
    if (this.data.submitting) return;

    const form = this.data.form;
    const username = (form.username || '').trim();
    const nickname = (form.nickname || '').trim();
    const phone = (form.phone || '').trim();
    const password = (form.password || '').trim();
    const confirmPassword = (form.confirmPassword || '').trim();

    if (!username) {
      wx.showToast({
        title: '请输入账号',
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

    if (!confirmPassword) {
      wx.showToast({
        title: '请输入确认密码',
        icon: 'none'
      });
      return;
    }

    if (password !== confirmPassword) {
      wx.showToast({
        title: '两次密码不一致',
        icon: 'none'
      });
      return;
    }

    if (phone && !/^1\d{10}$/.test(phone)) {
      wx.showToast({
        title: '手机号格式不正确',
        icon: 'none'
      });
      return;
    }

    this.setData({
      submitting: true
    });

    try {
      // 这里一定要对上后端 /api/auth/register
      await request.post('/api/auth/register', {
        username,
        password,
        nickname,
        phone
      });

      // 注册成功后直接登录
      const token = await auth.login(username, password);

      if (!token) {
        wx.showToast({
          title: '注册成功，请登录',
          icon: 'none'
        });
        return;
      }

      auth.setToken(token);
      await auth.syncProfile();

      wx.showToast({
        title: '注册成功',
        icon: 'success'
      });

      setTimeout(() => {
        wx.reLaunch({
          url: '/pages/index/index'
        });
      }, 300);
    } catch (e) {
      console.error('register error =>', e);

      wx.showToast({
        title: e.msg || e.message || '注册失败',
        icon: 'none'
      });
    } finally {
      this.setData({
        submitting: false
      });
    }
  }
});