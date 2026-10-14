import type { Question } from "../types/case";
// Core IDs are adapter-local; specialized question/information/check IDs map to
// the provided module definitions. This is the selected demo discovery scope.
export const questions: Question[] = [
  {
    id: "CORE-Q-01",
    infoId: "CORE-INFO-01",
    module: "Core",
    question: "Vấn đề nào đang làm quy trình hoàn tiền cần cải thiện?",
    why: "Phân biệt nhu cầu giảm xử lý thủ công với giải pháp được đề xuất.",
    checkId: "DISC-CHK-01",
    mandatory: true,
  },
  {
    id: "CORE-Q-02",
    infoId: "CORE-INFO-02",
    module: "Core",
    question: "Phạm vi và bộ phận nào chịu trách nhiệm xử lý hoàn tiền?",
    why: "Xác định ranh giới, actor và stakeholder cần xác minh.",
    checkId: "DISC-CHK-02",
    mandatory: true,
  },
  {
    id: "PROC-Q-01",
    infoId: "PROC-INFO-01",
    module: "Process",
    question: "Yêu cầu hoàn tiền bắt đầu từ sự kiện nào và kết thúc khi nào?",
    why: "Làm rõ trigger và kết quả cuối của process.",
    checkId: "PROC-CHK-01",
    mandatory: true,
  },
  {
    id: "PROC-Q-09",
    infoId: "PROC-INFO-04",
    module: "Process",
    question:
      "Các bước của quy trình hoàn tiền mong muốn diễn ra theo thứ tự nào?",
    why: "Kết nối kiểm tra điều kiện, gửi thanh toán và theo dõi kết quả.",
    checkId: "PROC-CHK-03",
    mandatory: true,
  },
  {
    id: "RULE-Q-06",
    infoId: "RULE-INFO-04",
    module: "Business Rule",
    question: "Thời hạn và các điều kiện đủ để hoàn tiền là gì?",
    why: "Không được tự chọn giữa hai chính sách 14 và 30 ngày đang mâu thuẫn.",
    checkId: "RULE-CHK-03",
    mandatory: true,
  },
  {
    id: "INT-Q-07",
    infoId: "INT-INFO-04",
    module: "Integration",
    question: "Những dữ liệu nào phải gửi sang hệ thống thanh toán?",
    why: "Tránh gửi thiếu định danh giao dịch, số tiền hoặc request ID.",
    checkId: "INT-CHK-03",
    mandatory: true,
  },
  {
    id: "INT-Q-13",
    infoId: "INT-INFO-07",
    module: "Integration",
    question:
      "Khi không nhận được phản hồi thanh toán, hệ thống phải xử lý thế nào?",
    why: "Timeout không chứng minh hoàn tiền đã thất bại; cần tránh giao dịch trùng.",
    checkId: "INT-CHK-05",
    mandatory: true,
  },
  {
    id: "EXC-Q-08",
    infoId: "EXC-INFO-07",
    module: "Exception",
    question: "Có được gửi lại yêu cầu hoặc cần đối soát trước khi thử lại?",
    why: "Làm rõ recovery và manual follow-up cho kết quả thanh toán chưa biết.",
    checkId: "EXC-CHK-05",
    mandatory: true,
  },
];
