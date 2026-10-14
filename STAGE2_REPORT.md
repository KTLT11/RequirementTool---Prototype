# Báo cáo Giai đoạn 2 — 12/10/2026

Bản code tại D:\RequirementTool. Mục tiêu là Functional Interactive Prototype cho leader review.

## Chức năng

| Nhóm | Trạng thái | Hành vi |
| --- | --- | --- |
| Case Management | Implemented | Tạo/sửa, validation, ID độc lập, persistence theo trình duyệt |
| Context | Implemented + Simulated | Known/Unknown/Assumption, owner/follow-up, complexity, hypothesis, accept/reject và BA review |
| Discovery | Implemented trong phạm vi demo | 8 câu hỏi chọn lọc, 5 module, pattern review, response và source |
| Evidence & Stakeholders | Implemented | Thêm stakeholder, review và confirmation tách biệt, authority/basis |
| Gaps & Conflicts | Implemented trong phạm vi demo | Missing/Unknown/Conflict, clarification, resolution có căn cứ, lưu cả nguồn mâu thuẫn |
| Workflow | Implemented | 7 bước, Input/Processing/Output/BA Action/Conditions, bước đang xem tách current stage |
| Requirement/Quality/Confirmation/Readiness/Documents | Preview Only | Requirement và AC mẫu, quality Fail mẫu, Customer Pending, dependency blocked minh họa, CRD/DRD cùng nguồn |
| Reset Demo | Implemented | Toàn bộ hoặc từ một bước; giữ upstream, reset bước chọn và invalidate downstream |

Reviewed không tự trở thành Confirmed. Nội dung trả lời hoặc clarification đơn thuần không đóng gap. Confirmation cần đúng nguồn, authority và basis. Thay đổi nguồn supersede evidence cũ, mở lại gap liên quan và làm preview downstream stale. Xem preview không bypass gate hoặc tạo approval.

## Reset theo dependency

| Reset từ | Giữ | Reset / invalidate |
| --- | --- | --- |
| Incoming | Case ID, audit history, Case khác | Toàn bộ scenario |
| Context | Case metadata | Context, Discovery, downstream |
| Discovery | Metadata và Context, stakeholder được Context tham chiếu | Response/evidence/gap/pattern; downstream |
| Formation | Context và Discovery | Formation preview; bước sau stale |
| Customer | Upstream và Formation preview | Customer preview; bước sau stale |
| Readiness | Upstream và Customer preview | Readiness preview; Handoff stale |
| Handoff | Toàn bộ upstream | Handoff preview |

Reset không reload trang. Dialog hiển thị preserved/reset/downstream trước xác nhận; Cancel giữ dữ liệu. Audit history được giữ, vì vậy repeated reset giống nhau về baseline nghiệp vụ, không giống toàn bộ lịch sử/version.

## Kiểm chứng

- TypeScript: pass. Build Vite: pass.
- 22/22 service tests pass: Case validation; review/confirmation/authority; conflict resolution giữ nguồn; source invalidation; reset cả 7 bước; reset toàn bộ/lặp lại; không tác động Case khác; preservation sau chỉnh sửa; serialization; gate protection; assumption; stakeholder được upstream tham chiếu; conflict và preview cập nhật 14/31; stale async suggestion.
- Browser: tạo/sửa Case riêng; accept hypothesis, BA review và chuyển Discovery; nhập response, review evidence vẫn Unconfirmed; confirmation thiếu basis bị chặn; confirmation và conflict resolution có căn cứ; chọn preview không chuyển current stage; Cancel reset; partial reset từ Formation/Discovery/Context/Customer/Readiness/Handoff; repeated entire reset; refresh giữ trạng thái reset; chuyển CRD/DRD.
- Lỗi Context identity trong hot reload đã được sửa. Log từng có lỗi khi cập nhật nhiều file; sau tải lại bản cuối, trang hiển thị hoàn chỉnh và không ghi nhận console error mới trong lượt kiểm tra đó.
- Demo bàn giao ở Incoming Request, có conflict 14/30 chưa giải quyết và integration gaps. Case tạo riêng được giữ để minh họa Case Management.

## Giới hạn

Đây là bộ câu hỏi/check chọn lọc cho demo, không phải engine đầy đủ của Framework. Conflict detector hiện phục vụ thời hạn hoàn tiền. Suggestion là prototype service, không có AI thật. Authority là dữ liệu được ghi nhận trong prototype, chưa có xác thực quyền người dùng. localStorage chỉ thuộc trình duyệt hiện tại, không đồng bộ đa người dùng.

Downstream chỉ preview: chưa có Quality engine tổng quát, customer approval thật, readiness engine thật, export documents hoặc immutable review snapshot. Ready but Blocked là tình huống minh họa có điều kiện, không phải kết luận readiness hiện tại. Dữ liệu scenario có provenance, không thay thế xác minh nghiệp vụ.
