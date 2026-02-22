// pages/api/article.js
// 说明：不要再自己写 baseURL，统一走 utils/request.js，避免“改了一个地方另一个还在用旧地址”。

const api = require("../../utils/request");

// 科普列表（只返回已发布）
function getArticleList() {
  return api.get("/api/article/list");
}

// 文章详情（只允许访问已发布）
function getArticleDetail(id) {
  return api.get(`/api/article/${id}`);
}

module.exports = {
  getArticleList,
  getArticleDetail
};