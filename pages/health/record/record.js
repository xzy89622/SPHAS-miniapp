// pages/health/record/record.js
// 功能：录入/更新健康数据（对接后端 POST /api/health/record）

const { request } = require('../../../utils/request');

function today() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

Page({
  data: {
    submitting: false,
    form: {
      recordDate: '',
      heightCm: '',
      weightKg: '',
      systolic: '',
      diastolic: '',
      heartRate: '',
      steps: '',
      sleepHours: '',
      remark: ''
    }
  },

  onLoad(options) {
    // 默认填今天
    this.setData({ 'form.recordDate': today() });

    // 如果从“最近记录”点进来，可能会带 recordDate（你后面想做编辑的话也方便）
    if (options && options.recordDate) {
      this.setData({ 'form.recordDate': options.recordDate });
    }
  },

  onDateChange(e) {
    this.setData({ 'form.recordDate': e.detail.value });
  },

  onInput(e) {
    const k = e.currentTarget.dataset.k;
    this.setData({ [`form.${k}`]: e.detail.value });
  },

  // 简单校验：日期必填，其他可选（后端 DTO 只有 recordDate @NotNull）
  validate() {
    const f = this.data.form;
    if (!f.recordDate) return '请选择日期';
    return '';
  },

  // 将 input 的字符串转成 number（为空则不传）
  toNum(v, type = 'float') {
    if (v === '' || v === null || v === undefined) return undefined;
    const n = type === 'int' ? parseInt(v, 10) : parseFloat(v);
    return Number.isNaN(n) ? undefined : n;
  },

  async onSubmit() {
    const msg = this.validate();
    if (msg) {
      wx.showToast({ title: msg, icon: 'none' });
      return;
    }

    const f = this.data.form;

    // 按后端 HealthRecordAddDTO 组装参数
    const payload = {
      recordDate: f.recordDate,
      heightCm: this.toNum(f.heightCm),
      weightKg: this.toNum(f.weightKg),
      systolic: this.toNum(f.systolic, 'int'),
      diastolic: this.toNum(f.diastolic, 'int'),
      heartRate: this.toNum(f.heartRate, 'int'),
      steps: this.toNum(f.steps, 'int'),
      sleepHours: this.toNum(f.sleepHours),
      remark: f.remark || undefined
    };

    try {
      this.setData({ submitting: true });

      // 后端返回 R<Long>（id），request 会 resolve body.data
      await request({
        url: '/api/health/record',
        method: 'POST',
        data: payload
      });

      wx.showToast({ title: '保存成功', icon: 'success' });
    } catch (e) {
      // request.js 已统一 toast，这里不重复打扰用户
      console.error('save record error:', e);
    } finally {
      this.setData({ submitting: false });
    }
  },

  goLatest() {
    wx.navigateTo({ url: '/pages/health/latest/latest' });
  }
});
