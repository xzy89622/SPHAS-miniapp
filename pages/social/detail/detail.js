const socialApi = require('../../api/social');

function formatTime(timeStr) {
  if (!timeStr) return '';
  return String(timeStr)
    .replace('T', ' ')
    .replace(/\.\d+$/, '')
    .slice(0, 16);
}

function pickFirst(obj, keys, defaultValue = '') {
  for (const key of keys) {
    const value = obj && obj[key];
    if (value !== undefined && value !== null && value !== '') {
      return value;
    }
  }
  return defaultValue;
}

Page({
  data: {
    id: 0,
    loading: false,
    saving: false,
    detail: null,
    comments: [],
    commentContent: '',
    canInteract: false,
    liked: false
  },

  onLoad(options) {
    const id = Number(options.id || 0);
    if (!id) {
      wx.showToast({
        title: '帖子ID无效',
        icon: 'none'
      });
      return;
    }

    this.setData({ id });
    this.loadAll();
  },

  onShow() {
    if (this.data.id) {
      this.loadAll();
    }
  },

  onPullDownRefresh() {
    this.loadAll().finally(() => {
      wx.stopPullDownRefresh();
    });
  },

  async loadAll() {
    const id = Number(this.data.id || 0);
    if (!id) return;

    this.setData({ loading: true });

    try {
      const [detailRes, commentRes] = await Promise.all([
        socialApi.postDetail(id),
        socialApi.commentList(id, {
          pageNum: 1,
          pageSize: 50
        }).catch(() => ({ records: [] }))
      ]);

      const detail = this.normalizeDetail(detailRes || {});
      const comments = this.normalizeComments(commentRes || {});
      const canInteract = Number(detail.status) === 1;

      this.setData({
        detail,
        comments,
        canInteract,
        liked: !!detail.liked
      });
    } catch (e) {
      console.error('[social detail] loadAll fail =', e);
      wx.showToast({
        title: e.msg || e.message || '加载失败',
        icon: 'none'
      });
    } finally {
      this.setData({ loading: false });
    }
  },

  normalizeDetail(raw) {
    // 后端详情接口返回的是 { post: {...}, liked: true/false }
    const post = raw && raw.post ? raw.post : raw;
    const normalized = socialApi.normalizePost ? socialApi.normalizePost(post) : (post || {});

    const nickname = pickFirst(normalized, [
      'nickname',
      'nickName',
      'username',
      'userName',
      'authorName'
    ], '用户');

    const createTime = pickFirst(normalized, [
      'createTime',
      'createdAt',
      'gmtCreate',
      'publishTime'
    ], '');

    return {
      ...normalized,
      liked: !!(raw && raw.liked),
      avatarText: String(nickname).slice(0, 1) || '用',
      nickname,
      contentText: normalized.content || '',
      createTimeText: formatTime(createTime),
      likeCountText: Number(normalized.likeCount || 0),
      commentCountText: Number(normalized.commentCount || 0)
    };
  },

  normalizeComments(raw) {
    const page = socialApi.normalizeCommentPage ? socialApi.normalizeCommentPage(raw) : raw;
    const list = Array.isArray(page.records) ? page.records : [];

    return list.map(item => {
      const nickname = pickFirst(item, [
        'nickname',
        'nickName',
        'username',
        'userName'
      ], '用户');

      const content = pickFirst(item, [
        'content',
        'commentContent',
        'text'
      ], '');

      const createTime = pickFirst(item, [
        'createTime',
        'createdAt',
        'gmtCreate'
      ], '');

      return {
        ...item,
        nickname,
        avatarText: String(nickname).slice(0, 1) || '用',
        contentText: content,
        createTimeText: formatTime(createTime)
      };
    });
  },

  previewImage(e) {
    const current = e.currentTarget.dataset.url;
    const urls = (this.data.detail && this.data.detail.images) || [];

    if (!current || !urls.length) return;

    wx.previewImage({
      current,
      urls
    });
  },

  async onToggleLike() {
    if (!this.data.canInteract) {
      wx.showToast({
        title: '当前状态不可互动',
        icon: 'none'
      });
      return;
    }

    try {
      await socialApi.toggleLike(this.data.id);
      await this.loadAll();
    } catch (e) {
      console.error('[social detail] like fail =', e);
      wx.showToast({
        title: e.msg || e.message || '操作失败',
        icon: 'none'
      });
    }
  },

  onCommentInput(e) {
    this.setData({
      commentContent: e.detail.value
    });
  },

  async onSubmitComment() {
    if (!this.data.canInteract) {
      wx.showToast({
        title: '当前状态不可评论',
        icon: 'none'
      });
      return;
    }

    const content = String(this.data.commentContent || '').trim();
    if (!content) {
      wx.showToast({
        title: '请输入评论内容',
        icon: 'none'
      });
      return;
    }

    this.setData({ saving: true });

    try {
      await socialApi.addComment({
        postId: this.data.id,
        content
      });

      wx.showToast({
        title: '评论成功',
        icon: 'success'
      });

      this.setData({
        commentContent: ''
      });

      await this.loadAll();
    } catch (e) {
      console.error('[social detail] comment fail =', e);
      wx.showToast({
        title: e.msg || e.message || '评论失败',
        icon: 'none'
      });
    } finally {
      this.setData({ saving: false });
    }
  }
});