/** Explicit simulation; never invoked by deterministic check execution. */
export async function suggestHypothesis(request: string) {
  await new Promise((resolve) => setTimeout(resolve, 350));
  return request.toLocaleLowerCase().includes("hoàn tiền")
    ? "Process làm backbone: kiểm tra điều kiện hoàn tiền trước khi gửi thanh toán; làm rõ Business Rule, Integration và Exception cho kết quả chưa biết."
    : "Bắt đầu với Process để làm rõ actor, trigger và outcome. Module hỗ trợ cần được BA chọn theo gap thực tế.";
}
