# Stage 3 — Requirement Formation & Quality Validation

Ngày kiểm chứng: 13/10/2026. Source code: `D:\RequirementTool`. Functional Interactive Prototype trên codebase Stage 2 / UX V2 hiện có.

## Regression V2

Trước triển khai, chạy 28/28 tests Stage 2/V2 thành công. Sau triển khai, giữ coverage creation, context gate, discovery response/draft, evidence authority, conflict resolution, extraction linking, source provenance, reset và persistence. Test correction giả cũ được thay bằng test Stage 4 preview tách biệt khỏi Layer 2 thật và từ chối command correction đã nghỉ sử dụng.

Trong trình duyệt đã kiểm tra lại navigation của 10 workspace, formation từ Discovery, draft qua đổi workspace/Back/refresh, source response update phản ánh related Requirement, Back/Forward, partial reset giữ source, Entire Reset, Guided Demo validation thật. Source import/extraction vẫn giữ phạm vi V2; import metadata và accept/link/supersede được regression bằng service tests. Không tuyên bố chạy lại mọi tổ hợp file upload trên browser trong đợt này.

Lỗi phát hiện và sửa: optional parentId không round-trip tương đương sau serialization; fingerprint migration UX mặc định gây Stale giả; AC editor tự đóng khi nhập outcome; dependency fingerprint của source check bị ảnh hưởng bởi AC mới chưa có evidence link. Đồng thời thay AC deep-link dựa trên tên ID bằng lookup owner thực tế, ưu tiên owner active khi đã decomposition. Findings list được phân trang để không tạo trang dài theo số lượng checks.

## Implemented

- Requirement CRUD: tạo, xem, sửa, archive có confirmation, search/module/status filters, source/dependency link/unlink và History.
- Draft riêng theo Requirement, lưu localStorage khi đổi tab/workspace/refresh. Validation chặn scope còn draft chưa lưu; Save mới cập nhật canonical content/revision.
- Formation deterministic từ selected Discovery Questions/Required Information và Evidence; hiển thị response, nguồn và certainty trước khi tạo. Draft không tự Reviewed/Confirmed.
- Editor theo module Process, Business Rule, Integration, Data/Entity, Permission, Exception, NFR; fields hiển thị theo applicability.
- Decomposition thành hai Draft, phân bổ AC/Evidence, giữ parent/question/dependency; archive parent để không có duplicate active behavior. Không cho mất AC hoặc Evidence source trong phân bổ.
- AC CRUD; Condition/Outcome hoặc Given/When/Then; scenario coverage, verification và Evidence links. AC IDs ổn định, owner tìm qua quan hệ thực tế.
- Validation per Requirement và active Case scope; rule-driven results/findings, status/severity filters, reasons, correction deep links và re-validation.
- BA criterion reviews lưu reviewer/basis/input fingerprint, được kiểm tra lại khi input đổi; không có nút Resolve bỏ qua rule.
- Dependency-aware Stale theo input contract từng check, có reasons trước/sau, scope bị ảnh hưởng và re-validation. Không sửa statement tự động khi nguồn đổi.
- Traceability hai chiều Sources/Extraction → Question/Information → Evidence/Gap → Requirement/AC → Evaluation/Finding; IDs secondary, titles và return-to-task links.
- Overview summary/current task theo Layer 2; Guided scenes 7–9 dùng creation/validation/editor thật và Before/After shared state.
- Canonical Requirement/AC chiếu vào CRD/DRD preview hiện có; không dùng song song hardcoded Quality Preview.
- Reset từ Layer 2 giữ Incoming/Context/Discovery/Evidence/Gaps, reset Requirement/AC/links/results/runs/drafts và invalidate downstream previews. Reset từ Layer 1 trở lên khôi phục Layer 2 baseline; reset Stage 4 giữ Layer 2.

## Validation contract

Rule version: `layer2-prototype-1.0`. Các criterion chính lấy từ Framework mục 3.2/3.3: REQ-QC-01–08 và AC-CHK-01–05. STRUCT-ACTOR là adapter structural theo yêu cầu SRS FR-020A, không phải một dimension mới của Framework.

Execution order: Structural → Framework → Traceability/Consistency. Mechanical checks dùng component presence, related entity existence, verified Evidence với authority/basis, open gap/conflict và coverage mappings. Không đánh giá AC bằng từ khóa “timeout”. Cùng input và rule version tạo cùng kết quả. Presence chỉ kết luận điều kiện cấu trúc, không tự chứng minh chất lượng ngữ nghĩa.

Judgment về need/scope, ambiguity, decomposition, dependency sufficiency, alignment và verifiability giữ Unknown cho đến khi BA review có căn cứ. Hybrid criteria kiểm tra structural blockers trước, rồi dùng review hiện hành. Review không override thiếu AC, missing required component, unconfirmed Evidence, superseded source hoặc unresolved conflict. Quality Ready chỉ khi tất cả applicable checks hiện hành Pass/N/A; Unknown, Fail, Stale và Not Executed không là Pass. MVP không có waiver mandatory checkpoint.

Các giả định adapter prototype được ghi rõ ở đây, không gọi là quy tắc chính thức:

- Bộ component bắt buộc theo module là selected structural interpretation của các component nguồn; BA vẫn review applicability/meaning. STRUCT-ACTOR bắt buộc cho Process/Integration/Permission; N/A cho các cấu trúc còn lại trong prototype này.
- Coverage được map theo scenario ID do BA quản lý, rationale và review, không tự suy ra completeness từ câu chữ. N/A cần không có scenario áp dụng, basis và BA review; các nguồn RULE-Q-06/INT-Q-13/EXC-Q-08 đã xác định trường hợp quan trọng thì không được ẩn bằng N/A.
- Severity High cho deterministic Fail, Medium cho Unknown; đây là ưu tiên UX prototype, không phải severity taxonomy chính thức.
- Fingerprint prototype dùng hai deterministic hashes và chiều dài serialized input, với rule version; dùng để phát hiện thay đổi, không phải chữ ký bảo mật.
- Không có semantic AI/heuristic engine. UI ghi AI Semantic Not Executed/Unavailable; judgment thuộc BA, không giả lập AI Pass.

## Kết quả kiểm thử thực tế

47/47 tests thành công: regression Stage 2/V2 và 19 Stage 3 tests, gồm CRUD/AC, formation, decomposition, applicability, deterministic results, source certainty/conflict, scoped impact, immutable validation run history, mixed Quality Ready/Fail và reset ở cả 7 mốc sau validation/upstream changes, lặp reset và serialization.

TypeScript strict check và production build thành công. Build cuối: 1.622 modules; CSS 45,64 KB (gzip 9,55 KB), JS 446,88 KB (gzip 132,69 KB). Không nâng stack hoặc thêm production infrastructure.

Browser happy/exception paths đã thực hiện:

1. Run Case validation → Integration AC-CHK-03 Fail do thiếu no-response/unknown-outcome/duplicate coverage.
2. Finding → đúng Requirement/AC editor → tạo AC có condition/input/outcome/verification và 3 scenario mappings → Save → Stale.
3. Return về đúng finding → re-run → Unknown do coverage cấu trúc đủ nhưng chưa review applicability.
4. BA review có căn cứ → re-run → AC-CHK-03 Pass; các source criteria chưa xác minh vẫn Unknown. Business stage không tự Customer Confirmed/Dev Ready.
5. Formation từ Core Discovery với selected EVI-01 → Draft có question/source links, không Reviewed. Edit draft → đổi workspace/Back/refresh → còn nội dung; save/archive có confirmation.
6. Run scope active → đổi response RULE-Q-06 thành đề xuất 31 ngày → REQ-REF-001 Stale; REQ-REF-002/003 vẫn current. Requirement statement giữ nguyên; impact hiển thị response/evidence trước/sau.
7. Layer 2 Reset → Requirement/AC/results baseline, source 31 ngày được giữ; Guided Demo mở scene Formation và chạy validation thật. Entire Reset → restore nguồn 14/30, 3 Drafts, AC/links baseline; chạy validation lại.
8. Browser Back/Forward; per-requirement scope/filter; 10 workspace ở 1366×768 và 1440×900 không tràn ngang, body 14px. Quality page giảm còn khoảng 1.084px với disclosure/pagination; editor dùng sticky save actions. Dữ liệu dài vẫn cuộn trang tự nhiên.

Ảnh và số đo: `review/stage3/`. Browser console error query cuối trả về rỗng. Các service tests không được trình bày thành browser click tests; decomposition, mọi reset mốc và mixed readiness được kiểm chứng tự động, không tuyên bố browser exhaustive.

Trạng thái bàn giao: demo khôi phục baseline 14/30; 3 Requirements Draft, 1 AC mỗi requirement, Integration thiếu 3 coverage cases; đã chạy validation và mở finding liên quan. Current Business Stage vẫn Incoming Request. Fail/Unknown là kết quả nghiệp vụ dự kiến của dữ liệu demo chưa đủ, không phải test failure.

## Stage 4 handoff

Sẵn có: canonical Requirement IDs/revisions/module/components/relations, AC IDs/conditions/outcomes/verification/coverage/evidence links, current check results với rule/input version/freshness/reasons, BA reviews, validation runs và basic Case history. `requirementQuality` / `qualitySummary` cung cấp quality scope, open findings và Stale; source gaps/authority/resolution vẫn ở Discovery shared state.

Stage 4 cần dùng đúng current scope/revisions, Quality Ready và unresolved information/dependencies khi xây Customer Confirmation, Dev Readiness và document snapshots. Validation Pass không tự tạo Customer Confirmation, Dev Acceptance hoặc Dev Ready. Stage 3 chỉ invalidate preview cần cập nhật, không tạo/xóa approval records thật.

## Còn simulated / preview và giới hạn

- Context suggestions và extraction từ hai documents định sẵn vẫn mô phỏng V2. TXT/MD/CSV đọc tối đa 100.000 ký tự; định dạng khác metadata only, không production parser.
- Customer Confirmation, Dev Readiness/Acceptance và CRD/DRD publication/export vẫn Stage 4 preview. Preview dùng canonical Layer 2 content; template/narrative chưa là document generator thật hoặc immutable released snapshot.
- Module editor hỗ trợ 7 types; Discovery demo vẫn chỉ 8 câu hỏi chọn lọc thuộc 5 modules, chưa mở rộng toàn bộ module catalog.
- BA nhập tên và basis review trong môi trường demo, không authentication hoặc stakeholder identity verification.
- Không backend/database, real AI, semantic analysis, production access controls hoặc source ZIP.

Dừng tại Stage 3 để review trước khi phát triển Stage 4.

