const api = require('../../api/social');

Page({
  data: {
    content: '',
    images: [],
    submitting: false
  },

  onInput(e) {
    this.setData({
      content: e.detail.value || ''
    });
  },

  chooseImgs() {
    const remain = 6 - this.data.images.length;
    if (remain <= 0) {
      wx.showToast({
        title: '最多 6 张',
        icon: 'none'
      });
      return;
    }

    wx.chooseImage({
      count: remain,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const list = res.tempFilePaths || [];
        this.setData({
          images: this.data.images.concat(list)
        });
      }
    });
  },

  removeImg(e) {
    const idx = Number(e.currentTarget.dataset.idx);
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
    const content = (this.data.content || '').trim();
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

    try {
      const urls = [];

      for (const path of this.data.images) {
        const url = await api.uploadImage(path);
        urls.push(url);
      }

      await api.createPost({
        content,
        imagesJson: JSON.stringify(urls)
      });

      wx.showToast({
        title: '已提交审核',
        icon: 'success'
      });

      setTimeout(() => {
        wx.redirectTo({
          url: '/pages/social/mine/mine'
        });
      }, 300);
    } catch (e) {
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