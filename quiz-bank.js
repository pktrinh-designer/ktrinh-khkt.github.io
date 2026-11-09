const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

// Đường dẫn đến ngân hàng câu hỏi hiện tại.
const questionBankPath = path.join(
  __dirname,
  "js",
  "comprehensive-questions.js",
);

// Kiểm tra file dữ liệu có tồn tại không.
if (!fs.existsSync(questionBankPath)) {
  throw new Error("Không tìm thấy js/comprehensive-questions.js");
}

// Tạo môi trường riêng để đọc dữ liệu,
// không chạy trực tiếp trong môi trường trình duyệt.
const sandbox = {
  window: {},
};

// Đọc nội dung ngân hàng câu hỏi.
const questionBankCode = fs.readFileSync(questionBankPath, "utf8");

// Thực thi mã trong môi trường giới hạn.
vm.runInNewContext(questionBankCode, sandbox, {
  timeout: 3000,
  filename: "comprehensive-questions.js",
});

// Lấy ngân hàng câu hỏi.
const COMPREHENSIVE_QUESTION_BANK = sandbox.window.COMPREHENSIVE_QUESTION_BANK;
const LESSON_QUESTION_BANK = sandbox.window.LESSON_QUESTION_BANK;

// Kiểm tra dữ liệu.
if (
  !COMPREHENSIVE_QUESTION_BANK ||
  typeof COMPREHENSIVE_QUESTION_BANK !== "object"
) {
  throw new Error("Không thể tải ngân hàng câu hỏi.");
}

if (!LESSON_QUESTION_BANK || typeof LESSON_QUESTION_BANK !== "object") {
  throw new Error("Không thể tải ngân hàng câu hỏi bài học.");
}

// Kiểm tra cấu trúc từng chương.
const CHAPTER_KEYS = ["I", "II", "III", "IV", "V"];

for (const chapterKey of CHAPTER_KEYS) {
  const topics = COMPREHENSIVE_QUESTION_BANK[chapterKey];

  if (!Array.isArray(topics)) {
    throw new Error(`Dữ liệu chương ${chapterKey} không hợp lệ.`);
  }

  for (const topic of topics) {
    if (
      !Array.isArray(topic) ||
      topic.length !== 5 ||
      !Array.isArray(topic[2]) ||
      !Number.isInteger(topic[3]) ||
      topic[3] < 0 ||
      topic[3] >= topic[2].length
    ) {
      throw new Error(`Câu hỏi trong chương ${chapterKey} không hợp lệ.`);
    }
  }
}

// Ngân hàng 5 câu hỏi bổ sung cho từng chương.
const CHAPTER_EXTRA_QUESTIONS = {
  I: [
    {
      prompt:
        "Hình chiếu vuông góc được tạo ra khi các tia chiếu như thế nào với mặt phẳng chiếu?",
      choices: [
        "Vuông góc với mặt phẳng chiếu.",
        "Song song với mặt phẳng chiếu.",
        "Tạo góc bất kì với mặt phẳng chiếu.",
      ],
      answer: 0,
      explanation:
        "Các tia chiếu vuông góc với mặt phẳng chiếu tạo nên hình chiếu vuông góc.",
    },
    {
      prompt:
        "Đường nét đứt mảnh trên bản vẽ thường biểu diễn phần nào của vật thể?",
      choices: ["Cạnh thấy.", "Cạnh khuất.", "Đường kích thước."],
      answer: 1,
      explanation:
        "Nét đứt mảnh được dùng để biểu diễn cạnh khuất trong bản vẽ.",
    },
    {
      prompt: "Kích thước ghi trên bản vẽ kĩ thuật thường cho biết điều gì?",
      choices: [
        "Màu sắc của vật thể.",
        "Khối lượng chính xác của vật thể.",
        "Kích thước thực của vật thể theo đơn vị quy định.",
      ],
      answer: 2,
      explanation:
        "Kích thước bản vẽ cho biết kích thước thực của chi tiết theo quy ước ghi kích thước.",
    },
    {
      prompt: "Bản vẽ lắp chủ yếu giúp người đọc hiểu thông tin nào?",
      choices: [
        "Chỉ màu sắc của sản phẩm.",
        "Quan hệ vị trí và cách lắp các chi tiết.",
        "Chỉ quy trình quảng cáo sản phẩm.",
      ],
      answer: 1,
      explanation:
        "Bản vẽ lắp thể hiện hình dạng chung và quan hệ lắp ghép giữa các chi tiết.",
    },
    {
      prompt:
        "Khi bắt đầu đọc một bản vẽ, thông tin nào nên được xem để nhận biết tên gọi và tỉ lệ?",
      choices: ["Khung tên.", "Đường gạch mặt cắt.", "Nét đứt."],
      answer: 0,
      explanation:
        "Khung tên chứa những thông tin nhận dạng cơ bản của bản vẽ.",
    },
  ],

  II: [
    {
      prompt: "Vật liệu nào sau đây thuộc nhóm kim loại đen?",
      choices: ["Cao su.", "Thép.", "Đồng."],
      answer: 1,
      explanation: "Gang và thép là các vật liệu thuộc nhóm kim loại đen.",
    },
    {
      prompt:
        "Trong bộ truyền đai, bộ phận nào truyền chuyển động giữa hai bánh đai?",
      choices: ["Ổ trục.", "Vỏ máy.", "Dây đai."],
      answer: 2,
      explanation:
        "Dây đai ôm quanh bánh dẫn và bánh bị dẫn để truyền chuyển động.",
    },
    {
      prompt:
        "Hai bánh răng ăn khớp ngoài trực tiếp thường quay theo chiều nào?",
      choices: [
        "Ngược chiều nhau.",
        "Cùng chiều nhau.",
        "Không thể truyền chuyển động.",
      ],
      answer: 0,
      explanation:
        "Khi hai bánh răng ăn khớp ngoài, chiều quay của chúng ngược nhau.",
    },
    {
      prompt: "Khi cưa kim loại bằng tay, cách làm nào giúp giữ phôi ổn định?",
      choices: [
        "Giữ phôi bằng tay sát đường cưa.",
        "Đặt phôi tự do trên mép bàn.",
        "Kẹp chặt phôi vào ê tô phù hợp.",
      ],
      answer: 2,
      explanation:
        "Kẹp chặt phôi giúp thao tác ổn định và giảm nguy cơ trượt gây chấn thương.",
    },
    {
      prompt: "Trước khi dùng dụng cụ gia công cơ khí, việc nào cần làm?",
      choices: [
        "Tháo bỏ bộ phận bảo vệ.",
        "Kiểm tra dụng cụ và thực hiện đúng quy tắc an toàn.",
        "Đứng trong hướng chuyển động của phôi.",
      ],
      answer: 1,
      explanation:
        "Kiểm tra tình trạng dụng cụ và tuân thủ hướng dẫn giúp hạn chế tai nạn.",
    },
  ],

  III: [
    {
      prompt: "Hành động nào có nguy cơ gây tai nạn điện?",
      choices: [
        "Dùng thiết bị đúng hướng dẫn.",
        "Báo người lớn khi thấy dây điện hỏng.",
        "Chạm vào dây dẫn bị hở khi dây đang mang điện.",
      ],
      answer: 2,
      explanation:
        "Chạm vào phần dẫn điện đang mang điện có thể làm dòng điện đi qua cơ thể.",
    },
    {
      prompt: "Vì sao không nên sử dụng thiết bị điện khi tay ướt?",
      choices: [
        "Nước và độ ẩm có thể làm tăng nguy cơ dòng điện truyền qua cơ thể.",
        "Tay ướt luôn làm thiết bị hết điện.",
        "Nước làm dây dẫn không thể nóng lên.",
      ],
      answer: 0,
      explanation:
        "Độ ẩm làm giảm khả năng cách điện của da và tăng nguy cơ điện giật.",
    },
    {
      prompt: "Khi phát hiện dây điện bị hỏng, em nên làm gì?",
      choices: [
        "Tự nối dây khi nguồn chưa ngắt.",
        "Không chạm vào và báo ngay cho người lớn hoặc giáo viên.",
        "Dùng tay kiểm tra chỗ hở.",
      ],
      answer: 1,
      explanation:
        "Cần tránh xa khu vực nguy hiểm và nhờ người có trách nhiệm xử lí an toàn.",
    },
    {
      prompt: "Găng tay cách điện phù hợp được dùng nhằm mục đích nào?",
      choices: [
        "Thay thế mọi quy tắc an toàn.",
        "Cho phép làm việc với bất kì điện áp nào.",
        "Hạn chế tiếp xúc trực tiếp với phần có nguy cơ dẫn điện khi sử dụng đúng cách.",
      ],
      answer: 2,
      explanation:
        "Dụng cụ bảo vệ hỗ trợ cách điện nhưng phải đúng loại, còn tốt và dùng đúng hướng dẫn.",
    },
    {
      prompt: "Nếu có người gặp sự cố điện, việc đầu tiên cần ưu tiên là gì?",
      choices: [
        "Báo người lớn/cấp cứu và không chạm trực tiếp khi nguồn điện chưa được ngắt an toàn.",
        "Nắm tay kéo người đó ra ngay.",
        "Dội nước lên khu vực có điện.",
      ],
      answer: 0,
      explanation:
        "Không chạm trực tiếp khi nguồn điện còn nguy hiểm; cần gọi người có chuyên môn và ngắt điện an toàn.",
    },
  ],

  IV: [
    {
      prompt: "Bộ phận nào cung cấp điện năng cho mạch điện?",
      choices: ["Công tắc.", "Nguồn điện.", "Phụ tải."],
      answer: 1,
      explanation:
        "Nguồn điện cung cấp điện năng để các phần tử trong mạch hoạt động.",
    },
    {
      prompt: "Công tắc trong mạch điện có chức năng chính nào?",
      choices: [
        "Đóng hoặc ngắt mạch điện.",
        "Cung cấp điện năng.",
        "Thay thế dây dẫn.",
      ],
      answer: 0,
      explanation: "Công tắc điều khiển trạng thái đóng, ngắt của mạch.",
    },
    {
      prompt: "Vật liệu nào thường được dùng làm lõi dây dẫn điện?",
      choices: ["Cao su.", "Sứ.", "Đồng."],
      answer: 2,
      explanation: "Đồng là vật liệu dẫn điện thường dùng làm lõi dây dẫn.",
    },
    {
      prompt: "Điều kiện cơ bản để bóng đèn trong mạch đơn giản sáng là gì?",
      choices: [
        "Công tắc luôn mở.",
        "Mạch kín và nối đúng với nguồn điện.",
        "Không cần dây dẫn.",
      ],
      answer: 1,
      explanation:
        "Mạch phải kín, các phần tử được nối phù hợp và có nguồn điện.",
    },
    {
      prompt: "Khi lắp mạch điện học tập, nguồn nào phải được sử dụng?",
      choices: [
        "Ổ điện gia đình cắm trực tiếp.",
        "Nguồn bất kì không rõ thông số.",
        "Bộ nguồn điện áp thấp theo hướng dẫn của giáo viên.",
      ],
      answer: 2,
      explanation:
        "Chỉ thực hành với bộ nguồn điện áp thấp phù hợp; tuyệt đối không tự đấu vào điện lưới.",
    },
  ],

  V: [
    {
      prompt: "Thiết kế kĩ thuật thường bắt đầu từ đâu?",
      choices: [
        "Trang trí sản phẩm cuối cùng.",
        "Chọn ngẫu nhiên vật liệu.",
        "Nhận biết và xác định vấn đề hoặc nhu cầu cần giải quyết.",
      ],
      answer: 2,
      explanation:
        "Cần xác định đúng vấn đề và nhu cầu trước khi đề xuất giải pháp.",
    },
    {
      prompt: "Tiêu chí thiết kế giúp ích gì?",
      choices: [
        "Thay thế việc xác định vấn đề.",
        "Làm rõ yêu cầu để so sánh và đánh giá các phương án.",
        "Đảm bảo không cần thử nghiệm.",
      ],
      answer: 1,
      explanation: "Tiêu chí cho biết giải pháp cần đáp ứng những yêu cầu nào.",
    },
    {
      prompt: "Sau khi đề xuất nhiều ý tưởng, bước hợp lí tiếp theo là gì?",
      choices: [
        "So sánh các ý tưởng theo yêu cầu rồi chọn phương án phù hợp.",
        "Bỏ qua mọi tiêu chí.",
        "Kết thúc thiết kế ngay.",
      ],
      answer: 0,
      explanation:
        "Cần đánh giá ý tưởng theo tiêu chí để lựa chọn giải pháp có căn cứ.",
    },
    {
      prompt: "Vì sao cần thử nghiệm hoặc đánh giá sản phẩm thiết kế?",
      choices: [
        "Để tránh phải xác định yêu cầu.",
        "Chỉ để làm sản phẩm trông đẹp hơn.",
        "Kiểm tra mức độ đáp ứng yêu cầu và tìm điểm cần cải tiến.",
      ],
      answer: 2,
      explanation:
        "Đánh giá cho biết giải pháp hoạt động ra sao và cần điều chỉnh điểm nào.",
    },
    {
      prompt: "Nếu sản phẩm chưa đạt một tiêu chí quan trọng, nên làm gì?",
      choices: [
        "Bỏ qua kết quả kiểm tra.",
        "Điều chỉnh phương án rồi thử nghiệm, đánh giá lại.",
        "Khẳng định sản phẩm đã hoàn hảo.",
      ],
      answer: 1,
      explanation:
        "Thiết kế là quá trình có thể lặp lại để cải tiến giải pháp theo tiêu chí.",
    },
  ],
};

// Xuất dữ liệu để server.js sử dụng.
module.exports = {
  COMPREHENSIVE_QUESTION_BANK,
  LESSON_QUESTION_BANK,
  CHAPTER_KEYS,
  CHAPTER_EXTRA_QUESTIONS,
};
  