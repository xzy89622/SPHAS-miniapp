const request = require('../../../utils/request');
const auth = require('../../../utils/auth');

Page({
  data: {
    loading: false,
    saving: false,
    genderOptions: ['男', '女', '其它'],
    form: {
      username: '',
      role: '',
      nickname: '',
      phone: '',
      age: '',
      gender: '',
      heightCm: '',
      initialWeightKg: ''
    }
  },

  onLoad() {
    this.loadProfile();
  },

  async loadProfile() {
    this.setData({
      loading: true
    });

    try {
      const res = await request.get('/api/user/profile');

      this.setData({
        form: {
          username: res.username || '',
          role: this.formatRole(res.role),
          nickname: res.nickname || '',
          phone: res.phone || '',
          age: res.age == null ? '' : String(res.age),
          gender: res.gender || '',
          heightCm: res.heightCm == null ? '' : String(res.heightCm),
          initialWeightKg: res.initialWeightKg == null ? '' : String(res.initialWeightKg)
        }
      });
    } catch (e) {
      console.error('[profile] load fail =', e);
      wx.showToast({
        title: e.msg || e.message || '加载失败',
        icon: 'none'
      });
    } finally {
      this.setData({
        loading: false
      });
    }
  },

  formatRole(role) {
    if (role === 'ADMIN') return '管理员';
    if (role === 'USER') return '普通用户';
    if (role === 'AI_ADVISOR') return 'AI健康顾问';
    return role || '未知角色';
  },

  onNicknameInput(e) {
    this.setData({
      'form.nickname': e.detail.value
    });
  },

  onPhoneInput(e) {
    this.setData({
      'form.phone': e.detail.value
    });
  },

  onAgeInput(e) {
    this.setData({
      'form.age': e.detail.value
    });
  },

  onHeightInput(e) {
    this.setData({
      'form.heightCm': e.detail.value
    });
  },

  onInitialWeightInput(e) {
    this.setData({
      'form.initialWeightKg': e.detail.value
    });
  },

  // 点性别按钮
  onGenderTap(e) {
    const gender = e.currentTarget.dataset.gender || '';
    this.setData({
      'form.gender': gender
    });
  },

  async onSave() {
    if (this.data.saving) return;

    const nickname = (this.data.form.nickname || '').trim();
    const phone = (this.data.form.phone || '').trim();
    const ageText = (this.data.form.age || '').trim();
    const gender = (this.data.form.gender || '').trim();
    const heightText = (this.data.form.heightCm || '').trim();
    const weightText = (this.data.form.initialWeightKg || '').trim();

    if (phone && !/^1\d{10}$/.test(phone)) {
      wx.showToast({
        title: '手机号格式不正确',
        icon: 'none'
      });
      return;
    }

    if (ageText) {
      const age = Number(ageText);
      if (Number.isNaN(age) || age < 1 || age > 120) {
        wx.showToast({
          title: '年龄范围不正确',
          icon: 'none'
        });
        return;
      }
    }

    if (heightText) {
      const height = Number(heightText);
      if (Number.isNaN(height) || height < 50 || height > 250) {
        wx.showToast({
          title: '身高范围不正确',
          icon: 'none'
        });
        return;
      }
    }

    if (weightText) {
      const weight = Number(weightText);
      if (Number.isNaN(weight) || weight < 10 || weight > 500) {
        wx.showToast({
          title: '初始体重范围不正确',
          icon: 'none'
        });
        return;
      }
    }

    this.setData({
      saving: true
    });

    try {
      const res = await request.put('/api/user/profile', {
        nickname,
        phone,
        age: ageText ? Number(ageText) : null,
        gender: gender || null,
        heightCm: heightText ? Number(heightText) : null,
        initialWeightKg: weightText ? Number(weightText) : null
      });

      // 保存成功后顺手更新本地缓存
      const localUser = auth.getUserInfo ? (auth.getUserInfo() || {}) : {};
      const nextUser = {
        ...localUser,
        nickname: res.nickname || '',
        phone: res.phone || '',
        age: res.age,
        gender: res.gender,
        heightCm: res.heightCm,
        initialWeightKg: res.initialWeightKg
      };

      if (auth.setUserInfo) {
        auth.setUserInfo(nextUser);
      } else {
        wx.setStorageSync('userInfo', nextUser);
      }

      wx.showToast({
        title: '保存成功',
        icon: 'success'
      });

      setTimeout(() => {
        wx.navigateBack();
      }, 300);
    } catch (e) {
      console.error('[profile] save fail =', e);
      wx.showToast({
        title: e.msg || e.message || '保存失败',
        icon: 'none'
      });
    } finally {
      this.setData({
        saving: false
      });
    }
  }
});