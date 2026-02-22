const api = require("../../../utils/request");

Page({
  data: { id: null, msg: {} },

  async onLoad(opt) {
    this.setData({ id: opt.id });
    await this.load();
    await this.markRead();
  },

  async load() {
    // ✅ 后端是 GET /api/message/detail/{id}
    const msg = await api.get(`/api/message/detail/${this.data.id}`);
    this.setData({ msg });
  },

  async markRead() {
    // ✅ 后端是 POST /api/message/read/{id}
    await api.post(`/api/message/read/${this.data.id}`);
  },
});