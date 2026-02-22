// utils/auth.js
const api = require("./request");

// ✅ 登录（根据你后端实际接口路径修改）
// 如果你后端是 /api/auth/login 就不用改
function login(username, password) {
  return api.post("/api/auth/login", { username, password });
}

// ✅ 注册（如果你用得到）
function register(username, password) {
  return api.post("/api/auth/register", { username, password });
}

// ✅ 获取当前登录用户信息（如果后端有这个接口）
function profile() {
  return api.get("/api/user/profile");
}

module.exports = {
  login,
  register,
  profile,
};