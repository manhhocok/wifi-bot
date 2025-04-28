import axios from "axios";

// Lấy token và URL từ biến môi trường
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const GOOGLE_SHEET_API_URL = process.env.GOOGLE_SHEET_API_URL;

// Function gửi tin nhắn đến Telegram
async function sendMessage(chatId, text) {
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  await axios.post(url, {
    chat_id: chatId,
    text: text,
  });
}

// Hàm tìm kiếm trong Google Sheets
async function searchGoogleSheet(query) {
  const res = await axios.get(GOOGLE_SHEET_API_URL, {
    params: {
      q: query,
    },
  });
  return res.data;
}

// API handler
export default async function handler(req, res) {
  if (req.method === "POST") {
    const { body } = req;
    
    // Lấy tin nhắn và chatId từ webhook
    const { message } = body;
    const chatId = message.chat.id;
    const text = message.text;

    if (text) {
      try {
        // Gửi yêu cầu tìm kiếm tới Google Sheets API
        const results = await searchGoogleSheet(text);

        if (results.length > 0) {
          // Trả về kết quả tìm kiếm
          const responseText = results.map(row => 
            `Giá WiFi tại ${row.country} là:\n` +
            `- 500MB/ngày: ${row.mb}\n` +
            `- 1Gb/ngày: ${row.gb1}\n` +
            `- 3Gb/ngày: ${row.gb3}\n` +
            `- 5Gb/ngày: ${row.gb5}\n` +
            `Chiết khấu tối đa: ${row.discount}`
          ).join("\n\n");
          
          await sendMessage(chatId, responseText);
        } else {
          await sendMessage(chatId, "Không tìm thấy kết quả.");
        }
      } catch (error) {
        console.error("Error fetching from Google Sheets:", error);
        await sendMessage(chatId, "Đã có lỗi xảy ra. Vui lòng thử lại.");
      }
    }

    res.status(200).end(); // Phản hồi thành công
  } else {
    res.status(405).end(); // Method Not Allowed
  }
}
