const request = require('../../../utils/request');

function today() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

function toDateTimeString(dateStr) {
  return `${dateStr} 08:00:00`;
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
    this.setData({ 'form.recordDate': today() });

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

  validate() {
    const f = this.data.form;

    if (!f.recordDate) return '请选择日期';

    if (f.heightCm && (Number(f.heightCm) < 80 || Number(f.heightCm) > 250)) {
      return '身高请填写 80~250 之间';
    }

    if (f.weightKg && (Number(f.weightKg) < 20 || Number(f.weightKg) > 300)) {
      return '体重请填写 20~300 之间';
    }

    return '';
  },

  toNum(v, type = 'float') {
    if (v === '' || v === null || v === undefined) return undefined;
    const n = type === 'int' ? parseInt(v, 10) : parseFloat(v);
    return Number.isNaN(n) ? undefined : n;
  },

  buildHealthPayload() {
    const f = this.data.form;

    return {
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
  },

  buildMetricPayload() {
    const f = this.data.form;

    return {
      recordTime: toDateTimeString(f.recordDate),
      heightCm: this.toNum(f.heightCm),
      weightKg: this.toNum(f.weightKg),
      systolic: this.toNum(f.systolic, 'int'),
      diastolic: this.toNum(f.diastolic, 'int'),
      steps: this.toNum(f.steps, 'int'),
      sleepHours: this.toNum(f.sleepHours)
    };
  },

  async saveBaseHealthRecord(payload) {
    return request({
      url: '/api/health/record',
      method: 'POST',
      data: payload
    });
  },

  async saveMetricRecord(payload) {
    const hasMetricCore =
      payload.heightCm !== undefined ||
      payload.weightKg !== undefined ||
      payload.systolic !== undefined ||
      payload.diastolic !== undefined ||
      payload.steps !== undefined ||
      payload.sleepHours !== undefined;

    if (!hasMetricCore) {
      return null;
    }

    return request({
      url: '/api/user/metrics',
      method: 'POST',
      data: payload
    });
  },

  async onSubmit() {
    const msg = this.validate();
    if (msg) {
      wx.showToast({ title: msg, icon: 'none' });
      return;
    }

    const healthPayload = this.buildHealthPayload();
    const metricPayload = this.buildMetricPayload();

    try {
      this.setData({ submitting: true });

      await this.saveBaseHealthRecord(healthPayload);

      try {
        await this.saveMetricRecord(metricPayload);
      } catch (metricErr) {
        console.error('[health record] save metric fail:', metricErr);
      }

      wx.showModal({
        title: '保存成功',
        content: '健康数据已保存，是否立即去做体质评估？',
        confirmText: '去评估',
        cancelText: '继续查看',
        success: (res) => {
          if (res.confirm) {
            wx.navigateTo({ url: '/pages/assessment/index/index' });
          } else {
            wx.navigateTo({ url: '/pages/health/latest/latest' });
          }
        }
      });
    } catch (e) {
      console.error('[health record] save fail:', e);
    } finally {
      this.setData({ submitting: false });
    }
  },

  goLatest() {
    wx.navigateTo({ url: '/pages/health/latest/latest' });
  }
});