const mineflayer = require('mineflayer');
const express = require('express');
const axios = require('axios');

const app = express();
app.use(express.json());

// ==========================================
// CẤU HÌNH CỦA BẠN (SỬA CÁC DÒNG NÀY)
// ==========================================
const SERVER_HOST = 'kingmc.vn'; 
const SERVER_PORT = 25565;
const BOT_USERNAME = 'BotRutNap'; // Tên acc Minecraft của bot (acc phụ)
const BOT_VERSION = '1.20.1'; 
const PASSWORD = 'matkhau_cua_acc'; 

// Link API của Bot Discord (Chạy trên Cloudcode)
// Nhớ thay IP_HOST_CLOUDCODE_CUA_BAN bằng IP thật của host Cloudcode
const DISCORD_API_URL = "http://IP_HOST_CLOUDCODE_CUA_BAN:24950/api/game_payment";

let globalBot = null; 
let isInMainServer = false;
let joinAttempt = 0; 
let hasLoggedIn = false; 

function startBot() {
  joinAttempt++;
  hasLoggedIn = false; 
  console.log(`\n🔄 [LẦN ${joinAttempt}] Đang kết nối vào server...`);
  
  const bot = mineflayer.createBot({
    host: SERVER_HOST,
    port: SERVER_PORT,
    username: BOT_USERNAME,
    version: BOT_VERSION,
    hideErrors: true,
    checkTimeoutInterval: 120000
  });
  
  globalBot = bot; 

  bot.on('error', (err) => {
    if (err.code !== 'ECONNRESET') console.log(`[LỖI] ${err.message}`);
  });

  bot.on('spawn', () => {
    console.log(`✅ [LẦN ${joinAttempt}] Đã vào sảnh chờ!`);
    
    if (joinAttempt === 1) {
      console.log(`⏳ [CHỐNG BOT] Đang ở bảng xác nhận. Tự động out sau 3 giây...`);
      setTimeout(() => {
        console.log(`🚪 Tự động ngắt kết nối (Quit).`);
        bot.quit(); 
      }, 3000); 
    } else {
      if (hasLoggedIn) return;
      hasLoggedIn = true;

      setTimeout(() => {
        console.log(`[AUTH] Gửi lệnh đăng nhập: /dn ${PASSWORD}`);
        bot.chat(`/dn ${PASSWORD}`);
      }, 2000);

      setTimeout(() => {
        if (!isInMainServer) {
          console.log(`[GUI] Đang chọn ô đồng hồ (ô thứ 5) để mở Menu...`);
          bot.setQuickBarSlot(4); 
          bot.activateItem(); 
        }
      }, 6000);
    }
  });

  bot.on('windowOpen', (window) => {
    let titleStr = "";
    try {
      if (typeof window.title === 'string') titleStr = window.title;
      else titleStr = JSON.stringify(window.title);
    } catch (e) { titleStr = "Unknown"; }
    
    console.log(`[GUI] Đã mở bảng: ${titleStr}`);
    
    if (!isInMainServer) {
      setTimeout(() => {
        const slotToClick = 24; 
        try {
          bot.clickWindow(slotToClick, 0, 0);
          console.log(`[GUI] Đã click ô 25 để vào KingSMP!`);
          isInMainServer = true; 
        } catch (e) {
          console.log(`[LỖI] Không click được: ${e}`);
        }
      }, 1000);
    }
  });

  // LẮNG NGHE TIN NHẮN ĐỂ BẮT KHI CÓ TIỀN VÀO (NẠP)
  bot.on('message', async (jsonMsg) => {
    const msg = jsonMsg.toString();
    
    // Kiểm tra tin nhắn chat nhận tiền
    if (msg.includes("Bạn nhận được") && msg.includes("từ")) {
        console.log(`[TIỀN VÀO] ${msg}`);
        // Gửi thông tin về cho Bot Discord
        try {
            await axios.post(DISCORD_API_URL, { 
                message: msg 
            });
        } catch (error) {
            console.log(`❌ Lỗi gửi API về Discord: ${error.message}`);
        }
    }
  });

  bot.on('end', (reason) => {
    console.log(`❌ Bot ngắt kết nối. Lý do: ${reason}`);
    if (joinAttempt === 1 || !isInMainServer) {
      console.log(`🔄 Tự động kết nối lại...`);
      setTimeout(startBot, 3000); 
    }
  });
  
  // Chống AFK (Tự động nhảy mỗi 30 giây)
  setInterval(() => {
    if (isInMainServer && bot.entity) {
      bot.setControlState('jump', true);
      setTimeout(() => bot.setControlState('jump', false), 500);
    }
  }, 30000);
}

startBot();

// ==========================================
// API ĐỂ BOT DISCORD GỌI SANG TRẢ TIỀN (RÚT)
// ==========================================
app.post('/pay', (req, res) => {
  const { ign, amount } = req.body;
  
  if (!isInMainServer || !globalBot) {
    return res.status(400).send({ status: 'error', message: 'Bot chưa vào server chính' });
  }
  
  // Gõ lệnh trả tiền trong game
  globalBot.chat(`/pay ${ign} ${amount}`);
  console.log(`[PAY] Đã gõ lệnh: /pay ${ign} ${amount}`);
  
  res.send({ status: 'success' });
});

app.listen(3000, () => {
  console.log('🌐 API Bot Nạp/Rút đang chạy ở cổng 3000');
});