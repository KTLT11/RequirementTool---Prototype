# Demo Giai đoạn 3

Ứng dụng tại http://127.0.0.1:5173. Code tại `D:\RequirementTool`. Demo đã khôi phục nguồn 14/30 và chạy validation baseline.

1. **Overview:** xem actual stage, requirement progress, Fail/Unknown và Stale. Chọn bước chỉ mở workspace; không tự chuyển stage hoặc approval.
2. **Discovery → Tạo Requirement từ Discovery này:** đặt tên, chọn module, question/required information và Evidence. Đọc response/status rồi tạo Draft. Mở Sources/Trace để xem provenance. Draft chưa Reviewed/Confirmed.
3. **Requirements:** chọn Requirement; chỉnh statement/components theo module. Draft được giữ khi đổi requirement, tab, workspace hoặc refresh. Save mới cập nhật canonical state; validation chặn draft chưa lưu. Search/filter, link/unlink nằm trong Sources tab.
4. **Quality Review:** chọn Integration REQ-REF-002, lọc Fail. Mở AC-CHK-03: thiếu coverage payment không phản hồi, unknown outcome và duplicate. Dùng link sửa để tới đúng AC editor.
5. **AC Editor:** thêm AC. Nhập condition/input/outcome/verification, chọn các scenario phù hợp. Không chỉ nhập từ “timeout”. Nội dung recovery là đề xuất cần Integration Owner xác minh; không bịa retry/contract decision.
6. **Save → quay lại task → Re-validate:** kết quả cũ Stale; coverage đủ cấu trúc sẽ thành Unknown chờ BA review applicability. Mở “BA review criterion này”, ghi reviewer/basis rồi chạy lại. Criterion có thể Pass, nhưng source checks vẫn Unknown nếu nguồn chưa xác minh. Không tự cho cả Case Pass.
7. **Nguồn chưa xác minh/conflict:** REQ-REF-001 trace tới nguồn 14/30. Evidence Review không phải Confirmed; authority/basis và resolution hợp lệ vẫn bắt buộc như V2. Quality finding hướng quay Discovery khi thiếu thông tin nghiệp vụ.
8. **Change Impact:** sau một run, sửa response/evidence đang linked và lưu. Requirement liên quan Stale; scope không liên quan giữ current. Mở Quality → Stale để xem changes và chạy lại. Statement không tự bị viết lại theo nguồn.
9. **Decomposition/Archive:** lưu draft trước phân tách; nhập hai behavior, phân bổ từng AC và tất cả Evidence. Parent archive, child Draft giữ nguồn/dependency cần review. Archive thường có confirmation và giữ history.
10. **Guided Demo:** scenes 7–9 chạy creation/validation/editor thật. Before/After phản ánh shared state; scene 9 mở REQ-REF-002 AC để sửa. Scenes Customer/Dev/Handoff tiếp tục có nhãn preview Stage 4.
11. **Reset:** Layer 2 giữ Discovery/Evidence/Gaps hiện tại, restore Requirement/AC/links/validation baseline. Layer 1 reset Layer 2 theo dependency. Stage 4 reset giữ Layer 2. Entire restore toàn bộ scenario; Cancel không đổi dữ liệu. Refresh giữ reset state.

CRD/DRD preview đọc cùng canonical Requirement/AC; chưa xuất hoặc phát hành document snapshot. Chi tiết checks, assumptions và kết quả: STAGE3_REPORT.md.
