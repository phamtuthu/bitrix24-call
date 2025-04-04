const axios = require("axios");
require("dotenv").config();
const BITRIX_DOMAIN = process.env.BITRIX_DOMAIN;
const BITRIX_API_KEY = process.env.BITRIX_API_KEY;
const BITRIX_ID = process.env.BITRIX_ID;
// URL API cố định với webhook token
const BITRIX_API_URL = `${BITRIX_DOMAIN}/rest/${BITRIX_ID}/${BITRIX_API_KEY}`;

// Hàm gửi request tới Bitrix24
async function bitrixRequest(method, httpMethod = "POST", params = {}) {
  try {
    const url = `${BITRIX_API_URL}/${method}`;
 //   console.log(`📤 Sending request to: ${url}`);

    const response = await axios({
      method: httpMethod,
      url: url,
      data: params,
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (response.data.error) {
      throw new Error(`❌ Bitrix API error: ${response.data.error_description || response.data.error}`);
    }

    return response.data;
  } catch (error) {
    console.error("❌ Bitrix API request failed:", error.response?.data || error.message);
    throw error;
  }
}

module.exports = bitrixRequest;
/*const axios = require("axios");
require("dotenv").config();

// Lấy thông tin từ biến môi trường
const BITRIX_DOMAIN = process.env.BITRIX_DOMAIN;
let accessToken = process.env.BITRIX_ACCESS_TOKEN || "";
let refreshToken = process.env.BITRIX_REFRESH_TOKEN || "";
let lastRefreshTime = 0; // Thời gian lần refresh cuối
const REFRESH_COOLDOWN = 5 * 60 * 1000; // 5 phút cooldown

// Hàm làm mới token
async function refreshAccessToken() {
  const now = Date.now();
  if (now - lastRefreshTime < REFRESH_COOLDOWN) {
    console.log("⏳ Token refresh on cooldown. Using existing token:", accessToken.slice(0, 10) + "...");
    return;
  }

  try {
    console.log("🔄 Refreshing Bitrix token...");
    console.log("🔧 Using refresh_token:", refreshToken.slice(0, 10) + "...");
    const response = await axios.post(`${BITRIX_DOMAIN}/oauth/token/`, {
      grant_type: "refresh_token",
      client_id: process.env.BITRIX_CLIENT_ID,
      client_secret: process.env.BITRIX_CLIENT_SECRET,
      refresh_token: refreshToken,
    });

    console.log("📥 Bitrix response:", response.data); // Log chi tiết response
    accessToken = response.data.access_token;
    refreshToken = response.data.refresh_token; // Cập nhật refresh token
    lastRefreshTime = now;
    console.log("✅ Token refreshed successfully!", accessToken.slice(0, 10) + "...");
  } catch (error) {
    console.error("❌ Error refreshing token:", error.response?.data || error.message);
    throw new Error("🚨 Failed to refresh token. Check BITRIX_REFRESH_TOKEN, CLIENT_ID, CLIENT_SECRET in Railway Variables.");
  }
}

// Hàm khởi tạo token khi bắt đầu
async function initializeToken() {
  if (!accessToken && refreshToken) {
    console.log("ℹ️ No access token found. Initializing with refresh token...");
    await refreshAccessToken();
  } else if (!refreshToken) {
    throw new Error("🚨 No BITRIX_REFRESH_TOKEN provided. Set it in Railway Variables.");
  } else {
    console.log("ℹ️ Using existing access token:", accessToken.slice(0, 10) + "...");
  }
}

// Hàm gửi request tới Bitrix24
async function bitrixRequest(method, httpMethod = "POST", params = {}) {
  try {
    if (!accessToken) {
      await refreshAccessToken(); // Làm mới nếu token rỗng
    }

    const url = `${BITRIX_DOMAIN}/rest/${method}`;
    console.log(`📤 Sending request to: ${url} with token: ${accessToken.slice(0, 10)}...`);
    const response = await axios({
      method: httpMethod,
      url: url,
      data: params,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
    });

    return response.data;
  } catch (error) {
    if (error.response && error.response.status === 401) {
      console.warn("🔄 Token expired. Refreshing...");
      await refreshAccessToken();
      return bitrixRequest(method, httpMethod, params); // Thử lại với token mới
    } else {
      console.error("❌ Bitrix API error:", error.response?.data || error.message);
      throw error;
    }
  }
}

// Khởi tạo token ngay khi module được load
initializeToken().catch((err) => {
  console.error(err.message);
  process.exit(1); // Thoát nếu không thể khởi tạo token
});

module.exports = bitrixRequest;
/*const axios = require("axios");
require("dotenv").config();

// Lấy thông tin từ biến môi trường
const BITRIX_DOMAIN = process.env.BITRIX_DOMAIN;
let accessToken = process.env.BITRIX_ACCESS_TOKEN || "";
let refreshToken = process.env.BITRIX_REFRESH_TOKEN || "";
let lastRefreshTime = 0; // Thời gian lần refresh cuối
const REFRESH_COOLDOWN = 5 * 60 * 1000; // 5 phút cooldown

// Hàm làm mới token
async function refreshAccessToken() {
  const now = Date.now();
  if (now - lastRefreshTime < REFRESH_COOLDOWN) {
    console.log("⏳ Token refresh on cooldown. Using existing token.");
    return;
  }

  try {
    console.log("🔄 Refreshing Bitrix token...");
    const response = await axios.post(`${BITRIX_DOMAIN}/oauth/token/`, {
      grant_type: "refresh_token",
      client_id: process.env.BITRIX_CLIENT_ID,
      client_secret: process.env.BITRIX_CLIENT_SECRET,
      refresh_token: refreshToken,
    });

    accessToken = response.data.access_token;
    refreshToken = response.data.refresh_token; // Cập nhật refresh token trong bộ nhớ
    lastRefreshTime = now; // Cập nhật thời gian refresh
    console.log("✅ Token refreshed successfully!", accessToken);
  } catch (error) {
    console.error("❌ Error refreshing token:", error.response?.data || error.message);
    throw new Error("🚨 Failed to refresh token. Update BITRIX_REFRESH_TOKEN in Railway Variables and redeploy.");
  }
}

// Hàm gửi request tới Bitrix24
async function bitrixRequest(method, httpMethod = "POST", params = {}) {
  try {
    if (!accessToken) {
      console.log("ℹ️ No access token found. Initializing refresh...");
      await refreshAccessToken();
    }

    const url = `${BITRIX_DOMAIN}/rest/${method}`;
 //   console.log(`📤 Sending request to: ${url} with token: ${accessToken.slice(0, 10)}...`);
    const response = await axios({
      method: httpMethod,
      url: url,
      data: params,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
    });

    return response.data;
  } catch (error) {
    if (error.response && error.response.status === 401) {
      console.warn("🔄 Token expired. Refreshing...");
      await refreshAccessToken();
      // Thử lại request với token mới
      return bitrixRequest(method, httpMethod, params);
    } else {
      console.error("❌ Bitrix API error:", error.response?.data || error.message);
      throw error;
    }
  }
}

module.exports = bitrixRequest;
const axios = require("axios");
require("dotenv").config();

// Lấy thông tin từ biến môi trường
const BITRIX_DOMAIN = process.env.BITRIX_DOMAIN;
let accessToken = process.env.BITRIX_ACCESS_TOKEN || "";
let refreshToken = process.env.BITRIX_REFRESH_TOKEN || "";

// Hàm làm mới token
async function refreshAccessToken() {
  try {
    console.log("🔄 Refreshing Bitrix token...");
    const response = await axios.post(`${BITRIX_DOMAIN}/oauth/token/`, {
      grant_type: "refresh_token",
      client_id: process.env.BITRIX_CLIENT_ID,
      client_secret: process.env.BITRIX_CLIENT_SECRET,
      refresh_token: refreshToken,
    });

    accessToken = response.data.access_token;
    refreshToken = response.data.refresh_token; // Cập nhật refresh token trong bộ nhớ
    console.log("✅ Token refreshed successfully!");
  } catch (error) {
    console.error("❌ Error refreshing token:", error.response?.data || error.message);
    throw new Error("Failed to refresh token. Please update BITRIX_REFRESH_TOKEN manually.");
  }
}

// Hàm gửi request tới Bitrix24
async function bitrixRequest(method, httpMethod = "POST", params = {}) {
  try {
    if (!accessToken) {
      await refreshAccessToken(); // Làm mới token nếu chưa có
    }

    const url = `${BITRIX_DOMAIN}/rest/${method}`;
    const response = await axios({
      method: httpMethod,
      url: url,
      data: params,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
    });

    return response.data;
  } catch (error) {
    if (error.response && error.response.status === 401) {
      console.warn("🔄 Token expired. Refreshing...");
      await refreshAccessToken();
      // Thử lại request với token mới
      return bitrixRequest(method, httpMethod, params);
    } else {
      console.error("❌ Bitrix API error:", error.response?.data || error.message);
      throw error;
    }
  }
}

module.exports = bitrixRequest;*/
/*const axios = require("axios");

let accessToken = "";
let refreshToken = process.env.BITRIX_REFRESH_TOKEN;

// 🌍 Lấy domain Bitrix từ biến môi trường
const BITRIX_DOMAIN = process.env.BITRIX_DOMAIN;

// 🔄 Hàm refresh Access Token
async function refreshAccessToken() {
    try {
        const response = await axios.get(`${BITRIX_DOMAIN}/oauth/token/`, {
            params: {
                grant_type: "refresh_token",
                client_id: process.env.BITRIX_CLIENT_ID,
                client_secret: process.env.BITRIX_CLIENT_SECRET,
                refresh_token: refreshToken,
            },
        });

        accessToken = response.data.access_token;
        refreshToken = response.data.refresh_token; // Cập nhật refresh token mới
        console.log("🔄 Token refreshed successfully!", accessToken);
    } catch (error) {
        console.error("❌ Error refreshing token:", error.response?.data || error.message);
        throw new Error("Failed to refresh access token");
    }
}

// 🌟 Middleware đảm bảo token hợp lệ trước khi gửi request
async function ensureValidToken() {
    if (!accessToken) {
        await refreshAccessToken();
    }
    return accessToken;
}

// 🚀 Gửi request tới Bitrix24
async function bitrixRequest(method, httpMethod = "POST", params = {}) {
    try {
        const token = await ensureValidToken(); // 🔄 Đảm bảo token hợp lệ
        const url = `${BITRIX_DOMAIN}/rest/${method}?auth=${token}`; // 🔥 Sử dụng token đúng

        console.log(`📤 Sending request to: ${url}`);

        const response = await axios({
            method: httpMethod,
            url: url,
            data: params,
            headers: { "Content-Type": "application/json" },
        });

        if (response.data.error) {
            throw new Error(`❌ Bitrix API error: ${response.data.error_description || response.data.error}`);
        }

        return response.data;
    } catch (error) {
        console.error(`❌ Bitrix API request failed: ${error.message}`);
        throw error;
    }
}

module.exports = bitrixRequest;
/*const axios = require("axios");

let accessToken = "";
let refreshToken = process.env.BITRIX_REFRESH_TOKEN;

// Hàm lấy access token mới bằng refresh token
async function refreshAccessToken() {
    try {
        const response = await axios.get(`${process.env.BITRIX_DOMAIN}/oauth/token/`, {
            params: {
                grant_type: "refresh_token",
                client_id: process.env.BITRIX_CLIENT_ID,
                client_secret: process.env.BITRIX_CLIENT_SECRET,
                refresh_token: refreshToken,
            },
        });

        accessToken = response.data.access_token;
        refreshToken = response.data.refresh_token; // Cập nhật refresh token mới
        console.log("🔄 Token refreshed successfully!");
    } catch (error) {
        console.error("❌ Error refreshing token:", error.response?.data || error.message);
    }
}

// Middleware để đảm bảo access token hợp lệ trước khi gọi API
async function ensureValidToken() {
    if (!accessToken) {
        await refreshAccessToken();
    }
    return accessToken;
}

// Gửi request tới Bitrix24

async function bitrixRequest(method, httpMethod = "POST", params = {}) {
    try {
        const url = `${process.env.BITRIX_DOMAIN}/rest/${process.env.BITRIX_AUTH_TOKEN}/${method}`;
        const response = await axios({
            method: httpMethod,
            url: url,
            data: params,
            headers: { "Content-Type": "application/json" },
        });

        if (response.data.error) {
            throw new Error(`❌ Bitrix API error: ${response.data.error_description || response.data.error}`);
        }

        return response.data;
    } catch (error) {
        console.error(`❌ Bitrix API request failed: ${error.message}`);
        throw error;
    }
}

module.exports = bitrixRequest;
*/
