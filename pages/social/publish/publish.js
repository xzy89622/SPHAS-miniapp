const socialApi = require('../../api/social');

Page({
  data: {
    content: '',
    images: [],
    submitting: false,
    maxCount: 6
  },

  onInput(e) {
    this.setData({
      content: e.detail.value || ''
    });
  },

  chooseImgs() {
    const remain = this.data.maxCount - this.data.images.length;
    if (remain <= 0) {
      wx.showToast({
        title: `最多 ${this.data.maxCount} 张`,
        icon: 'none'
      });
      return;
    }

    wx.chooseImage({
      count: remain,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const list = (res.tempFilePaths || []).filter(Boolean);
        if (!list.length) return;

        this.setData({
          images: this.data.images.concat(list).slice(0, this.data.maxCount)
        });
      }
    });
  },

  removeImg(e) {
    const idx = Number(e.currentTarget.dataset.idx);
    if (Number.isNaN(idx)) return;

    const next = this.data.images.slice();
    next.splice(idx, 1);
    this.setData({
      images: next
    });
  },

  preview(e) {
    const src = e.currentTarget.dataset.src;
    if (!src) return;

    wx.previewImage({
      current: src,
      urls: this.data.images
    });
  },

  async submit() {
    const content = String(this.data.content || '').trim();
    if (!content) {
      wx.showToast({
        title: '内容不能为空',
        icon: 'none'
      });
      return;
    }

    if (this.data.submitting) return;

    this.setData({
      submitting: true
    });

    wx.showLoading({
      title: '发布中'
    });

    try {
      const urls = [];

      for (const path of this.data.images) {
        const url = await socialApi.uploadSocialImage(path);
        urls.push(url);
      }

      await socialApi.createPost({
        content,
        imagesJson: JSON.stringify(urls)
      });

      wx.hideLoading();
      wx.showToast({
        title: '已提交审核',
        icon: 'success'
      });

      setTimeout(() => {
        wx.redirectTo({
          url: '/pages/social/mine/mine'
        });
      }, 350);
    } catch (e) {
      wx.hideLoading();
      console.error('[social publish] submit fail =', e);
      wx.showToast({
        title: e.msg || e.message || '发布失败',
        icon: 'none'
      });
    } finally {
      this.setData({
        submitting: false
      });
    }
  }
});