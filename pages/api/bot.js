import axios from "axios";

// Lấy token và URL từ biến môi trường
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const GOOGLE_SHEET_API_URL = process.env.GOOGLE_SHEET_API_URL;

// Function gửi tin nhắn đến Telegram
async function sendMessage(chatId, text) {
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  try {
    await axios.post(url, {
      chat_id: chatId,
      text: text,
    });
  } catch (error) {
    console.error("Error sending message to Telegram:", error);
  }
}

// Hàm tìm kiếm trong Google Sheets
async function searchGoogleSheet(query) {
  try {
    const res = await axios.get(GOOGLE_SHEET_API_URL, {
      params: {
        q: query,
      },
    });
    console.log("Google Sheets API response:", res.data);

    // Kiểm tra nếu dữ liệu không phải là mảng
    if (!Array.isArray(res.data)) {
      throw new Error("Dữ liệu trả về từ Google Sheets không phải là mảng.");
    }

    return res.data;
  } catch (error) {
    console.error("Error fetching data from Google Sheets:", error);
    throw new Error("Lỗi khi gọi API Google Sheets");
  }
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
        console.log("Received message:", text);

        // Chuyển đổi tìm kiếm thành không phân biệt hoa thường
        const searchQuery = text.toLowerCase();

        // Gửi yêu cầu tìm kiếm tới Google Sheets API
        const results = await searchGoogleSheet(searchQuery);
        console.log("Search results:", results);

        // Kiểm tra xem results có phải là mảng hay không trước khi sử dụng .map()
        if (Array.isArray(results) && results.length > 0) {
          const responseText = results.map(row => {
            const discountPercentage = (row.discount * 100).toFixed(0);  // Chuyển đổi chiết khấu sang phần trăm
            return `Giá WiFi tại ${row.country} là:\n` +
                   `- 500MB/ngày: ${row.mb}\n` +
                   `- 1Gb/ngày: ${row.gb1}\n` +
                   `- 3Gb/ngày: ${row.gb3}\n` +
                   `- 5Gb/ngày: ${row.gb5}\n` +
                   `Chiết khấu tối đa: ${discountPercentage}` + '%';  // Định dạng chiết khấu dưới dạng %
          }).join("\n\n");
          
          await sendMessage(chatId, responseText);
        } else {
          await sendMessage(chatId, "Không tìm thấy kết quả.");
        }
      } catch (error) {
        console.error("Error handling the request:", error);
        // await sendMessage(chatId, "Đã có lỗi xảy ra. Vui lòng thử lại.");
      }
    }

    res.status(200).end(); // Phản hồi thành công
  } else {
    res.status(405).end(); // Method Not Allowed
  }
}
