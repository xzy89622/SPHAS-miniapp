const auth = require('../../utils/auth');
const request = require('../../utils/request');

Page({
  data: {
    form: {
      phone: '',
      nickname: '',
      password: '',
      confirmPassword: ''
    },
    submitting: false
  },

  onPhone(e) {
    this.setData({
      'form.phone': e.detail.value
    });
  },

  onNickname(e) {
    this.setData({
      'form.nickname': e.detail.value
    });
  },

  onPassword(e) {
    this.setData({
      'form.password': e.detail.value
    });
  },

  onPassword2(e) {
    this.setData({
      'form.confirmPassword': e.detail.value
    });
  },

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

  async onRegister() {
    if (this.data.submitting) return;

    const form = this.data.form;
    const phone = (form.phone || '').trim();
    const nickname = (form.nickname || '').trim();
    const password = (form.password || '').trim();
    const confirmPassword = (form.confirmPassword || '').trim();

    if (!phone) {
      wx.showToast({
        title: '请输入手机号',
        icon: 'none'
      });
      return;
    }

    if (!/^1\d{10}$/.test(phone)) {
      wx.showToast({
        title: '手机号格式不正确',
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

    if (password.length < 6) {
      wx.showToast({
        title: '密码至少 6 位',
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

    this.setData({
      submitting: true
    });

    try {
      await request.post('/api/auth/register', {
        username: phone,
        password,
        nickname: nickname || `用户${phone.slice(-4)}`,
        phone
      });

      const token = await auth.login(phone, password);

      if (!token) {
        wx.showToast({
          title: '注册成功，请返回登录',
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