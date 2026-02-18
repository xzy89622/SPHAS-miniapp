const { request } = require('../../../utils/request');
const { uploadFeedbackImage } = require('../../../utils/upload');

Page({
  data: {
    title: '',
    content: '',
    images: [], // 本地临时路径
    submitting: false
  },

  onTitle(e) { this.setData({ title: e.detail.value }); },
  onContent(e) { this.setData({ content: e.detail.value }); },

  chooseImage() {
    const { images } = this.data;
    if (images.length >= 6) {
      wx.showToast({ title: '最多上传6张', icon: 'none' });
      return;
    }

    wx.chooseMedia({
      count: 6 - images.length,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        // 限制大小：> 5MB 提示（你也可以改 2MB）
        const picked = (res.tempFiles || []).filter(f => {
          const ok = !f.size || f.size <= 5 * 1024 * 1024;
          if (!ok) wx.showToast({ title: '图片过大（需≤5MB）', icon: 'none' });
          return ok;
        }).map(f => f.tempFilePath);

        this.setData({ images: images.concat(picked) });
      }
    });
  },

  preview(e) {
    const src = e.currentTarget.dataset.src;
    wx.previewImage({ current: src, urls: this.data.images });
  },

  removeImage(e) {
    const idx = e.currentTarget.dataset.idx;
    const arr = this.data.images.slice();
    arr.splice(idx, 1);
    this.setData({ images: arr });
  },

  async onSubmit() {
    const { title, content, images } = this.data;

    if (!title.trim()) return wx.showToast({ title: '请输入标题', icon: 'none' });
    if (!content.trim()) return wx.showToast({ title: '请输入内容', icon: 'none' });

    try {
      this.setData({ submitting: true });
      wx.showLoading({ title: '提交中...' });

      const attachmentUrls = [];

      // 逐张上传：失败就提示并中断（避免提交缺图）
      for (let i = 0; i < images.length; i++) {
        wx.showLoading({ title: `上传图片 ${i + 1}/${images.length}` });
        const url = await uploadFeedbackImage(images[i]);
        attachmentUrls.push(url);
      }

      wx.showLoading({ title: '提交反馈中...' });

      await request({
        url: '/api/feedback/submit',
        method: 'POST',
        data: { title, content, attachmentUrls }
      });

      wx.hideLoading();
      wx.showToast({ title: '提交成功', icon: 'success' });

      // 回到列表页，列表 onShow 会自动刷新
      wx.navigateBack();
    } catch (e) {
      wx.hideLoading();
      wx.showToast({ title: e.message || '提交失败', icon: 'none' });
    } finally {
      this.setData({ submitting: false });
      wx.hideLoading();
    }
  }
});
