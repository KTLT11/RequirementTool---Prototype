# Requirement Tool — Comprehensive Product UX & Workflow Audit

Ngày audit: **12/10/2026** · Codebase: **D:\RequirementTool** · Bản chạy: **http://127.0.0.1:5173**.

**Phạm vi theo điều chỉnh cuối của người dùng:** đánh giá trải nghiệm người dùng và khả năng truyền tải sản phẩm của Functional Prototype. Không đánh giá độ hoàn chỉnh của backend/AI/validation engine; không yêu cầu các preview xử lý thật. Không sửa source, giao diện hoặc business logic. **Không đóng gói ZIP**, theo yêu cầu bổ sung.

Ký hiệu bằng chứng: **O** = quan sát/thao tác browser trong lượt audit này; **C** = đọc source; **D** = đối chiếu tài liệu; **I** = nhận định UX suy ra từ O/C/D, chưa kiểm chứng bằng nghiên cứu với người dùng thật.

## A. Executive Summary

**Prototype cho thấy các khu vực chức năng, nhưng chưa tự giải thích được một luồng làm việc liên tục cho BA mới.** Người trình diễn đã biết Framework có thể giải thích Case hoàn tiền, conflict 14/30 ngày, quality finding và dependency payment. Người xem tự khám phá vẫn phải đoán: lấy thông tin từ đâu, bấm gì trước, việc vừa bấm khác gì việc trước, và output nào thực sự được tạo từ input mình đã xử lý.

Vấn đề chính không còn là màu/font. Warm Workspace và typography hiện tại khá nhất quán. Năm nguyên nhân gốc về UX:

1. **Navigation tổ chức theo khu vực chức năng, còn hướng dẫn công việc chưa theo mục tiêu BA.** `Review Context`, `Accept hypothesis`, `BA Review Context`, `Tiếp tục Discovery` không tạo thành một chuỗi được giải thích trước khi thao tác.
2. **Thiếu câu chuyện tiếp nhận nguồn thông tin.** Có textarea Incoming Request nhưng không có điểm tiếp nhận tài liệu khách hàng hoặc minh họa tài liệu → nội dung trích xuất → BA review. `Business Context & Sources` là drawer đọc thông tin, không phải intake.
3. **Có ID và một số quan hệ trong data, nhưng thiếu mapping có thể nhìn thấy và đi theo trong UI.** Từ requirement chưa có đường dẫn cụ thể tới evidence/decision làm căn cứ; từ evidence chưa thấy nó hỗ trợ requirement nào.
4. **Các preview là phần giải thích bằng chữ nhiều hơn là một demo tương tác có đầu vào, thay đổi và kết quả liên tục.** Requirements/Quality giống nhau, finding không có cảnh sửa và kiểm tra lại, confirmation/readiness chỉ có lời mô tả trạng thái mẫu.
5. **Progressive disclosure giảm độ dài trang nhưng chưa đưa action đúng ngữ cảnh vào vị trí dễ thấy.** Actions xử lý Context vẫn dưới màn hình đầu; một số đường dẫn quay về khu vực chung, không tới đúng câu hỏi/nguồn/bước được chọn.

**Sẵn sàng leader review:** phù hợp để review cấu trúc chức năng và thảo luận định hướng **có người dẫn demo**. Chưa phù hợp làm demo tự khám phá hoặc bằng chứng rằng người mới hiểu được sản phẩm từ đầu đến cuối. Đây là nhận định heuristic, không phải điểm số usability hoặc kết quả user study.

Điểm đang làm tốt: trạng thái Reviewed/Confirmed tách riêng; conflict giữ hai nguồn; Gap → Evidence có deep link; preview có nhãn; tài liệu Draft không giả là đã được Customer/Dev duyệt; sidebar/tabs và màu sắc ổn định. Những điểm này cần giữ khi cải thiện UX.

## B. Current Application Map

Prefix trong bảng: `/cases/CASE-DEMO-001`. `Implemented` ở đây nghĩa là có thao tác/state prototype; không có nghĩa production capability.

| Route / khu vực | Purpose | Input | Output | Main actions | Navigation links | Implementation status |
|---|---|---|---|---|---|---|
| `/cases` | Tạo/mở Case | Tên, request, search/filter | Danh sách Case, ID, status, thông tin discovery | Tạo Case; Hiển thị; tìm/lọc; mở workspace | Case row, sidebar | Implemented; preferences chỉ trong phiên |
| `/overview` | Tổng quan Case và công việc | Request, context, gaps, current stage | Key gap, next action, workflow hoặc Context | Review Context; Mở Discovery & Gaps; Review Evidence | Cùng Case, drawer nguồn | Implemented + mô tả workflow |
| Incoming Request trong `/overview` | Nhìn lại yêu cầu ban đầu | `incomingRequest` | Request gốc | Chỉnh sửa Case; mở drawer; mở Input/Processing | Case Form, Business Context & Sources | Text input implemented; không có intake route/file upload riêng |
| `/overview?view=context` | Định hướng discovery | Known/Unknown/Assumption, complexity, hypothesis | Context Ready, discovery mode | Điều chỉnh context; Phân tích request; Accept/Reject; BA Review; Tiếp tục | Discovery, modal Context | Form/review implemented; suggestion mô phỏng, không trích xuất facts |
| `/discovery` | Thu thập thông tin | Câu hỏi, response, stakeholder source | Evidence Pending Review, gap status | Chọn module; Lưu Response; Review evidence | Evidence deep link, các view Discovery | Implemented cho 8 câu hỏi refund chọn lọc |
| `/discovery?view=patterns` | Review pattern/module | 4 pattern mẫu | Suggested/Validated/Rejected | Validate; Reject | Questions, Gaps, checkpoint | Manual state prototype; không có pattern explanation từ nguồn cụ thể |
| `/discovery?view=gaps` | Xử lý thông tin chưa đủ | Response/evidence | Gap list, clarification/resolution | Lọc; mở Gap; Thêm Clarification; Ghi Resolution | Evidence của Gap | Implemented; drawer, trường authority dùng chung với owner |
| `/discovery?view=checkpoint` | Xem completeness | Data trong phạm vi demo | 11 check rows, Pass/Fail/Unknown | Chạy Discovery Checkpoint; Tiếp tục Formation | Không có link từng check tới đúng field/module | Deterministic prototype checks chọn lọc, không full Framework engine |
| `/evidence` | Review nguồn và authority | Evidence từ response/fixture | Review/status/basis; stakeholder list | Mark Reviewed; Needs Clarification; Ghi nhận Confirmed; Thêm Stakeholder | Gap views; query `?evidence=...` | Implemented; không có form chia sẻ hoặc file intake |
| `/requirements` | Minh họa requirement/AC | `sampleSpec(c)` | 3 requirement mẫu, quality finding | Mở disclosure; Đánh dấu đã xem preview | Link chung về Discovery | Preview Only; không có editor/formation action |
| `/quality` | Minh họa quality | Cùng `sampleSpec(c)` | Cùng panel như Requirements, Fail mẫu | Cùng actions với Requirements | Link chung về Discovery | Preview Only; không có cảnh sửa/recheck |
| `/confirmation` — Customer | Minh họa customer review | Sample scope/document | Pending, CRD/DRD draft | Chọn preview; loại tài liệu; mở section; đánh dấu đã xem | Internal preview buttons | Preview Only; không ghi Customer Confirmation thật |
| `/confirmation` — Readiness | Minh họa điều kiện bàn giao | Sample requirements + dependency | Nhánh Ready but Blocked có điều kiện; actual chưa Ready | Đổi preview; đánh dấu đã xem | Không mở được dependency record cụ thể | Preview Only; không chạy readiness thật |
| `/confirmation` — Documents & Handoff | Xem output | Cùng nguồn sample spec | CRD/DRD Draft, Dev Pending | Đổi audience; mở section | Text dependency map | Preview Only; không export/snapshot/publication |
| `/history` | Xem hoạt động | Audit events | 10 dòng, Xem thêm | Xem thêm hoạt động | Không có object-detail/diff link | Implemented event list, không immutable review baseline |
| Reset Demo dialog, trên mọi workspace demo | Replay | Entire hoặc selected stage | Danh sách preserved/reset/downstream | Select type/stage; Confirm Reset; Cancel | Trở lại Overview | Implemented reset; selector/Cancel quan sát trực tiếp; mutation reset kiểm tra bằng tests, không chạy trên Case demo đang dùng |

Nguồn route: [App.tsx](D:/RequirementTool/src/app/App.tsx), [navigation.ts](D:/RequirementTool/src/app/navigation.ts), [WorkspacePage.tsx](D:/RequirementTool/src/pages/WorkspacePage.tsx).

**Không tồn tại như capability hiện tại:** upload/import, customer document library, extraction review, stakeholder form preview/reply inbox, requirement editor, Quality repair/recheck UI, confirmation record form, Dev Acceptance form, output publication. Không coi các capability này là đang chạy chỉ vì có nội dung mô tả trong workflow panel.

## C. End-to-End Workflow Audit

Luồng chuẩn từ Framework Doc 01/Doc 02 và Phase 3 System Overview:

**Incoming Request → Context Analysis → Discovery & Pattern Validation → Requirement Formation → Quality Validation → Stakeholder/Customer Confirmation → Dev Readiness → Handoff.**

**Evidence là nguồn thông tin xuyên suốt**, không phải một checkpoint tuyến tính độc lập bắt buộc nằm sau Discovery. Thu thập/review/evidence update có thể khiến BA quay lại các layer trước. Customer Confirmation của snapshot khác Evidence Confirmed.

| Bước | Expected theo tài liệu: input → processing → output / quyết định | Current behavior | Missing / unclear và impact UX | Recommended improvement |
|---|---|---|---|---|
| Incoming | Request + context/tài liệu → tiếp nhận, giữ nguồn → Case; thiếu thông tin được đưa sang Context | Tạo Case bằng text. Request gốc nằm trong form/drawer/disclosure | BA mới không thấy intake tài liệu; khó thấy input nào là nguồn chính | Một vùng Incoming Sources rõ trên Overview, có manual request và document intake preview |
| Context | Request/source → Known/Unknown/Assumption, complexity và discovery hypothesis → Context Ready?; chưa đủ thì làm rõ | Form context, suggestion một đoạn hypothesis, Accept/Reject, BA Review và Continue riêng | Không nói rõ từng nút review đối tượng gì; không có danh sách việc còn thiếu trước Continue; action ở cuối trang | Một task summary: đang review gì, còn thiếu gì, output sau thao tác là gì; CTA gần summary |
| Discovery | Context + stakeholder/documents → Core discovery, validate pattern, chọn module, completeness → information đủ để formation? | 8 câu hỏi refund, 5 module UI, pattern status, checks | Khó nhận ra bộ câu hỏi chọn lọc; check chỉ giải thích chung, không dẫn tới đúng dữ liệu còn thiếu | Cho thấy required info đang thu thập, căn cứ chọn module và task links từ check/gap |
| Evidence xuyên suốt | Response/document/decision → BA review + xác minh authority/basis → evidence dùng được; conflict giữ nguồn | Response tạo evidence; Reviewed/Confirmed tách riêng; Gap → Evidence link | Không thấy vòng tiếp nhận phản hồi ngoài BA nhập tay; authority dùng mã và lựa chọn chưa giải thích | Source card có tác giả/vai trò/tài liệu/phạm vi; giải thích hai lớp review và confirmation bằng ngôn ngữ BA |
| Gap / clarification | Missing/Unknown/Conflict → action phù hợp + owner → giải quyết có căn cứ; quay lại Discovery khi chưa đủ | Clarification và Resolution trong drawer | Owner/Authority nằm ở section clarification nhưng được dùng cho resolution; người mới khó chuẩn bị đủ điều kiện | Một panel task giải quyết gap: nguồn tranh chấp, bước review nguồn, người quyết định, căn cứ, kết quả |
| Formation | Information đã được xác minh → behavior/actor/trigger/rule/data → REQ/AC có traceability | 3 requirement mẫu; một phần rule/payload đọc từ Case | Không thấy thao tác thông tin nào tạo nên requirement nào; không có scene formation từ nguồn vừa xử lý | Preview tương tác chọn nguồn → thấy field/requirement chịu ảnh hưởng; không cần generator thật |
| Quality | Requirement/AC → check có căn cứ → finding và Quality Ready?; thiếu thông tin quay Discovery, thiếu AC quay editor | Fail `FIND-AC-REF-002`, link chung về Discovery | Không có đoạn “sửa AC → xem khác biệt → check lại”; Requirements/Quality giống nhau | Tách purpose hai khu vực; scene sửa mẫu và recheck mô phỏng, gắn đúng REQ/AC/question |
| Customer | CRD/scope/version → ghi nhận phản hồi reviewer/authority → Pending/Partial/Confirmed/Changes Requested; sửa thì review lại | Pending bằng chữ, CRD/DRD disclosure | Người xem không hình dung ai review cái gì, phạm vi nào được xác nhận; không có scene review record | Một review card minh họa scope, baseline, reviewer, phản hồi, phần chưa xác nhận; luôn ghi Simulated |
| Readiness | Quality + confirmation + dependency → Ready / Ready but Blocked / Not Ready theo phạm vi → action cho phần bị ảnh hưởng | Nhánh blocked giả định do payment contract, kèm actual chưa được đánh giá | Điều kiện và blocker là narrative; thiếu quan hệ trực quan REQ-REF-002 ↔ dependency ↔ phần bị block | Readiness summary theo scope, blocker card liên kết requirement và next action; không giả là gate đã chạy |
| Handoff/output | Ready scope + references + review baseline → DRD/package + Dev review → kết luận hoặc return flow | Draft CRD/DRD, Dev Pending; chưa publication | Link từ stage Handoff mở Customer panel; không thấy package nhận được và vòng Dev hỏi lại | Deep link đúng scene Handoff; package preview và Dev response scene có reference/return action |

References: Framework Doc 01 §§2–5; Doc 02 §§0.6, 2.4, 3.1, 3.4, 4.3–4.4; Phase 3 Prototype Design Specification §3 và Interactive Prototype Design §4; QG-06 §§B1, B3/TCR-09, B4.

**Điểm đứt quan trọng là presentation và tương tác minh họa:** nguồn khách hàng chưa vào câu chuyện; evidence chưa nối tới requirement; quality chưa có vòng sửa; confirmation/handoff chưa có cảnh kết quả. Những đoạn này có thể được minh họa bằng prototype services/scenes, không đòi hỏi backend hoặc AI.

## D. Button & Interaction Inventory

Severity là ảnh hưởng UX, không phải mức độ sai của engine. `—` = không phát hiện vấn đề đáng ưu tiên. Các hàng C-only không được hiểu là đã click action đó trong browser.

| Screen/location | Button label | Expected action với BA mới | Actual behavior / evidence | State change | UX problem | Severity | Recommended fix |
|---|---|---|---|---|---|---|---|
| Case List | Tạo Case → Lưu Case | Bắt đầu request | O: bắt buộc name/request, tạo Case riêng | Case/ID/history thật trong prototype | Không có lựa chọn bắt đầu từ tài liệu | High, UX-02 | Hai entry points rõ: nhập request / tiếp nhận document |
| Case List | Tìm kiếm / Trạng thái / Xóa bộ lọc | Tìm Case cần làm | O: tìm theo `UX AUDIT`; C: search name/ID/summary, status filter | Local view | List chưa làm nổi việc cần xử lý so với status tổng | Medium, UX-01 | Next task/source/review need trên Case row |
| Case List | Hiển thị → Áp dụng | Tùy chỉnh list | O: compact table; thông báo đây là preference phiên | UI-only | Mục đích đã rõ | — | Giữ scope hint, không nhầm với business update |
| Workspace | Chỉnh sửa Case → Lưu Case | Sửa request gốc | O trên Case audit: drawer có request mới nhưng summary cũ còn trên Overview | Request/version; context cần review | Người dùng thấy hai nội dung khác nhau mà không biết cái nào hiện hành | Medium, UX-13 | Làm rõ summary/request nguồn và indication nội dung mới |
| Overview | Review Context | Review bối cảnh | O: chuyển `?view=context`, chưa đánh dấu reviewed | Navigation-only | “Review” ở đây và “BA Review Context” dễ bị hiểu là cùng action | Medium, UX-06 | Label điều hướng như “Mở bối cảnh cần review” |
| Overview | Mở Discovery & Gaps | Xử lý vấn đề đang nêu | O: mở gaps view; không chọn riêng conflict 14/30 | Navigation-only | BA vẫn phải tìm đúng gap trong list | Medium, UX-08 | Link trực tiếp gap đang được ưu tiên |
| Overview | Review Evidence | Xem nguồn cần review | O: mở thư viện evidence | Navigation-only | Không tới evidence tạo ra next action | Medium, UX-08 | Mở đúng nguồn hoặc filtered pending queue |
| Workflow | Stage buttons | Đi tới bước làm việc hoặc xem bước? | O: chỉ chọn detail; Current Stage giữ Incoming | Selected UI state | Nhãn đã phân biệt nhưng chưa nói người dùng nên chọn bước nào | Medium, UX-01 | Cho thấy “bước đang cần làm” riêng “khám phá câu chuyện” |
| Workflow | Input & System Processing | Xem đầu vào/cách xử lý | O/C: disclosure | UI-only | Thông tin giải thích sản phẩm cốt lõi lại là phần phụ khi lần đầu xem | Medium, UX-11 | Tóm tắt input/output luôn hiện; chi tiết mở khi cần |
| Workflow Handoff | Mở khu vực làm việc | Mở Handoff đang chọn | O: tới `/confirmation`, hiện Customer Confirmation Preview | Navigation-only | Sai ngữ cảnh tới đích, phải chọn lại scene | High, UX-07 | Mang selected preview stage trong link/route |
| Context | Điều chỉnh context → Lưu context | Bổ sung bối cảnh | O: mở modal, Cancel; C: lưu draft, yêu cầu review lại | Context/version khi Save | Modal dài; source/owner là text, chưa dẫn dắt theo thông tin cần làm rõ | Medium, UX-08 | Ưu tiên field cần bổ sung, liên kết nguồn/owner có tên dễ đọc |
| Context | Phân tích request | Trích hiểu request/bối cảnh | O: tạo hypothesis mô phỏng; không điền context facts | Hypothesis/status/version | Tên rộng hơn output; không nói trước chỉ gợi ý hướng discovery | Medium, UX-06 | “Gợi ý hướng Discovery — mô phỏng”; nêu input/output và phần không được tự chốt |
| Context | Accept hypothesis / Reject | Chấp nhận/không dùng gợi ý | O trên Case audit: đổi badge | Suggestion status/history | Lẫn tiếng Anh, không giải thích chấp nhận cái gì so với review context | Medium, UX-06 | Copy theo đối tượng: “Dùng hướng Discovery này” / “Không sử dụng” |
| Context | BA Review Context | Xác nhận đã kiểm tra bối cảnh | O: context trống trả lỗi nội dung/owner/follow-up | Reviewed nếu đủ; không confirm evidence | Có phản hồi lỗi, nhưng không dẫn tới field thiếu; action dưới viewport đầu | High, UX-01/11 | Checklist việc cần hoàn thành và task CTA trong summary |
| Context | Tiếp tục Discovery | Sang bước tiếp theo | O: “Context chưa Ready.” | Chuyển stage nếu gate cho phép | Trước khi bấm không biết thiếu gì; sau bấm thông báo chung | High, UX-01 | Điều kiện cụ thể trước action và link tới field/action liên quan |
| Discovery | Questions / Gaps / Patterns / Information Complete | Đổi khu vực làm việc | O: đổi view; same-module draft được giữ khi đổi view | Query/view | Đã giảm scroll; các view vẫn chưa kể được thứ tự việc nên làm | Medium, UX-10 | Task links và đối tượng đang xử lý được giữ qua view |
| Discovery | Core / Process / Rule / Integration / Exception | Chọn module phù hợp | O: module switch mất draft câu khác khi quay lại | Local module; draft unmount | Mất nội dung nhập nhưng không cảnh báo | High, UX-09 | Giữ draft theo question hoặc báo chưa lưu trước khi rời |
| Discovery | Validate Process / … / Reject | Quyết định module phù hợp | C: manual status update; O: mở view thấy controls | Pattern status/version | Thiếu evidence/rationale hiển thị để BA hiểu tại sao validate | Medium, UX-06 | Hiển thị “đề xuất vì…” và nguồn, tác động tới câu hỏi cần khai thác |
| Discovery | Lưu Response CORE-Q-01 | Lưu câu 1 | O: tạo evidence Pending Review; draft câu 2 biến mất | Response/evidence/version | Toast đã lưu không cho thấy ảnh hưởng tới nhập liệu khác | High, UX-09 | Save feedback theo câu hỏi; giữ draft độc lập |
| Discovery | Review evidence | Review response vừa ghi | O: deep link tới đúng evidence drawer | Navigation-only | Đây là liên kết tốt; chưa có bước “quay lại câu hỏi đang làm” rõ | Medium, UX-03 | Giữ context của question và back link |
| Discovery | Chạy Discovery Checkpoint | Biết đủ thông tin chưa | O: hiển thị 11 check rows | Checkpoint/history | Reasons chung; không click về module/field cần bổ sung | High, UX-01 | Show failed task list với direct links và prior evidence |
| Discovery | Tiếp tục Requirement Formation | Thấy information thành requirement | O trên Case audit: “Information Complete chưa đạt.”; C: actual downstream là preview | Stage nếu đủ | Không giải thích trước rằng bước tới chỉ là minh họa | High, UX-04 | Nêu ranh giới functional demo và scene preview tại transition |
| Evidence | Thêm Stakeholder → Lưu | Thêm người cung cấp/xác minh thông tin | O: tạo Core stakeholder trên Case audit | Stakeholder list/version | Không cho thấy người này sẽ nhận/cung cấp thông tin ở đâu | Medium, UX-14 | Stakeholder card nối câu hỏi, response và source workflow preview |
| Evidence drawer | Mark Reviewed / Needs Clarification | Đánh giá thông tin nhận được | O: Mark Reviewed vẫn Unconfirmed; C: Needs Clarification là review riêng | Evidence review/version | Hai nút chưa tạo task tiếp theo theo ngữ cảnh | Medium, UX-08 | Giải thích kết quả + gợi ý xác minh hoặc tạo follow-up |
| Evidence drawer | Ghi nhận Evidence Confirmed | Xác minh nguồn có authority/basis | O: thiếu basis bị chặn; có basis + đúng source thì Confirmed | Evidence status, Gap update | Dropdown có nhiều authority nhưng không nói vai trò nào phù hợp; “Confirmed” khác customer confirmation chưa được diễn giải dễ hiểu | Medium, UX-06/08 | Hướng dẫn người xác minh nguồn, căn cứ cần có và hai lớp confirmation |
| Gap drawer | Thêm Clarification | Ghi việc cần hỏi tiếp | O: thiếu note/owner bị chặn; C: ghi note/owner, không tự đóng gap | Clarification/history | Không tạo luồng câu hỏi gửi/nhận lại; kết quả chỉ là note | Medium, UX-14 | Task preview có người nhận, nội dung, response trở về Pending Review |
| Gap drawer | Ghi Resolution | Chốt xử lý conflict có căn cứ | O: thiếu lựa chọn evidence trả error; C: dùng Owner/Authority của section trên | Resolution/response/gap khi đủ | Authority không nằm trong nhóm Resolution; cần tự suy ra thứ tự review → confirm → resolve | High, UX-08 | Resolution checklist và source review links trong cùng task panel |
| Requirements / Quality | Đánh dấu đã xem preview | Người xem tưởng đã hoàn tất bước? | C: chỉ ghi Viewed/history, không approval, không quality execution; không click trên Case demo | Preview record, không tăng source version | Đang là action nổi bật duy nhất nhưng giá trị nghiệp vụ thấp | Medium, UX-05 | Chuyển thành action phụ của walkthrough, ưu tiên “xem nguồn / xem thay đổi / cảnh tiếp theo” |
| Quality | Quay Discovery để làm rõ unknown outcome | Sửa finding | O/C: link về Discovery chung | Navigation-only | Không tới INT-Q-13/EXC-Q-08 hoặc AC-REF-002; không thấy bước recheck | High, UX-03/04 | Link tới task đúng đối tượng, minh họa before/after AC |
| Confirmation | Customer / Readiness / Documents & Handoff | Chọn task review hoặc output | O: đổi preview, không đổi actual stage | Local preview state | Người mới không rõ đây là xử lý hay đọc minh họa; state không được mang theo link từ Workflow | Medium, UX-05/07 | Context header nói rõ task thực tế và scene đang xem |
| Documents | CRD / DRD + section disclosure | Đọc tài liệu đúng audience | O: DRD dependency map hiện text; disclosure hoạt động | UI-only | Requirement/Rule/Question IDs không click được; không có “nguồn của đoạn này” | High, UX-03 | Source/dependency panel cho từng section/requirement |
| History | Xem thêm hoạt động | Tìm các thay đổi | O: 10 → 20 rows | UI-only | Event list chưa giải thích input/output thay đổi hoặc mở đối tượng | Medium, UX-10 | History theo object/mốc demo, có link và diff minh họa |
| Reset | Entire / From Stage / Confirm / Cancel | Chạy lại phần demo mong muốn | O: selector và Cancel; C + tests: reset dependencies, giữ upstream | Reset mutation nếu Confirm | “Current Stage” có thể được hiểu là đã hoàn thành việc trước đó, trong khi chỉ đang replay | Medium, UX-12 | Label chế độ Replay và điểm bắt đầu cảnh; tách khỏi tiến độ đã xử lý |

Không tìm thấy một nút được khẳng định là xử lý thật nhưng hoàn toàn không có handler. Vấn đề nổi bật là **action có handler nhưng nhãn/ngữ cảnh/feedback không giúp BA hiểu kết quả**, hoặc là navigation tới đích quá chung.

## E. Customer Document Import Gap Analysis

### Existing vs missing

| Capability | Hiện tại | Evidence / ý nghĩa UX |
|---|---|---|
| Incoming Request input | Có | Case Form bắt buộc tên/request, drawer đọc request gốc |
| Customer document upload/import | Không | O: không có entry action; C: không có file input/upload component, document model hoặc service |
| Customer document list/preview | Không | `Document preview` hiện tại là **output CRD/DRD**, không phải tài liệu khách đưa vào |
| Extraction preview / extracted facts | Không | Context items là BA/fixture entries; không có document/page/paragraph reference |
| Information source label | Có ở mức tên/mã/provenance | `Incoming Request`, `Demo Scenario`, `BA-entered Information`, stakeholder ID; không có source document record |
| Response → evidence linking | Có | Question ID, source ID, evidence ID, review/status/version |
| Document → evidence linking | Không | Không có document ID, location hoặc excerpt |
| BA review extracted information | Không có flow riêng | Evidence review chung tồn tại, nhưng không có thông tin trích xuất chờ review từ tài liệu |

**Đặc tả đã xác minh:** Phase 3 SRS **P3-FR-004**, AC-01–04: tải tài liệu vào Case cùng nguồn; nội dung trích xuất tham chiếu tài liệu; chờ BA review; lỗi đọc file có retry hoặc nhập tay. Định dạng và dung lượng thuộc **NFR-G08, giá trị chưa chốt**. Không suy ra phải có OCR, loại file cụ thể, real AI hay giới hạn MB cụ thể.

Đây là **capability gap so với sản phẩm được đặc tả và demo-story gap**. Không kết luận rằng việc thiếu full import engine là lỗi delivery Giai đoạn 2: yêu cầu Giai đoạn 2 ưu tiên functional modules và cho phép downstream preview. Tuy nhiên, trải nghiệm cần ít nhất một **cảnh intake rõ ràng** để người review hiểu đầu vào sản phẩm.

### Intake flow đề xuất — UX, chưa triển khai

1. Trong Overview, vùng **Incoming Sources** cho thấy request gốc và `Tiếp nhận tài liệu` bên cạnh `Nhập thông tin thủ công`.
2. Document card: tên, người cung cấp/vai trò, ngày nhận, trạng thái đọc, loại nguồn. Preview mẫu mở excerpt; không gọi CRD/DRD là incoming document.
3. `Xem thông tin đề xuất từ tài liệu — mô phỏng`: từng fact có excerpt/location, meaning, certainty và required information gợi ý.
4. BA chọn dùng/chỉnh sửa/không dùng fact. Kết quả vẫn chờ review/xác minh thích hợp, không tự coi là decision đã xác nhận.
5. UI cho thấy fact xuất hiện ở Context/Discovery nào, tạo evidence/gap nào, hỗ trợ requirement nào.
6. Cảnh lỗi đọc file cần cho thấy retry/manual input; không cần parser thật để minh họa UX.

Các lựa chọn **Incoming Sources card**, split view excerpt/fact, cách đặt CTA là **đề xuất UX**, không phải tên màn hình bắt buộc trong SRS. `P3-FR-014` và `P3-FR-016` là references về evidence/traceability; chúng không quyết định layout.

## F. Information Mapping & Traceability Audit

| Quan hệ | Mapping trong source | Người dùng nhìn thấy / đi theo được | Audit UX |
|---|---|---|---|
| Request → Case | `incomingRequest`, Case ID | Form/drawer; summary ở header | Nguồn chính chưa hiển thị nổi bật ở điểm bắt đầu |
| Document → extracted fact | Không có model | Không có UI | Câu chuyện đầu vào bị thiếu |
| Context fact → discovery | Các item/context/hypothesis cùng Case | Không có source-to-question links | Đứng cạnh nhau nhiều hơn là giải thích quan hệ |
| Question → Required Info / Check | `questions.ts` có IDs | IDs hiện trên câu hỏi | Tốt cho BA biết Framework, khó hiểu với người mới nếu không có tên/meaning |
| Response → Evidence | `response.evidenceId`; evidence có question/source/version | Link `Review evidence` mở đúng drawer | Quan hệ thực và dùng được |
| Question/Evidence → Gap | Gap có question/info/check/evidence IDs | Gap drawer có nguồn, `Mở evidence` deep link | Quan hệ thực và là phần demo mạnh nhất |
| Decision → resolved rule | `resolution` có evidence/authority/basis/sourceVersions; `sampleSpec.rule` đọc response của RULE-Q-06 khi Resolved | Không có “rule này lấy từ quyết định nào” trên requirement/document | Có cập nhật giá trị nhưng thiếu mapping hiển thị |
| Evidence → Requirement | Không có danh sách linked requirement IDs trong Evidence/WorkCase | Không có “used by requirements” | Thiếu cả representation graph và reverse trace UI |
| Requirement → rule/data/dependency | `sampleSpec(c)` tạo object, dependency là text | Text requirement/dependency | Sample relationship, không phải graph Requirement entities lưu trong Case |
| Requirement → AC | AC string trong từng sample requirement | Disclosure hiển thị AC | Có narrative mapping; không có AC entity/editor riêng |
| AC/REQ → Quality finding | Sample finding có `requirementId`, check ID; ID chứa AC | IDs hiện trong Quality Finding | Reference dạng sample, không có deep link đúng AC hoặc repair task |
| Confirmation → scoped snapshot | Không có record entity; `previews` chỉ Baseline/Viewed/Stale/sourceVersion | Text Pending, Draft và chưa snapshot | Chưa minh họa exact scope/baseline/reviewer bằng một review card |
| Readiness → blocker → affected REQ | Payment contract là string trong sample | Readiness narrative, DRD dependency text | Không có record có thể mở, impacted scope không trực quan |
| Canonical sample → CRD/DRD | Cùng `sampleSpec` và `outputSections` | Cùng IDs/rule/AC, audience selector | Tốt về shared sample source; chưa có content-origin map hoặc coverage preview |

### Ví dụ cụ thể CASE-DEMO-001

**Quan hệ đã nhìn thấy:**

`RULE-Q-06` → `RULE-INFO-04` / `RULE-CHK-03` → `GAP-RULE-Q-06` → `EVI-14` và `EVI-30`.

Trong drawer, EVI-14 là phát biểu **14 ngày**, source **ST-CS**, Reviewed/Unconfirmed; EVI-30 là **30 ngày**, source **ST-POL**, Pending Review/Unconfirmed. Click `Mở evidence` thứ hai thực sự mở `/evidence?evidence=EVI-30`. Không phải hai đoạn text không có quan hệ.

**Đoạn bị đứt với người xem:** `sampleSpec(c)` đọc rule này để dựng `REQ-REF-001` và CRD/DRD `RULE-REF-01`, nhưng requirement không cho mở lại `GAP-RULE-Q-06`, decision, evidence excerpt hoặc source version. Người xem phải nhớ ID và tự chuyển màn hình.

Một nhánh khác: `INT-Q-13` + `EXC-Q-08` → nội dung còn thiếu về unknown outcome/recovery → sample `AC-REF-002` thiếu coverage → `FIND-AC-REF-002`, `AC-CHK-03`, `REQ-REF-002`. Link hiện tại chỉ về Discovery chung, không mở hai câu hỏi hay AC đó. Payment dependency có trong REQ-REF-002 và DRD text nhưng không có impacted-requirement panel.

**Kết luận:** prototype có mapping functional ở Layer 1 và mapping sample một phần ở downstream. Không nên nói “không có traceability”; cũng không nên nói “end-to-end traceability đã hoàn chỉnh”. Thiếu chủ yếu là **đường đi mà BA có thể nhìn thấy/click theo**. References: Framework §0.6, §3.1 Discovery-to-Requirement Mapping; SRS P3-FR-016; QG-06 B1 và B3/TCR-09.

## G. Navigation & Visual Usability Findings

1. **Case-centric navigation tốt nhưng bị nhân đôi:** 7 links ở sidebar, 7 links ở workspace tabs, sau đó thêm Overview/Discovery/Evidence views và Confirmation preview buttons. Không cần bỏ hết; cần xác định cái nào là khu vực, cái nào là task, cái nào là demo scene. O/C/I; UX-10.
2. **Sticky giữ global actions, chưa giữ task actions.** Tại Context 1440×900, Accept hypothesis khoảng y=1190 và BA Review/Continue khoảng y=1297; cần cuộn để chạm hành động chính. Các action còn trên sticky toolbar lại là Edit Case/Reset. O; UX-11.
3. **Trục căn/typography hiện tại không phải root cause.** Inter, Lora hạn chế, khoảng cách và card structure tương đối thống nhất. Audit không đề xuất đổi Design System. I dựa trên browser và shared styles.
4. **Metadata chiếm vai trò dẫn đường thay cho meaning.** Question/Info/Check IDs hữu ích cho traceability, nhưng cần tên nội dung dễ hiểu và link “vì sao cần câu này”. Context owner ST-POL/ST-INT không trực quan bằng stakeholder name/role. O/C/I; UX-08/10.
5. **Disclosure đúng cho thông tin phụ, chưa đủ cho first-time orientation.** Input/Processing được thu gọn, Known facts cũng thu gọn; user mở lần đầu không có một source-to-output summary để thay thế. O/C/I; UX-11.
6. **Drawer drill-down hợp lý nhưng mất task context khi chuyển route.** Gap → Evidence là deep link tốt; chưa có route back tới Gap/task đang xử lý. QA đã đi theo link nguồn, không chỉ đoán từ source. O/C; UX-03/08.
7. **Authority ở vị trí khác resolution.** Field `Owner / Authority` của clarification được dùng khi Ghi Resolution. Đây là grouping/copy problem cần sửa trước việc tăng thêm button. O/C; UX-08.
8. **Lịch sử giảm scroll nhờ 10 dòng/lần**, nhưng không có object link, changed-value preview hoặc review milestone; không giúp người mới học quan hệ input → output. O/C; UX-10.
9. **Đi tới đích chưa đủ chính xác:** Handoff tới Customer panel; quality finding về Discovery chung; next gap action về list chung. O/C; UX-07/03/01.

## H. Demo Scenario Quality

| Đoạn câu chuyện | Hiện tại người xem có thể thấy | Chưa rõ với trải nghiệm tự khám phá |
|---|---|---|
| Request ban đầu | Cải thiện hoàn tiền, giảm thủ công | Đâu là tài liệu/request khách đưa vào và đâu là phần demo đã chuẩn bị |
| Hệ thống phân tích | Context facts, complexity, suggested hypothesis | Output của Phân tích request chỉ là hypothesis; facts không xuất hiện từ một nguồn đọc được |
| Phát hiện vấn đề | Conflict 14/30, missing payload/unknown outcome/recovery | Vì sao đây là vấn đề tiếp theo cần xử lý; phải mở field nào |
| BA giải quyết | Review và confirm evidence; clarification/resolution controls | Thứ tự review source → xác minh → resolution, owner/authority và điều kiện cần chuẩn bị |
| Hình thành requirement | 3 Proposed sample requirements, rule/data đọc một phần từ Case | Không có cảnh chuyển thông tin đã xử lý thành REQ/AC, hoặc annotation nguồn cho từng field |
| Quality | AC-REF-002 thiếu unknown outcome/duplicate | Không có scene sửa AC rồi thấy finding được review/recheck; vẫn là ví dụ Fail tĩnh |
| Confirmation | Customer Pending; tài liệu Draft | Ai xác nhận, xác nhận scope/version nào, phần nào còn thiếu |
| Blocked | Payment contract; câu điều kiện Ready but Blocked | Không có timeline trước/sau hoặc impacted requirement card; current case chưa được đánh giá thực tế |
| Kết quả cuối | CRD/DRD Draft, Dev Pending | Chưa có kết thúc rõ: clarification draft, package ready, hoặc package accepted-but-blocked là cảnh nào |
| Reset/replay | Entire/From Stage, preserved/reset/downstream | Replay position và actual work progress có thể bị hiểu là cùng một khái niệm |

Kịch bản hoàn tiền có đủ nguyên liệu để kể chuyện tốt: process, policy conflict, integration uncertainty, missing AC và external dependency. **Điểm yếu là orchestration của trải nghiệm**, không phải phải tăng dữ liệu mẫu hoặc làm real engine.

Không đề xuất tự chọn 14 hay 30 ngày để “làm demo mượt”. Cảnh quyết định phải giữ người có authority và căn cứ, đánh dấu simulated scenario khi dùng kết quả mẫu. Không biến `Ready but Blocked` giả định thành kết luận Case hiện tại.

## I. Prioritized Findings

Severity rubric: **Critical** nếu trải nghiệm trực tiếp làm leader hiểu sai nghiêm trọng về approval/handoff mà không có dấu hiệu cảnh báo; **High** nếu cản hiểu một task/workflow cốt lõi hoặc làm mất nội dung đang thao tác; **Medium** nếu gây thêm bước tìm kiếm, nhập lại hoặc nhầm thuật ngữ có thể hồi phục; **Low** là polish không ảnh hưởng flow. **Không gán Critical trong audit này** vì preview/Draft/Pending đã có cảnh báo. Không chấm điểm tổng tùy tiện.

| ID | Severity | Category | Affected screen | Problem | Root cause | User impact | Recommended change | Reference / evidence |
|---|---|---|---|---|---|---|---|---|
| UX-01 | High | First-time / guidance | Overview, Context, checkpoint | Người mới chưa biết làm gì trước và vì sao chưa thể tiếp tục | Next-action logic được trình bày quá chung, thiếu field-level task guidance | Trial-and-error qua nhiều nút | Task summary, unmet-condition list, direct action links | O: Context/Formation error chung; D: P3-FR-005/011, Prototype guided UX |
| UX-02 | High | Intake | Case List, Overview | Không thấy nơi tiếp nhận tài liệu khách hàng | Không có intake representation; Sources drawer dễ bị hiểu như đã có document workflow | Không hiểu product input/cách khai thác tài liệu | Incoming Sources + import/extraction review **preview** | O/C; D: P3-FR-004, NFR-G08 pending |
| UX-03 | High | Information mapping | Evidence, Requirements, Quality, Documents | Không thể đi từ REQ/AC/finding về đúng nguồn | Layer 1 links có, downstream references là strings/sample không có drill-down | Màn hình đủ nội dung nhưng đứng riêng lẻ | Source-to-output trace panel và contextual return links | O: Gap → EVI-30 tốt; DRD map chỉ text; C: sampleSpec; D: FR-016, Framework §3.1, QG B1 |
| UX-04 | High | Demo storytelling | Formation → Quality → Confirmation → Handoff | Thiếu vòng before/after và repair/return | Preview diễn giải static, không có scenes tương tác liên tục | Leader khó thấy tool hỗ trợ BA thay đổi kết quả thế nào | Walkthrough scenes, correction/recheck mô phỏng, scoped review/output scenes | O: finding/preview UI; D: Interactive Prototype §4; Giai đoạn 2 cho phép preview |
| UX-05 | High | Mental model | Requirements, Quality, Confirmation | Hai khu vực khác purpose hiện cùng panel; action chính chỉ đánh dấu đã xem | Một preview component phục vụ hai routes; ranh giới task vs demo content chỉ rõ sau khi vào | Nhầm đang xử lý task hay đọc ví dụ | Tách purpose, role-specific scene và preview boundary ở entry/transition | O: same headings/actions; C: WorkspacePage:183 |
| UX-06 | Medium | Button meaning | Context, Evidence, preview | Review/Accept/Confirmed/Viewed không nói rõ đối tượng/kết quả | Copy dựa vào thuật ngữ Framework và pha tiếng Anh | Bấm nút đúng nhưng không biết việc vừa hoàn thành | Object-specific labels, expected-result microcopy, feedback có before/after | O: button inventory; D: P3-FR-014/025, QG TCR-09 |
| UX-07 | High | Navigation context | Workflow Handoff/Readiness | Link tới khu vực không mang stage đang xem | Destination route chung, previewStage local default Customer | Người xem mất mạch câu chuyện, phải chọn lại | Deep link selected scene và giữ context trên route | O: Handoff → Customer; C: WorkflowOverview link, WorkspacePage previewStage |
| UX-08 | High | Task grouping | Gap/Evidence/Context | Authority, source review và resolution không được trình bày thành một task rõ | Field grouping và labels không phản ánh decision flow | Không biết chuẩn bị gì để xử lý conflict, tìm owner bằng mã | Guided resolution panel; human-readable owner, related-source actions | O: conflict drawer; C: GapPanel:139/204; D: FR-015 |
| UX-09 | High | Input continuity | Discovery | Draft mất khi lưu câu khác hoặc đổi module | Question draft local; remount/unmount làm mất nội dung | Nhập lại, giảm tin tưởng thao tác lưu/chuyển view | Giữ draft độc lập theo câu, hoặc cảnh báo trước khi rời | O: 2 repro trên Case audit; C: DiscoveryPanel:148 + module filter; D: Prototype Easy navigation |
| UX-10 | Medium | IA / cognitive load | Toàn workspace, History | Nhiều lớp navigation/IDs nhưng thiếu task/object hierarchy | Tổ chức theo chức năng, chưa rõ relationship task ↔ object ↔ scene | Nhớ ID và chuyển màn hình để tự nối thông tin | Area nav ổn định, task context, IDs là secondary metadata; history object links | O/C/I; không có yêu cầu SRS về phải dùng một kiểu nav cụ thể |
| UX-11 | High | Action accessibility | Context, Overview | Primary task actions ngoài viewport đầu dù toolbar có nhiều action toàn cục | Chi tiết ưu tiên trước hành động; disclosure không thay thế orientation summary | Cuộn để tìm bước tiếp theo | Task header/summary có action và conditions; source summary gần entry | O: y≈1190/1297 tại 1440×900; D: P3-FR-005, Prototype UX principles |
| UX-12 | Medium | Replay clarity | Reset, workflow header | Replay stage dễ được hiểu thành tiến độ đã xử lý | Cùng nhãn Current Stage cho navigation/replay/business progress | Không hiểu stage muộn được chọn để xem hay đạt checkpoint | Tách nhãn Replay scene / processing progress, giải thích tác động reset | O: selector/preserved UI; C: reset service; I: risk hiểu nhầm, không phải lỗi reset engine |
| UX-13 | Medium | Content consistency | Header vs request drawer; Gap list | Summary request cũ hoặc câu “chưa có evidence” đứng cùng status Resolved | Display copy không giải thích quan hệ summary/current source và historical gap | Không biết tin nhãn hay nội dung; thấy thông tin mâu thuẫn | Nhãn current-source rõ, summary có nguồn; resolved row diễn giải kết quả | O trên Case audit; đánh giá copy/status UX, không yêu cầu engine tổng quát |
| UX-14 | Medium | Collaboration storytelling | Evidence & Stakeholders | Có stakeholder và evidence nhưng không thấy cách thông tin quay về Case | Không có form/response scene dù tài liệu mô tả prototype có thể minh họa | Nguồn trông như dữ liệu điền sẵn, thiếu vai trò của Customer | Stakeholder clarification/reply preview nối Gap → response → review | O/C; D: P3-FR-012/013, Prototype Design §3 bước 3; không yêu cầu publish link thật |

Ưu tiên trước leader demo: **UX-01/02/03/04/05/07/08/11**. UX-09 cần xử lý trước khi cho BA nhập liệu thử. UX-12/13/14 bổ sung độ tin cậy của câu chuyện; không cần triển khai capability production để làm rõ trải nghiệm.

### Reproduction evidence cho các vấn đề quan trọng

- **UX-09a:** Case `CASE-5E83D2EB` → Discovery/Core → nhập response câu 1 và draft câu 2 → `Lưu Response CORE-Q-01` → câu 2 trở về rỗng. Lưu câu 1 có handler thật; mất draft là quan sát browser, không chỉ suy ra code.
- **UX-09b:** cùng Case → nhập draft CORE-Q-02 → chọn Integration → chọn Core → draft rỗng. Đổi giữa Questions/Gaps giữ mounted view không giải quyết việc unmount giữa module.
- **UX-07:** demo Overview → chọn `7 Dev Handoff` → `Mở khu vực làm việc` → `/confirmation` hiển thị Customer Confirmation Preview. Không click gửi/approval.
- **UX-13:** Case audit → Chỉnh sửa Case → đổi Incoming Request → lưu → header vẫn mô tả request cũ; drawer Incoming Request có nội dung mới. Một Gap audit đã Confirmed hiển thị `Unknown · Resolved` bên câu “Thông tin chưa có evidence xác nhận”.
- **UX-11:** mở demo `/overview?view=context` từ đầu ở 1440×900 → task controls ở y≈1190–1297; không ở viewport đầu. Cần cuộn qua unknown facts/complexity/hypothesis để thực hiện review/continue.

## J. Proposed UX Improvement Direction

**Định hướng: Case workspace dẫn dắt bằng task và nguồn thông tin, vẫn cho BA di chuyển linh hoạt.** Không thay Warm Workspace, không xây wizard ép đi tuần tự qua mọi module.

- **Navigation:** giữ các khu vực nghiệp vụ ở sidebar hoặc tabs với vai trò rõ. Context header cho biết task đang làm, object/scope và điểm quay lại. Demo scenes có nhãn riêng, không cạnh tranh với navigation nghiệp vụ.
- **Overview:** request/source summary → current work status → blocker/next task → các artifacts vừa tạo. Một CTA chính theo nhiệm vụ, các thao tác edit/reset là phụ. Workflow explanation là entry cho khám phá câu chuyện, không thay thế task guidance.
- **Customer intake:** incoming request và customer documents ở một vùng nguồn. Trích xuất minh họa với excerpt/fact/BA review, rõ source vs generated output.
- **Workflow guidance:** trước khi bấm biết action review đối tượng gì, output dự kiến và điều kiện còn thiếu. Sau khi bấm thấy artifact/status thay đổi và next task có link.
- **Information mapping:** hai chiều Source/Evidence ↔ Required Info ↔ REQ/AC ↔ Finding ↔ Review/Output. Ưu tiên một case cụ thể trước, không cần graph canvas phức tạp.
- **Contextual actions:** mở đúng conflict/source/question/AC cần xử lý; authority cho resolution nằm cùng task; failed check cho link bổ sung thông tin.
- **Progressive disclosure:** meaning/task/blocker luôn hiện; IDs, processing detail, historical versions, full document sections mở khi cần. Draft và context nhập liệu được giữ qua navigation.
- **Demo walkthrough:** các cảnh “nguồn vào → phát hiện → BA quyết định → requirement → quality issue → chỉnh mẫu → scoped confirmation → blocker → package”. Scene mô phỏng cần nói rõ và có before/after; không giả như engine vừa tính.

Đây là đề xuất UX; audit chưa thực hiện bất kỳ thay đổi nào.

## K. Implementation Roadmap

| Work package | Mục tiêu / phạm vi đủ lớn | Screens ưu tiên | Output reviewable | Điều kiện đánh giá UX |
|---|---|---|---|---|
| **WP1 — Điểm bắt đầu và guided Case workspace** | Incoming Sources, intake/extraction preview, task summary, next-action labels/conditions, contextual primary actions | Case List, Overview, Context | Một BA mới nhìn thấy input, biết bắt đầu và thấy output sau context review | Làm walkthrough không cần giải thích nút; người review chỉ ra nguồn, current task và next action |
| **WP2 — Workbench nối thông tin** | Question/Evidence/Gap drill-down, authority grouping, source-to-REQ/AC/finding links, preservation of drafts, correct deep links | Discovery, Evidence, Gap, Requirements, Quality | Một conflict được theo từ nguồn tới decision và requirement; trở lại đúng task | Không phải nhớ/tra ID; không nhập lại draft; từ finding mở đúng nguồn/AC cần sửa |
| **WP3 — Câu chuyện demo xuyên suốt** | Tách Formation/Quality purpose; simulated repair/recheck, scoped review card, impacted readiness card, output package, replay labels | Quality, Confirmation/Documents, Readiness, Handoff, History/Reset | Guided scenes có before/after và hai kết thúc: cần làm rõ / chuẩn bị bàn giao có blocker | Leader giải thích được thông tin đã thay đổi, ai xác nhận, phạm vi/version, phần nào blocked và output nào nhận được |

WP1/WP2 giải quyết nguyên nhân gốc trước polish. WP3 chỉ yêu cầu prototype tương tác hoặc mô phỏng có nhãn; **không mặc định bắt đầu Giai đoạn 3, backend, real AI, gửi form thật hay production snapshot**. Cần user review phạm vi các work packages trước khi thực hiện.

## L. Verification & Limitations

### Browser đã dùng thật

Ứng dụng localhost truy cập được; không dựng bản khác. Audit tại 1440×900, sau đó trả viewport về mặc định.

Routes đã mở trong lượt này: `/cases`; demo `/overview`, `/overview?view=context`, `/discovery?view=gaps`, `/evidence?evidence=EVI-30`, `/requirements`, `/quality`, `/confirmation` với ba preview, `/history`; Case audit Overview/Context/Discovery/checkpoint/Evidence và `?evidence=...` sinh từ response.

Interactions đã thử:

- Tạo Case: empty validation, nhập và save Case riêng; edit request trên Case riêng.
- Search Case, compact display preference Apply.
- Workflow Handoff selection và link tới khu vực làm việc; lựa chọn không chuyển actual stage.
- Context review/continue với thông tin trống; Analyze, Accept, Reject trên Case audit.
- Thêm Core stakeholder audit; response save; draft bị mất khi save câu khác và đổi module.
- Response → Evidence deep link; Mark Reviewed vẫn Unconfirmed; Confirm thiếu basis bị từ chối; Confirm có basis/source trên Case audit; Gap chuyển Resolved.
- Demo conflict drawer, empty Clarification/Resolution validation, source link tới EVI-30. **Không review/confirm/resolve thành công trên demo Case của người dùng.**
- Requirements/Quality preview; DRD selector; mở dependency-map section; Readiness và Documents/Handoff scene.
- History Xem thêm: 10 → 20 hoạt động.
- Reset Entire/From Stage selectors, chọn Handoff, đọc preservation/affected information và Cancel. **Không click Confirm Reset trên demo trong lượt audit.**
- Ghi screenshot các view tiêu biểu. **Không click “Đánh dấu đã xem preview” trên demo** để tránh thêm history không cần thiết; behavior đó xác định từ handler.

Case audit được tạo là **CASE-5E83D2EB — UX AUDIT — Case kiểm tra riêng**. Nó có dữ liệu thử nghiệm được ghi rõ là audit, không phải quyết định nghiệp vụ; được giữ trong localStorage hiện tại để truy lại các observations. Demo **CASE-DEMO-001 vẫn v25, Current Stage Incoming Request** khi chốt audit. Không có chức năng delete Case trong UI nên audit không xóa dữ liệu qua đường ẩn.

### Source / documents đã đối chiếu

| Nhóm | Files / sections |
|---|---|
| Router / shell | `src/app/App.tsx`, `navigation.ts`, `components/layout/AppShell.tsx`; workspace route/tab/query state |
| Pages / shared components | `pages/CaseListPage.tsx`, `WorkspacePage.tsx`; `ui/primitives.tsx`, `Tabs.tsx`, `SectionSwitcher.tsx`, `Overlay.tsx`, Toast behavior; `styles/tokens.css`, `app.css` |
| Domain UI | `CaseDialogs.tsx`, `BusinessContextDetails.tsx`, `ContextPanel.tsx`, `DiscoveryPanel.tsx`, `EvidencePanel.tsx`, `GapPanel.tsx`, `WorkflowOverview.tsx`, `DownstreamPreview.tsx`, CaseStatusBadge |
| Model / data | `types/case.ts`, `data/cases.ts`, `questions.ts` |
| State / services | `context/AppContext.tsx`; `caseService`, `caseTransitions`, `suggestionService`, `discoveryService`, `previewService`, `demoResetService`, `stage2.test.ts` |
| Phase 2 | `C:\Users\Admin\Downloads\Requirement Framework (8) (5).docx`: Doc 01 workflow; Doc 02 §0.6, pattern validation, completeness, discovery-to-requirement mapping, readiness/handoff |
| Phase 3 | `C:\Users\Admin\Downloads\Phase 3 - Application.docx`: System Overview, SRS FR-004/005/006/007/010–016/017/020/025–029; Prototype Design Specification §3 và Interactive Prototype Design §4 |
| QG-06 | `C:\Users\Admin\Downloads\QG-06_Final_Output_Template_Design_v1.3.md`: B1 logical source mapping, TCR-09, audience/content allocation, snapshots và conditional sections |
| Stage 2 scope | Yêu cầu Giai đoạn 2 đã gửi trong Project: real Case/Context/Discovery/Evidence/Gaps; downstream có thể Simulated/Preview, không cần editor/full engine |

Import search: không thấy file-input/FileReader/FormData/document-ID/extraction/upload implementation trong `src`; đối chiếu với WorkCase model và source UI. **Absence conclusion là kết hợp UI và code**, không phải chỉ không thấy một button trên Overview.

Existing regression tests được chạy lại: **22/22 pass**. Một probe trạng thái trong bộ nhớ cũng đã được chạy để đọc behavior; theo điều chỉnh phạm vi cuối, **không đưa các vấn đề xử lý/gate vào findings UX hoặc roadmap sửa engine**. Test pass không phải bằng chứng UX tốt. Không chạy build để làm thay đổi `dist` trong audit và không dùng kết quả build trước đây như kết quả mới.

Không sửa application source/configuration/documentation có sẵn. Hash của **41 files** source/config/README/guide trước và sau audit **giống nhau hoàn toàn**. Chỉ thêm báo cáo và evidence artifacts.

### Screenshot evidence

| Evidence | Nội dung |
|---|---|
| [01-overview.png](D:/RequirementTool/audit-evidence/01-overview.png) | Overview, key gap, workflow entry |
| [02-handoff-link-customer-panel.png](D:/RequirementTool/audit-evidence/02-handoff-link-customer-panel.png) | Kết quả link Handoff đang mở Customer panel |
| [03-draft-loss-other-question.png](D:/RequirementTool/audit-evidence/03-draft-loss-other-question.png) | Câu hỏi thứ hai rỗng sau khi lưu câu thứ nhất trên Case audit |
| [04-audit-evidence-confirmation.png](D:/RequirementTool/audit-evidence/04-audit-evidence-confirmation.png) | Response/evidence flow được thử trên Case riêng |
| [05-demo-rule-conflict.png](D:/RequirementTool/audit-evidence/05-demo-rule-conflict.png) | Hai nguồn conflict 14/30 và resolution grouping |
| [06-requirements.png](D:/RequirementTool/audit-evidence/06-requirements.png), [06-quality.png](D:/RequirementTool/audit-evidence/06-quality.png) | Hai routes dùng cùng preview structure |
| [06-confirmation.png](D:/RequirementTool/audit-evidence/06-confirmation.png), [07-readiness.png](D:/RequirementTool/audit-evidence/07-readiness.png) | Preview/Draft/Pending và nhánh blocked có điều kiện |
| [08-reset-replay.png](D:/RequirementTool/audit-evidence/08-reset-replay.png) | Reset From Handoff, preserved/affected explanation |
| [09-request-summary-mismatch.png](D:/RequirementTool/audit-evidence/09-request-summary-mismatch.png) | Summary vs request cập nhật trên Case audit |
| [10-case-list.png](D:/RequirementTool/audit-evidence/10-case-list.png), [11-context.png](D:/RequirementTool/audit-evidence/11-context.png) | Entry list và Context action visibility |

### Giới hạn của kết luận

- Đây là heuristic audit + một BA walkthrough giả lập, không có người dùng mới độc lập hoặc usability test có tiêu chí thời gian/success rate.
- Quan sát trực tiếp được đánh dấu O; root-cause từ handler/model được đánh dấu C; mức độ gây khó hiểu là I, cần xác nhận khi user review.
- Không thử file import vì capability chưa có; không có OCR/parser/API để đánh giá. Không thử publish stakeholder form/export vì chưa có controls.
- Không đánh giá correctness/coverage toàn bộ engine, security, performance, backend hoặc readiness production. Preview không có engine thật không tự động là UX defect; **không giải thích được mục đích/input/output/cảnh kết quả mới là finding UX**.
- Happy path Customer Confirmed/Dev Accepted chưa được thao tác thật; chỉ đánh giá cách chúng được mô tả. Các snapshot là scope tương lai, không kết luận prototype đang có immutable baseline.
- Screenshot chứng minh view/state quan sát; bằng chứng draft loss gồm thao tác và giá trị field trước/sau, không chỉ một ảnh sau thao tác.

**Bàn giao:** báo cáo này và screenshot evidence. Chưa refactor, chưa thiết kế lại, chưa thêm capability và chưa chuyển Giai đoạn 3.
