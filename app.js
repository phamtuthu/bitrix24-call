const express = require("express");
const bodyParser = require("body-parser");
const bitrixRequest = require("./bitrixAuth"); // Import Bitrix API helper

const app = express();
app.use(bodyParser.json()); // Hỗ trợ JSON body
app.use(express.urlencoded({ extended: true })); // Hỗ trợ x-www-form-urlencoded

let requestQueue = [];
let isProcessing = false;

// ✅ Kiểm tra server hoạt động
app.get("/", (req, res) => {
  res.send("✅ App is running!");
});

// 📌 Xử lý webhook từ Bitrix24
app.post("/bx24-event-handler", async (req, res) => {
  // 🔥 Phản hồi ngay lập tức để tránh Bitrix24 timeout
  res.status(200).send("✅ Received. Processing in background.");

  if (!req.body || Object.keys(req.body).length === 0) {
    console.error("❌ Request body is empty.");
    return;
  }

  requestQueue.push(req.body.data);

  if (!isProcessing) {
    processNextRequest();
  }
});

// 📌 Xử lý từng request trong hàng đợi
async function processNextRequest() {
  if (requestQueue.length === 0) {
    console.log("✅ All requests processed.");
    isProcessing = false;
    return;
  }

  isProcessing = true;

  const batch = [...requestQueue];
  requestQueue = []; // Xóa hàng đợi ngay lập tức

  await Promise.all(
    batch.map(async (callData) => {
      await handleCallData(callData);
    })
  );

  isProcessing = false;
  processNextRequest(); // Tiếp tục xử lý nếu có thêm request mới
}

// 📌 Xử lý dữ liệu cuộc gọi
async function handleCallData(callData) {
  const { CALL_ID, PHONE_NUMBER, CALL_DURATION, CALL_START_DATE, CALL_FAILED_REASON } = callData;

  try {
    console.log(`📞 Processing call event for CALL_ID: ${CALL_ID} (Phone: ${PHONE_NUMBER})`);

    // 🕒 Chuyển đổi thời gian gọi sang múi giờ Việt Nam
    const callStartDate = new Date(CALL_START_DATE);
    const vnTime = new Date(callStartDate.getTime() + 7 * 60 * 60 * 1000); // UTC+7
    const formattedCallStartDate = vnTime.toISOString().replace("T", " ").substring(0, 19);

    // 🔍 1. Lấy danh sách Contacts liên quan đến số điện thoại
    const contactData = await bitrixRequest("crm.contact.list", "POST", {
      filter: { PHONE: PHONE_NUMBER }, // Bitrix webhook dùng "filter" thay "FILTER"
    });

    if (!contactData.result || contactData.result.length === 0) {
      console.log(`⚠️ No contact found for phone: ${PHONE_NUMBER}`);
      return;
    }

    const contactId = contactData.result[0].ID;
    console.log(`📇 Found Contact ID: ${contactId}`);

    // 🔍 2. Tìm Deal gần nhất liên quan đến Contact ID
    const dealData = await bitrixRequest("crm.deal.list", "POST", {
      filter: { CONTACT_ID: contactId },
      order: { DATE_CREATE: "DESC" },
      select: ["ID"],
      start: 0,
      limit: 1,
    });

    if (dealData?.result?.length) {
      const latestDeal = dealData.result[0];
      await updateDeal(latestDeal.ID, CALL_FAILED_REASON, CALL_DURATION, formattedCallStartDate);
    } else {
      console.log(`⚠️ No deal found for Contact ID: ${contactId}`);
    }

    // 🛠 3. Cập nhật Contact
    await updateContact(contactId, CALL_DURATION, CALL_FAILED_REASON, formattedCallStartDate);
  } catch (error) {
    console.error("❌ Error processing request:", error.message);
  }
}

// 📌 Cập nhật Deal trong Bitrix24
async function updateDeal(dealId, callFailedCode, callDuration, callStartDate) {
  const fieldsToUpdate = {
    UF_CRM_668BB634B111F: callFailedCode, // Trạng thái cuộc gọi
    UF_CRM_66C2B64134A71: callDuration, // Thời gian gọi
    UF_CRM_1733474117: callStartDate, // Ngày gọi
  };

  console.log(`🔄 [updateDeal] Updating Deal ID: ${dealId}`);

  try {
    const response = await bitrixRequest("crm.deal.update", "POST", {
      id: dealId, // Webhook dùng "id" thay "ID"
      fields: fieldsToUpdate,
    });

    if (response.error) {
      console.error(`❌ [updateDeal] Bitrix API error:`, response.error);
    }
  } catch (error) {
    console.error(`❌ [updateDeal] Exception:`, error.message);
  }
}

// 📌 Cập nhật Contact trong Bitrix24
async function updateContact(contactId, callDuration, callStatus, lastCallDate) {
  const fieldsToUpdate = {
    UF_CRM_66CBE81B02C06: callDuration, // Thời gian gọi
    UF_CRM_668F763F5D533: callStatus, // Trạng thái cuộc gọi
    UF_CRM_1733471904291: lastCallDate, // Ngày cuối gọi
  };

  console.log(`🔄 [updateContact] Updating Contact ID: ${contactId}`);

  try {
    const response = await bitrixRequest("crm.contact.update", "POST", {
      id: contactId, // Webhook dùng "id" thay "ID"
      fields: fieldsToUpdate,
    });

    if (response.error) {
      console.error(`❌ [updateContact] Bitrix API error:`, response.error);
    }
  } catch (error) {
    console.error(`❌ [updateContact] Exception:`, error.message);
  }
}

// 🚀 Khởi chạy server trên Railway
const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running at http://0.0.0.0:${PORT}/`);
});
/*const express = require("express");
const bodyParser = require("body-parser");
const bitrixRequest = require("./bitrixAuth"); // Import Bitrix API helper

const app = express();
app.use(bodyParser.json()); // Hỗ trợ JSON body
app.use(express.urlencoded({ extended: true })); // Hỗ trợ x-www-form-urlencoded

let requestQueue = [];
let isProcessing = false;

// ✅ Kiểm tra server hoạt động
app.get("/", (req, res) => {
  res.send("✅ App is running!");
});

// 📌 Xử lý webhook từ Bitrix24
app.post("/bx24-event-handler", async (req, res) => {
//  console.log("📥 Received webhook:", req.body);

  // 🔥 Phản hồi ngay lập tức để tránh Bitrix24 timeout
  res.status(200).send("✅ Received. Processing in background.");

  if (!req.body || Object.keys(req.body).length === 0) {
    console.error("❌ Request body is empty.");
    return;
  }

  requestQueue.push(req.body.data);

  if (!isProcessing) {
    processNextRequest();
  }
});

// 📌 Xử lý từng request trong hàng đợi
async function processNextRequest() {
  if (requestQueue.length === 0) {
    console.log("✅ All requests processed.");
    isProcessing = false;
    return;
  }

  isProcessing = true;

  // 🔥 Xử lý nhiều request cùng lúc thay vì từng cái một
  const batch = [...requestQueue];
  requestQueue = []; // Xóa hàng đợi ngay lập tức

  await Promise.all(batch.map(async (callData) => {
    await handleCallData(callData);
  }));

  isProcessing = false;
}

// 📌 Xử lý dữ liệu cuộc gọi
async function handleCallData(callData) {
  const { CALL_ID, PHONE_NUMBER, CALL_DURATION, CALL_START_DATE, CALL_FAILED_REASON } = callData;

  try {
    console.log(`📞 Processing call event for CALL_ID: ${CALL_ID} (Phone: ${PHONE_NUMBER})`);

    // 🕒 Chuyển đổi thời gian gọi sang múi giờ Việt Nam
    const callStartDate = new Date(CALL_START_DATE);
    const vnTime = new Date(callStartDate.getTime() + (7 * 60 * 60 * 1000)); // Chuyển về UTC+7
    const formattedCallStartDate = vnTime.toISOString().replace("T", " ").substring(0, 19); // YYYY-MM-DD HH:mm:ss

    // 🔍 1. Lấy danh sách Contacts liên quan đến số điện thoại
    const contactData = await bitrixRequest(`crm.contact.list`, "POST", {
      FILTER: { PHONE: PHONE_NUMBER }
    });

    if (!contactData.result.length) {
      console.log(`⚠️ No contact found for phone: ${PHONE_NUMBER}`);
      return;
    }

    const contactId = contactData.result[0].ID; // Lấy Contact ID đầu tiên
    console.log(`📇 Found Contact ID: ${contactId}`);

    // 🔍 2. Tìm Deal gần nhất liên quan đến Contact ID
    const dealData = await bitrixRequest(`crm.deal.list`, "POST", {
      FILTER: { CONTACT_ID: contactId },
      ORDER: { DATE_CREATE: "DESC" }, // Lấy Deal mới nhất
      LIMIT: 1
    });

    if (dealData?.result?.length) {
      const latestDeal = dealData.result[0];
      await updateDeal(latestDeal.ID, CALL_FAILED_REASON, CALL_DURATION, formattedCallStartDate);
    } else {
      console.log(`⚠️ No deal found for Contact ID: ${contactId}`);
    }

    // 🛠 3. Cập nhật Contact
    await updateContact(contactId, CALL_DURATION, CALL_FAILED_REASON, formattedCallStartDate);

  } catch (error) {
    console.error("❌ Error processing request:", error.message);
  }
}

// 📌 Cập nhật Deal trong Bitrix24
async function updateDeal(dealId, callFailedCode, callDuration, callStartDate) {
  const fieldsToUpdate = {
    "UF_CRM_668BB634B111F": callFailedCode,  // Trạng thái cuộc gọi
    "UF_CRM_66C2B64134A71": callDuration,   // Thời gian gọi
    "UF_CRM_1733474117": callStartDate,     // Ngày gọi
  };

  console.log(`🔄 [updateDeal] Updating Deal ID: ${dealId}`);
//  console.log(`📤 [updateDeal] Payload:`, JSON.stringify(fieldsToUpdate, null, 2));

  try {
    const response = await bitrixRequest(`crm.deal.update`, "POST", {
      ID: dealId,
      fields: fieldsToUpdate
    });

//    console.log(`✅ [updateDeal] Bitrix Response:`, JSON.stringify(response, null, 2));

    if (response.error) {
      console.error(`❌ [updateDeal] Bitrix API error:`, response.error);
    }
  } catch (error) {
    console.error(`❌ [updateDeal] Exception:`, error.message);
  }
}

// 📌 Cập nhật Contact trong Bitrix24
async function updateContact(contactId, callDuration, callStatus, lastCallDate) {
  const fieldsToUpdate = {
    "UF_CRM_66CBE81B02C06": callDuration,      // Thời gian gọi
    "UF_CRM_668F763F5D533": callStatus,        // Trạng thái cuộc gọi
    "UF_CRM_1733471904291": lastCallDate,      // Ngày cuối gọi
  };

  console.log(`🔄 [updateContact] Updating Contact ID: ${contactId}`);
//  console.log(`📤 [updateContact] Payload:`, JSON.stringify(fieldsToUpdate, null, 2));

  try {
    const response = await bitrixRequest(`crm.contact.update`, "POST", {
      ID: contactId,
      fields: fieldsToUpdate
    });

//    console.log(`✅ [updateContact] Bitrix Response:`, JSON.stringify(response, null, 2));

    if (response.error) {
      console.error(`❌ [updateContact] Bitrix API error:`, response.error);
    }
  } catch (error) {
    console.error(`❌ [updateContact] Exception:`, error.message);
  }
}

// 🚀 Khởi chạy server trên Railway
const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running at http://0.0.0.0:${PORT}/`);
});
/*const express = require("express");
const bodyParser = require("body-parser");
const bitrixRequest = require("./bitrixAuth"); // Import Bitrix API helper

const app = express();
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: true }));

let requestQueue = [];
let isProcessing = false;

// ✅ Kiểm tra server hoạt động
app.get("/", (req, res) => {
  res.send("✅ App is running!");
});

// 📌 Xử lý webhook từ Bitrix24
app.post("/bx24-event-handler", async (req, res) => {
  console.log("📥 Headers:", req.headers);
  console.log("📥 Raw request body:", JSON.stringify(req.body, null, 2));

  if (!req.body || Object.keys(req.body).length === 0) {
    console.error("❌ Error: Request body is empty.");
    return res.status(400).json({ error: "Invalid request: Request body is empty." });
  }

  const callData = req.body.data;
  console.log("📞 Extracted callData:", callData);

  if (!callData || !callData.CALL_ID || !callData.PHONE_NUMBER) {
    console.error("❌ Error: CALL_ID or PHONE_NUMBER is missing.");
    return res.status(400).json({ error: "Invalid request: Missing CALL_ID or PHONE_NUMBER." });
  }

  console.log(`📞 Received call event for CALL_ID: ${callData.CALL_ID}`);
  requestQueue.push({ callData, res });

  if (!isProcessing) {
    processNextRequest();
  }
});

// 📌 Xử lý từng request trong hàng đợi
async function processNextRequest() {
  if (requestQueue.length === 0) {
    console.log("✅ All requests processed.");
    isProcessing = false;
    return;
  }

  isProcessing = true;
  const { callData, res } = requestQueue.shift();
  const { CALL_ID, PHONE_NUMBER, CALL_DURATION, CALL_START_DATE, CALL_FAILED_REASON } = callData;

  try {
    console.log(`📞 Processing call event for CALL_ID: ${CALL_ID} (Phone: ${PHONE_NUMBER})`);

    // 🔄 Chuyển đổi thời gian về giờ Việt Nam (UTC+7)
    const callStartDate = new Date(CALL_START_DATE);
    const vnTime = new Date(callStartDate.getTime() + (7 * 60 * 60 * 1000)); 
    const formattedCallStartDate = vnTime.toISOString().replace("T", " ").substring(0, 19);

    console.log(`⏳ Converted Call Start Date: ${formattedCallStartDate} (VN Time)`);

    // 🔍 1. Lấy danh sách Contacts theo số điện thoại
    const contactData = await bitrixRequest(`crm.contact.list`, "POST", {
      FILTER: { PHONE: PHONE_NUMBER }
    });

    if (!contactData.result.length) {
      console.log(`⚠️ No contact found for phone: ${PHONE_NUMBER}`);
      res.send("⚠️ No contact found.");
      return;
    }

    const contactId = contactData.result[0].ID;
    console.log(`📇 Found Contact ID: ${contactId}`);

    // 🔍 2. Tìm Deals liên quan đến Contact ID
    const dealData = await bitrixRequest(`crm.deal.list`, "POST", {
      FILTER: { CONTACT_ID: contactId }
    });

    console.log(`📊 Found ${dealData?.result?.length || 0} Deals`);

    // 🛠 3. Cập nhật tất cả Deals tìm thấy
    if (dealData?.result?.length) {
      for (const deal of dealData.result) {
        await updateDeal(deal.ID, CALL_FAILED_REASON, CALL_DURATION, formattedCallStartDate);
      }
    }

    // 🛠 4. Cập nhật Contact
    await updateContact(contactId, CALL_DURATION, CALL_FAILED_REASON, formattedCallStartDate);

    res.send("✅ Call data processed successfully.");
  } catch (error) {
    console.error("❌ Error processing request:", error.message);
    res.status(500).send(error.message);
  }

  processNextRequest();
}

// 📌 Cập nhật Deal trong Bitrix24
async function updateDeal(dealId, callFailedCode, callDuration, callStartDate) {
  const fieldsToUpdate = {
    "UF_CRM_668BB634B111F": callFailedCode,  // Trạng thái cuộc gọi
    "UF_CRM_66C2B64134A71": callDuration,   // Thời gian gọi
    "UF_CRM_1733474117": callStartDate,     // Ngày gọi
  };

  console.log(`🔄 [updateDeal] Updating Deal ID: ${dealId}`);
//  console.log(`📤 [updateDeal] Payload:`, JSON.stringify(fieldsToUpdate, null, 2));

  try {
    const response = await bitrixRequest(`crm.deal.update`, "POST", {
      ID: dealId,
      fields: fieldsToUpdate
    });

   // console.log(`✅ [updateDeal] Bitrix Response:`, JSON.stringify(response, null, 2));

    if (response.error) {
      console.error(`❌ [updateDeal] Bitrix API error:`, response.error);
    }
  } catch (error) {
    console.error(`❌ [updateDeal] Exception:`, error.message);
  }
}

// 📌 Cập nhật Contact trong Bitrix24
async function updateContact(contactId, callDuration, callStatus, lastCallDate) {
  const fieldsToUpdate = {
    "UF_CRM_66CBE81B02C06": callDuration,      // Thời gian gọi
    "UF_CRM_668F763F5D533": callStatus,        // Trạng thái cuộc gọi
    "UF_CRM_1733471904291": lastCallDate,      // Ngày cuối gọi
  };

  console.log(`🔄 [updateContact] Updating Contact ID: ${contactId}`);
 // console.log(`📤 [updateContact] Payload:`, JSON.stringify(fieldsToUpdate, null, 2));

  try {
    const response = await bitrixRequest(`crm.contact.update`, "POST", {
      ID: contactId,
      fields: fieldsToUpdate
    });

   // console.log(`✅ [updateContact] Bitrix Response:`, JSON.stringify(response, null, 2));

    if (response.error) {
      console.error(`❌ [updateContact] Bitrix API error:`, response.error);
    }
  } catch (error) {
    console.error(`❌ [updateContact] Exception:`, error.message);
  }
}

// 🚀 Khởi chạy server trên Railway
const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running at http://0.0.0.0:${PORT}/`);
});
/*const express = require("express");
const bodyParser = require("body-parser");
const bitrixRequest = require("./bitrixAuth"); // Import Bitrix API helper

const app = express();
app.use(bodyParser.json()); // Hỗ trợ JSON body
app.use(express.urlencoded({ extended: true })); // Hỗ trợ x-www-form-urlencoded

let requestQueue = [];
let isProcessing = false;

// ✅ Kiểm tra server hoạt động
app.get("/", (req, res) => {
  res.send("✅ App is running!");
});

// 📌 Xử lý webhook từ Bitrix24
app.post("/bx24-event-handler", async (req, res) => {
  console.log("📥 Headers:", req.headers);
  console.log("📥 Raw request body:", JSON.stringify(req.body, null, 2));

  if (!req.body || Object.keys(req.body).length === 0) {
    console.error("❌ Error: Request body is empty.");
    return res.status(400).json({ error: "Invalid request: Request body is empty." });
  }

  const callData = req.body.data;
  console.log("📞 Extracted callData:", callData);

  if (!callData || !callData.CALL_ID || !callData.PHONE_NUMBER) {
    console.error("❌ Error: CALL_ID or PHONE_NUMBER is missing.");
    return res.status(400).json({ error: "Invalid request: Missing CALL_ID or PHONE_NUMBER." });
  }

  console.log(`📞 Received call event for CALL_ID: ${callData.CALL_ID}`);
  requestQueue.push({ callData, res });

  if (!isProcessing) {
    processNextRequest();
  }
});
// 📌 Xử lý từng request trong hàng đợi
async function processNextRequest() {
  if (requestQueue.length === 0) {
    console.log("✅ All requests processed.");
    isProcessing = false;
    return;
  }

  isProcessing = true;
  const { callData, res } = requestQueue.shift();
  const { CALL_ID, PHONE_NUMBER, CALL_DURATION, CALL_START_DATE, CALL_FAILED_REASON } = callData;

  try {
    console.log(`📞 Processing call event for CALL_ID: ${CALL_ID} (Phone: ${PHONE_NUMBER})`);

    // 🕒 Chuyển đổi thời gian cuộc gọi
    const callStartDate = new Date(CALL_START_DATE);
const vnTime = new Date(callStartDate.getTime() + (7 * 60 * 60 * 1000)); // Chuyển về giờ Việt Nam (UTC+7)
const formattedCallStartDate = vnTime.toISOString().replace("T", " ").substring(0, 19); // Định dạng YYYY-MM-DD HH:mm:ss

    // 🔍 1. Lấy danh sách Contacts liên quan đến số điện thoại
    const contactData = await bitrixRequest(`/crm.contact.list`, "POST", {
      FILTER: { PHONE: PHONE_NUMBER }
    });

    if (!contactData.result.length) {
      console.log(`⚠️ No contact found for phone: ${PHONE_NUMBER}`);
      res.send("⚠️ No contact found.");
      return;
    }

    const contactId = contactData.result[0].ID; // Lấy Contact ID đầu tiên
    console.log(`📇 Found Contact ID: ${contactId}`);

    // 🔍 2. Tìm Deals liên quan đến Contact ID
    const dealData = await bitrixRequest(`/crm.deal.list`, "POST", {
      FILTER: { CONTACT_ID: contactId }
    });

    console.log(`📊 Found ${dealData?.result?.length || 0} Deals`);

    // 🛠 3. Cập nhật tất cả Deals tìm thấy
    if (dealData?.result?.length) {
      for (const deal of dealData.result) {
        await updateDeal(deal.ID, CALL_FAILED_REASON, CALL_DURATION, callStartDate);
      }
    }

    // 🛠 4. Cập nhật Contact
    await updateContact(contactId, CALL_DURATION, CALL_FAILED_REASON, callStartDate);

    res.send("✅ Call data processed successfully.");
  } catch (error) {
    console.error("❌ Error processing request:", error.message);
    res.status(500).send(error.message);
  }

  processNextRequest();
}

// 🔄 Chuyển đổi múi giờ & cộng thêm 1 giờ
function convertTimezone(dateString, targetOffset) {
  const date = new Date(dateString);
  const utc = date.getTime() + date.getTimezoneOffset() * 60000;
  const newDate = new Date(utc + targetOffset * 3600000);
  newDate.setHours(newDate.getHours() + 1); // Cộng thêm 1 giờ
  return newDate.toISOString();
}

// 📌 Cập nhật Deal trong Bitrix24
async function updateDeal(dealId, callFailedCode, callDuration, callStartDate) {
  const fieldsToUpdate = {
    "UF_CRM_668BB634B111F": callFailedCode,  // Trạng thái cuộc gọi
    "UF_CRM_66C2B64134A71": callDuration,   // Thời gian gọi
    "UF_CRM_1733474117": callStartDate,     // Ngày gọi
  };

  console.log(`🔄 [updateDeal] Updating Deal ID: ${dealId}`);
  console.log(`📤 [updateDeal] Payload:`, JSON.stringify(fieldsToUpdate, null, 2));

  try {
    const response = await bitrixRequest(`/crm.deal.update`, "POST", {
      ID: dealId,
      fields: fieldsToUpdate
    });

    console.log(`✅ [updateDeal] Bitrix Response:`, JSON.stringify(response, null, 2));

    if (response.error) {
      console.error(`❌ [updateDeal] Bitrix API error:`, response.error);
    }
  } catch (error) {
    console.error(`❌ [updateDeal] Exception:`, error.message);
  }
}

// 📌 Cập nhật Contact trong Bitrix24
async function updateContact(contactId, callDuration, callStatus, lastCallDate) {
  const fieldsToUpdate = {
    "UF_CRM_66CBE81B02C06": callDuration,      // Thời gian gọi
    "UF_CRM_668F763F5D533": callStatus,        // Trạng thái cuộc gọi
    "UF_CRM_1733471904291": lastCallDate,      // Ngày cuối gọi
  };

  console.log(`🔄 [updateContact] Updating Contact ID: ${contactId}`);
  console.log(`📤 [updateContact] Payload:`, JSON.stringify(fieldsToUpdate, null, 2));

  try {
    const response = await bitrixRequest(`/crm.contact.update`, "POST", {
      ID: contactId,
      fields: fieldsToUpdate
    });

    console.log(`✅ [updateContact] Bitrix Response:`, JSON.stringify(response, null, 2));

    if (response.error) {
      console.error(`❌ [updateContact] Bitrix API error:`, response.error);
    }
  } catch (error) {
    console.error(`❌ [updateContact] Exception:`, error.message);
  }
}

// 🚀 Khởi chạy server trên Railway
const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running at http://0.0.0.0:${PORT}/`);
});
/*const express = require("express");
const bodyParser = require("body-parser");
const bitrixRequest = require("./bitrixAuth"); // Import Bitrix API helper

const app = express();
app.use(bodyParser.json()); // Hỗ trợ JSON body
app.use(express.urlencoded({ extended: true })); // Hỗ trợ x-www-form-urlencoded

let requestQueue = [];
let isProcessing = false;

// ✅ Kiểm tra server hoạt động
app.get("/", (req, res) => {
  res.send("✅ App is running!");
});

// 📌 Xử lý webhook từ Bitrix24
app.post("/bx24-event-handler", async (req, res) => {
  console.log("📥 Headers:", req.headers);
  console.log("📥 Raw request body:", JSON.stringify(req.body, null, 2));

  if (!req.body || Object.keys(req.body).length === 0) {
    console.error("❌ Error: Request body is empty.");
    return res.status(400).json({ error: "Invalid request: Request body is empty." });
  }

  const callData = req.body.data;
  console.log("📞 Extracted callData:", callData);

  if (!callData || !callData.CALL_ID) {
    console.error("❌ Error: CALL_ID is missing.");
    return res.status(400).json({ error: "Invalid request: Missing CALL_ID." });
  }

  console.log(`📞 Received call event for CALL_ID: ${callData.CALL_ID}`);
  requestQueue.push({ callData, res });

  if (!isProcessing) {
    processNextRequest();
  }
});

// ⏳ Xử lý từng request trong hàng đợi
async function processNextRequest() {
  if (requestQueue.length === 0) {
    console.log("✅ All requests processed.");
    isProcessing = false;
    return;
  }

  isProcessing = true;
  const { callData, res } = requestQueue.shift();
  const callId = callData.CALL_ID;

  try {
    // 🟢 Lấy thông tin cuộc gọi từ Bitrix24
    const callStats = await bitrixRequest(`/voximplant.statistic.get`, "POST", {
      FILTER: { CALL_ID: callId }
    });

    console.log("📊 Bitrix Call Stats:", JSON.stringify(callStats, null, 2));

    if (!callStats?.result?.length) {
      throw new Error("No call data found.");
    }

    const callInfo = callStats.result[0];

    // 🕒 Chuyển đổi thời gian cuộc gọi
    const callStartDate = convertTimezone(callInfo.CALL_START_DATE, 7);

    const { CRM_ENTITY_ID, CRM_ENTITY_TYPE, CALL_FAILED_REASON, CALL_DURATION } = callInfo;

    if (!CRM_ENTITY_ID) {
      console.error("❌ [processNextRequest] CRM_ENTITY_ID is missing. Cannot update.");
      return res.status(400).json({ error: "CRM_ENTITY_ID is missing" });
    }

    // 🛠 Cập nhật vào Deal hoặc Contact
    if (CRM_ENTITY_TYPE === "DEAL") {
      await updateDeal(CRM_ENTITY_ID, CALL_FAILED_REASON, CALL_DURATION, callStartDate);
    } else if (CRM_ENTITY_TYPE === "CONTACT") {
      // 🔎 Tìm Deal liên quan
      const dealData = await bitrixRequest(`/crm.deal.list`, "POST", {
        FILTER: { CONTACT_ID: CRM_ENTITY_ID }
      });

      if (dealData?.result?.length) {
        await updateDeal(dealData.result[0].ID, CALL_FAILED_REASON, CALL_DURATION, callStartDate);
      } else {
        await updateContact(CRM_ENTITY_ID, CALL_DURATION, CALL_FAILED_REASON, callStartDate);
      }
    }

    res.send("✅ Call data processed successfully.");
  } catch (error) {
    console.error("❌ Error processing request:", error.message);
    res.status(500).send(error.message);
  }

  processNextRequest();
}

// 🔄 Chuyển đổi múi giờ & cộng thêm 1 giờ
function convertTimezone(dateString, targetOffset) {
  const date = new Date(dateString);
  const utc = date.getTime() + date.getTimezoneOffset() * 60000;
  const newDate = new Date(utc + targetOffset * 3600000);
  newDate.setHours(newDate.getHours() + 1); // Cộng thêm 1 giờ
  return newDate.toISOString();
}

// 📌 Cập nhật Deal trong Bitrix24
async function updateDeal(dealId, callFailedCode, callDuration, callStartDate) {
  const fieldsToUpdate = {
    "UF_CRM_668BB634B111F": callFailedCode,  // Trạng thái cuộc gọi
    "UF_CRM_66C2B64134A71": callDuration,   // Thời gian gọi
    "UF_CRM_1733474117": callStartDate,     // Ngày gọi
  };

  console.log(`🔄 [updateDeal] Updating Deal ID: ${dealId}`);
  console.log(`📤 [updateDeal] Payload:`, JSON.stringify(fieldsToUpdate, null, 2));

  try {
    const response = await bitrixRequest(`/crm.deal.update`, "POST", {
      ID: dealId,
      fields: fieldsToUpdate
    });

    console.log(`✅ [updateDeal] Bitrix Response:`, JSON.stringify(response, null, 2));

    if (response.error) {
      console.error(`❌ [updateDeal] Bitrix API error:`, response.error);
    }
  } catch (error) {
    console.error(`❌ [updateDeal] Exception:`, error.message);
  }
}

// 📌 Cập nhật Contact trong Bitrix24
async function updateContact(contactId, callDuration, callStatus, lastCallDate) {
  const fieldsToUpdate = {
    "UF_CRM_66CBE81B02C06": callDuration,      // Thời gian gọi
    "UF_CRM_668F763F5D533": callStatus,        // Trạng thái cuộc gọi
    "UF_CRM_1733471904291": lastCallDate,      // Ngày cuối gọi
  };

  console.log(`🔄 [updateContact] Updating Contact ID: ${contactId}`);
  console.log(`📤 [updateContact] Payload:`, JSON.stringify(fieldsToUpdate, null, 2));

  try {
    const response = await bitrixRequest(`/crm.contact.update`, "POST", {
      ID: contactId,
      fields: fieldsToUpdate
    });

    console.log(`✅ [updateContact] Bitrix Response:`, JSON.stringify(response, null, 2));

    if (response.error) {
      console.error(`❌ [updateContact] Bitrix API error:`, response.error);
    }
  } catch (error) {
    console.error(`❌ [updateContact] Exception:`, error.message);
  }
}

// 🚀 Khởi chạy server trên Railway
const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running at http://0.0.0.0:${PORT}/`);
});
/*const express = require("express");
const bodyParser = require("body-parser");
const bitrixRequest = require("./bitrixAuth"); // Import hàm gọi API Bitrix

const app = express();
app.use(bodyParser.json()); // Đảm bảo request body là JSON

let requestQueue = [];
let isProcessing = false;

// ✅ Check server status
app.get("/", (req, res) => {
  res.send("✅ App is running!");
});

// 📌 Xử lý webhook từ Bitrix24
// Hỗ trợ JSON
app.use(express.json());

// 🔥 Thêm middleware để hỗ trợ x-www-form-urlencoded
app.use(express.urlencoded({ extended: true }));

app.post("/bx24-event-handler", async (req, res) => {
  console.log("📥 Headers:", req.headers);
  console.log("📥 Raw request body:", req.body);

  if (!req.body || Object.keys(req.body).length === 0) {
    console.error("❌ Error: Request body is empty.");
    return res.status(400).json({ error: "Invalid request: Request body is empty." });
  }

  const callData = req.body.data;
  console.log("📞 Extracted callData:", callData);

  if (!callData || !callData.CALL_ID) {
    console.error("❌ Error: CALL_ID is missing.");
    return res.status(400).json({ error: "Invalid request: Missing CALL_ID." });
  }

  console.log(`📞 Received call event for CALL_ID: ${callData.CALL_ID}`);
  res.send("✅ Data received successfully.");
});

// ⏳ Xử lý từng request trong hàng đợi
async function processNextRequest() {
  if (requestQueue.length === 0) {
    console.log("✅ All requests processed.");
    isProcessing = false;
    return;
  }

  isProcessing = true;
  const { callData, res } = requestQueue.shift();
  const callId = callData.CALL_ID;

  try {
    // 🟢 Lấy thông tin cuộc gọi từ Bitrix24
    const callStats = await bitrixRequest(`/voximplant.statistic.get`, "POST", {
      FILTER: { CALL_ID: callId }
    });

    if (!callStats?.result?.length) {
      throw new Error("No call data found.");
    }

    const callInfo = callStats.result[0];
    console.log("📊 Call Info:", callInfo);

    // 🕒 Chuyển đổi thời gian cuộc gọi
    const callStartDate = convertTimezone(callInfo.CALL_START_DATE, 7);

    const { CRM_ENTITY_ID, CRM_ENTITY_TYPE, CALL_FAILED_REASON, CALL_DURATION } = callInfo;

    if (!CRM_ENTITY_ID) {
      throw new Error("Missing CRM_ENTITY_ID.");
    }

    // 🛠 Cập nhật vào Deal hoặc Contact
    if (CRM_ENTITY_TYPE === "DEAL") {
      await updateDeal(CRM_ENTITY_ID, CALL_FAILED_REASON, CALL_DURATION, callStartDate);
    } else if (CRM_ENTITY_TYPE === "CONTACT") {
      const dealData = await bitrixRequest(`/crm.deal.list`, "POST", {
        FILTER: { CONTACT_ID: CRM_ENTITY_ID }
      });

      if (dealData?.result?.length) {
        await updateDeal(dealData.result[0].ID, CALL_FAILED_REASON, CALL_DURATION, callStartDate);
      } else {
        await updateContact(CRM_ENTITY_ID, CALL_DURATION, CALL_FAILED_REASON, callStartDate);
      }
    }

    res.send("✅ Call data processed successfully.");
  } catch (error) {
    console.error("❌ Error processing request:", error.message);
    res.status(500).send(error.message);
  }

  processNextRequest();
}

// 🔄 Chuyển đổi múi giờ & tự động cộng thêm 1 giờ
function convertTimezone(dateString, targetOffset) {
  const date = new Date(dateString);
  const utc = date.getTime() + date.getTimezoneOffset() * 60000;
  const newDate = new Date(utc + targetOffset * 3600000);
  newDate.setHours(newDate.getHours() + 1); // Cộng thêm 1 giờ
  return newDate.toISOString();
}

// 📌 Cập nhật Deal trong Bitrix24
// 📌 Cập nhật Deal trong Bitrix24
async function updateDeal(dealId, callFailedCode, callDuration, callStartDate) {
  const fieldsToUpdate = {
    "UF_CRM_668BB634B111F": callFailedCode,  // Trạng thái cuộc gọi
    "UF_CRM_66C2B64134A71": callDuration,   // Thời gian gọi
    "UF_CRM_1733474117": callStartDate,     // Ngày gọi
  };

  console.log(`📌 [updateDeal] Updating Deal ID: ${dealId}`);
  console.log(`📤 [updateDeal] Sending data:`, fieldsToUpdate);

  try {
    const response = await bitrixRequest(`/crm.deal.update`, "POST", {
      ID: dealId,
      fields: fieldsToUpdate
    });

    console.log(`✅ [updateDeal] Response from Bitrix:`, response);
  } catch (error) {
    console.error(`❌ [updateDeal] Error updating deal ${dealId}:`, error.message);
  }
}

// 📌 Cập nhật Contact trong Bitrix24
async function updateContact(contactId, callDuration, callStatus, lastCallDate) {
  const fieldsToUpdate = {
    "UF_CRM_66CBE81B02C06": callDuration,      // Thời gian gọi
    "UF_CRM_668F763F5D533": callStatus,        // Trạng thái cuộc gọi
    "UF_CRM_1733471904291": lastCallDate,      // Ngày cuối gọi
  };

  console.log(`📌 [updateContact] Updating Contact ID: ${contactId}`);
  console.log(`📤 [updateContact] Sending data:`, fieldsToUpdate);

  try {
    const response = await bitrixRequest(`/crm.contact.update`, "POST", {
      ID: contactId,
      fields: fieldsToUpdate
    });

    console.log(`✅ [updateContact] Response from Bitrix:`, response);
  } catch (error) {
    console.error(`❌ [updateContact] Error updating contact ${contactId}:`, error.message);
  }
}

// 🚀 Khởi chạy server trên Railway
const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running at http://0.0.0.0:${PORT}/`);
});
*/
