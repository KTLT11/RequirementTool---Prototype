# Requirement Tool — Guided Workflow UX Architecture

Ngày: 14/10/2026. Trạng thái: đặc tả thiết kế để review; chưa implementation.
Codebase: D:\RequirementTool. Lượt này chỉ tạo file này, không sửa code, canonical data, reducers hoặc business rules.

## 1. UX diagnosis ở cấp độ sản phẩm

**Ứng dụng cung cấp nơi làm việc nhưng vẫn giao cho BA nhiệm vụ tự điều phối công việc.** Người dùng phải biết Framework để chọn trang, giải thích trạng thái, tìm action và quyết định khi nào được tiếp tục. Vấn đề nằm ở kiến trúc tương tác, không phải thiếu badge, màu hoặc spacing.

| Nguyên nhân | Bằng chứng đối chiếu | Hệ quả |
|---|---|---|
| Navigation cạnh tranh | AppShell có 10 workspace; WorkspacePage có picker; Overview có workflow rail; Guided Demo có scene navigation | BA phải tự chọn hệ thống điều hướng |
| Task chỉ là lời dẫn sang trang dữ liệu | OverviewV2 có current task nhưng thao tác trong component đích | BA phải tìm lại entity/action và tự nhớ mục tiêu |
| Business stage không đủ biểu diễn công việc | Gates, gaps, quality freshness, confirmation scope nằm ở các entity khác nhau | Chọn việc theo currentStage đơn lẻ có thể bỏ sót prerequisite hoặc vòng lặp |
| Actions chưa trở thành chuỗi nhiệm vụ | Accept, Review, Confirm, Resolve, Save, Validate là các thao tác riêng | Người mới không biết điều gì vừa đổi và điều kiện nào còn thiếu |
| Quay lại URL chưa bằng quay lại công việc | Có entityPath/returnTo nhưng chưa có parent task và result continuity | BA vẫn tự xác định đã đủ điều kiện tiếp tục hay chưa |
| Capability và narrative lệch nhau | Code có confirmation/snapshot/readiness mới hơn báo cáo Stage 3; một số lời dẫn vẫn gọi downstream là preview | Người xem không biết phần nào chạy được và phần nào chưa đủ nghiệp vụ |

### Baseline và phạm vi inspection

Đã đọc CLAUDE.md, tận dụng audit UX và STAGE3_REPORT.md; kiểm tra có mục tiêu routes/shell, WorkspacePage, task actions, types, gates, quality selectors, document/readiness service và reset. Không audit lại toàn bộ source; không chạy browser/test/build trong lượt thiết kế.

Các thiếu hụt intake/editor/validation/traceability trong audit 12/10 đã được V2/Stage 3 xử lý. Báo cáo đó là bằng chứng lịch sử, không phải danh sách capability hiện tại.

Source hiện có ConfirmationRecord, DevReviewRecord, DocumentSnapshot; commands confirmCustomer, devReview, snapshot; documentService có devReadiness và CRD/DRD composition. Đây là implementation trong prototype, chưa chứng minh đầy đủ Framework/SRS. Các giới hạn cần giữ trung thực:

- Confirmation chủ yếu dùng Requirement IDs; metadata AC/rule/reviewed revisions chưa đủ để suy validity của toàn baseline.
- Một form ghi record không đồng nghĩa chuyển business stage hoặc vượt checkpoint.
- previews Stale là tín hiệu cần review, không là bằng chứng validity theo từng scope/version.
- devReadiness hiện xét quality, confirmation coverage, linked gaps và related Requirements ngoài scope; không tự nhận diện toàn bộ external contract blocker từ narrative.
- Dev outcome trong code có Changes Requested; SRS có Needs Clarification. Cần adapter diễn giải, không tự thêm enum hoặc đổi business meaning khi refactor UX.

Các điểm thiếu domain guard/metadata là dependency implementation riêng, không sửa âm thầm để làm đẹp workflow.

## 2. Sitemap đề xuất

Ba điểm vào trong mỗi Case:

| Điểm vào | Vai trò | Nội dung chính |
|---|---|---|
| Continue Case — Tiếp tục Case | Làm việc thực tế; entry mặc định | Một task canvas: goal, sources, action, result, next |
| Explore Workflow — Xem quy trình | Hiểu hành trình và xem trước | Stage map và purpose/input/actions/output/checkpoint |
| Dữ liệu Case | Tra cứu/chỉnh sửa chuyên sâu khi cần | Supporting workspaces hiện có |

Sitemap:

- Case List → mở/tiếp tục Case → Continue Case.
- Continue → task → contextual source/editor/clarification → result → next/return parent.
- Explore → chọn stage → đọc detail → làm task nếu actionable, hoặc xem trước.
- Dữ liệu Case gồm Đầu vào (Request & Sources, Context); Thông tin nghiệp vụ (Discovery, Evidence/Gaps); Đặc tả (Requirements/AC, Quality Findings); Review & đầu ra (Confirmation, Documents/Dev Handoff); History.

Không dựng trang riêng cho từng task. Evidence, Gaps, Traceability, Documents hỗ trợ xuyên suốt, không là step cố định bắt buộc.

### Route contract đề xuất

Prefix /cases/:caseId:

- /continue là default entry; task/scope đang làm dùng query task và scope.
- /explore?stage=<existing-stage> là read-only overview.
- Các supporting routes /sources, /context, /discovery, /evidence, /requirements, /quality, /customer, /handoff, /history tiếp tục tồn tại. Documents dùng view hiện có của handoff.
- Bare Case path, Case List và Case shortcut dẫn Continue. /overview cũ có thể redirect Continue sau khi được duyệt.
- URL entity cũ vẫn mở đúng entity; không ép mọi deep link về recommended task.
- Working mode không đồng thời hiện full 7-step rail, 10-section sidebar và workspace picker. Sidebar mặc định là ba điểm vào; directory dữ liệu mở khi chọn Dữ liệu Case.
- Breadcrumb phân biệt Làm việc / Xem quy trình / Dữ liệu Case và giữ Case identity.

## 3. Primary user journey

1. Mở Case: đọc canonical state, đề xuất task và giải thích lý do.
2. BA xem goal, thông tin đã có, nguồn, uncertainty và điều kiện thiếu ngay trong task.
3. Thực hiện một action rõ ràng qua existing command/service.
4. Đọc state sau thao tác; show actual change và phần chưa giải quyết.
5. BA bấm “Tiếp tục: <next task>” hoặc xử lý blocker cụ thể.
6. Khi rẽ sang evidence/clarification/AC, giữ parent goal và scope.
7. Quay về parent: derive lại completion; nếu chưa đủ thì nói rõ, không giả hoàn tất.
8. BA có thể mở Explore hoặc dữ liệu sâu bất kỳ lúc nào; việc xem không đổi business state.

Không là wizard cưỡng bức. BA được chọn task khác trong tập actionable tasks, chỉnh upstream hoặc chuẩn bị Draft. Prepared Draft ngoài frontier không là bằng chứng vượt checkpoint.

### Hành trình CASE-DEMO-001

| Canonical state | Hướng dẫn |
|---|---|
| Request có, Context chưa Ready | Review bối cảnh/hướng Discovery; policy 14/30 là uncertainty hiển thị cùng context, không ép resolve trước khi hiểu bối cảnh |
| Context đủ, chưa chuyển Discovery | Action Bắt đầu Discovery hiện có; không auto-advance do navigation |
| Question/response thiếu | Đến câu hỏi/required information liên quan, nhập response và nguồn |
| Evidence chưa review/xác minh | Review nguồn rồi xác minh authority/basis khi cần; Reviewed không là Confirmed |
| Conflict 14/30 mở | Compare → clarification khi thiếu decision → verify nguồn phù hợp → resolution có căn cứ |
| Discovery checkpoint thiếu | Criterion chưa đạt → đúng nguồn/module; đủ điều kiện mới Formation |
| Formation | Chọn information/source → Draft có certainty và references → BA refine |
| Missing AC coverage | Finding → editor → save → validate → review applicability nếu Unknown → revalidate |
| Source đổi | Review impact/Stale chỉ ở scope liên quan |
| Quality Ready theo scope | Chuẩn bị customer review đúng scope/snapshot, ghi phản hồi có thẩm quyền |
| Changes Requested / readiness blocker | Guided loop về nguồn/editor/dependency rồi review/check lại |
| Scope Ready, package đủ | DRD/package → Dev review đúng baseline → kết luận khi đủ điều kiện |

Không seed decision/approval để ép câu chuyện đến cuối. Nếu state hoặc capability chưa đủ, Continue dừng đúng lý do; Explore cho xem bước tương lai. Demo end-to-end đầy đủ cần fixture có nhãn và evidence/review records hợp lệ được chuẩn bị riêng, không là fixed task-selection sequence.

## 4. Guided Task Model và task-selection logic

### Model là projection, không là business entity mới

| Field | Contract |
|---|---|
| Task ID | Deterministic từ Case + type + target entity/scope; không chứa revision để resume sau sửa |
| Case ID, Stage, Task type | Existing identity/stage và loại công việc |
| Goal, Purpose | Kết quả cần đạt và lý do |
| Input references | Entity kind/ID, revision/fingerprint khi có; title và certainty cho UI |
| Preconditions | Existing rules/gates; mỗi condition có reason và đường xử lý |
| User action | Existing command, target, expected effect; một primary action |
| Expected output | Kết quả dự kiến, chưa phải sự kiện đã xảy ra |
| Completion criteria | Predicate trên canonical state/current results |
| Blockers | Scope/reason/owner khi có, handling task; không tự tạo owner |
| Next possible tasks | Candidates; đọc lại state sau action để xác nhận |
| Related entities | Upstream/downstream references hiện hữu |
| Availability | UI-derived: có thể làm, chờ đầu vào, đủ điều kiện, capability chưa có |
| Parent task, return context | UI intent: goal/entity/tab/scope/origin/focus target |

Không persist task Complete/Approved riêng. Completion đọc từ state; UI chỉ giữ task intent, draft/context và result của lần thao tác. Task ID không là bằng chứng business event.

### Selector contract

Đề xuất selector thuần deriveGuidedTasks(case, capabilityMap, uiIntent), trả recommended task, alternate actionable tasks, waiting tasks và explanation. Không dispatch, không ghi localStorage, không dùng random/thời gian/scene counter để chọn việc.

1. Kiểm tra Case/entity/scope; archive/superseded/missing reference có explanation.
2. Xây candidates từ gates, question/response/evidence/gap, drafts/results, reviews/dependencies hiện có.
3. Đánh giá preconditions và completion bằng selectors/rules hiện tại.
4. Xác định frontier còn thiếu của scope; không chỉ theo currentStage. Replay/visited page không chứng minh completion.
5. Nếu parent đang chờ prerequisite, ưu tiên handling task của prerequisite đó.
6. Giữ task/input đang làm nếu còn hợp lệ; state đổi chỉ tạo recommendation, không đẩy BA ra khỏi form.
7. Chọn actionable task theo tie-break UX; nếu không có, trả waiting task với reason/owner và việc độc lập có thể làm.

| State / gate | Candidate | Completion source |
|---|---|---|
| Request thiếu essential content | Bổ sung request | Existing create/edit validation; không thêm intake approval |
| Context chưa Ready | Làm rõ item/hypothesis/review | contextReady; Accept không thay BA Review |
| Context Ready, stage chưa Discovery | Bắt đầu Discovery | Existing advance được chấp nhận |
| Discovery chưa complete | Question/pattern/evidence/gap theo missing criterion | Canonical inputs đáp ứng check liên quan |
| Inputs phù hợp, checkpoint chưa chạy/current | Information Complete check | discoveryReady, không chỉ field có text |
| Discovery Ready, formation chưa bắt đầu | Bắt đầu Formation | Existing transition; không coi prepared Draft là gate |
| Requirement set chưa đủ scope | Formation/BA review coverage | BA judgment + source links; không “một question = một Requirement” |
| Requirement có dirty draft | Tiếp tục/save Draft | Existing save/discard action |
| Checks Not Executed hoặc Stale | Validate/review impact | Current results đúng scope |
| Current structural/AC Fail | Sửa component/AC cụ thể | Save + revalidation theo rule |
| Fail/Unknown do business information | Làm rõ linked source/gap | Verified evidence/decision rồi revalidation |
| Unknown cần judgment | Review criterion với basis | Existing BA review + validation |
| Scope Quality Ready, review pending/chưa bao phủ | Chuẩn bị/ghi customer review | Domain scope/baseline/validity contract |
| Customer Changes Requested | Làm rõ yêu cầu thay đổi | Source/editor + checks current + review lại scope/version |
| Readiness Not Ready/Blocked/Ready | Quay prerequisite / dependency / handoff | Existing readiness/handoff conditions |
| Dev cần clarification/acceptance | Xử lý/ghi Dev review | Existing review/completion rules đúng baseline |

Scope coverage cần BA judgment vì hiện không có engine xác định Requirement Set đã đầy đủ mọi behavior. Không tự tạo coverage check Pass.

### Tie-break UX

Ưu tiên đề xuất, không thay mandatory/applicability rules:

1. Prerequisite trực tiếp của parent.
2. Task/draft đang làm còn hợp lệ.
3. Source conflict/uncertainty chặn selected scope.
4. Stale phải review/check lại trước khi dùng kết quả.
5. Current actionable Fail, rồi judgment Unknown.
6. Checkpoint transition, chuẩn bị review/handoff.
7. Stable entity order để tie-break cuối.

Mapping đường sửa dựa trên check ID, evaluation method và entity dependencies; không severity đơn lẻ hoặc dò substring reason. Unknown do nguồn thiếu tới nguồn; Unknown do judgment tới review/editor. Revalidation tạo current results mới rồi xếp lại candidates.

### Domain gaps không được che bằng UX selector

Thiếu reviewed revision không được suy “confirmation còn hiệu lực”. Stale hiện có tạo task xem lại baseline; metadata thiếu được nói là chưa đủ cơ sở, không tự thêm business enum.

Readiness service báo Ready không tự chứng minh handoff completeness hoặc reviewed snapshot validity. Hiển thị readiness result và các điều kiện package chưa kiểm chứng riêng; không gắn “đã bàn giao”. Code lệch Framework/SRS là domain dependency cần xử lý riêng, không UI override.

## 5. Task screen anatomy

Case header ngắn, mode rõ, scope và business stage tách với task đang xem. Không stage rail trong working mode.

### Current Task

- Goal bằng động từ + đối tượng có tên dễ hiểu; một câu Vì sao cần làm.
- Nếu là prerequisite: “Bạn đang làm rõ điều kiện để tiếp tục <parent goal>”.

### Relevant Information

- Request/response/Requirement/AC đúng đối tượng thao tác.
- Excerpt, nguồn/người cung cấp/authority/certainty liên quan.
- Missing, uncertain và conflicting information ở vùng chính; không giấu căn cứ quan trọng trong disclosure.
- Trace/history/details có thể thu gọn.

### BA Decision / Action

- Một primary action theo subtask/action state; chỉ expose actions liên quan của component gốc.
- Field guidance chỉ rõ cần nhập gì, ai có thể xác minh, lưu sẽ đổi gì.
- Disabled reason và đường xử lý prerequisite; Accept/Review/Confirm/Resolve/Save/Validate vẫn riêng nghĩa.
- Destructive confirmation nêu impact, không cạnh tranh với Continue.

### Result & Next Step

- Before/after thực từ command: target/scope bị ảnh hưởng và phần chưa giải quyết.
- Ví dụ “Response đã lưu; Evidence vẫn Unconfirmed”, “Coverage đã đủ cấu trúc; còn BA review”.
- Không dùng toast thay phản hồi nghiệp vụ; không auto-navigate ngay sau Save/Resolve.
- CTA “Tiếp tục: <next goal>” hoặc “Quay lại: <parent goal>”.
- Command bị từ chối: giữ input, explanation điều kiện; không success/completion giả.

Ví dụ Conflict: hiển thị hai excerpts 14/30 và authority. Khi chưa có căn cứ, primary Ghi clarification; khi đã đủ Reviewed/Confirmed + authority/basis, primary Ghi resolution. Gap chỉ complete theo validResolution, không theo số lần bấm.

## 6. Điều hướng Working Flow và Workflow Preview

| Interaction | Contract |
|---|---|
| Case mở từ list | Continue derive recommendation; resume intent nếu hợp lệ |
| Continue → Explore | Giữ origin/draft; chỉ đọc, không dispatch viewPreview hoặc visited-state mutation |
| Explore stage tương lai | Purpose/input/actions/output/checkpoint, rõ Xem trước |
| Explore → làm task | Check actionable; mở actual target/scope, không advance stage vì chọn |
| Task → source/AC/Gap | Contextual panel hoặc supporting route với return parent |
| Supporting save → parent | Same canonical command; derive lại completion và show actual result |
| Back/Forward/refresh | Giữ entity/tab/scope, draft theo contract; kiểm tra lại references |
| Case khác | Không mang intent/draft/selection từ Case cũ |

Không drawer lồng nhiều tầng. Một contextual panel có trail quay lại; form chưa lưu được giữ hoặc cảnh báo trước khi rời. Existing Context/Customer/Dev form draft chủ yếu UI-local cần giữ mounted trong session hoặc guard khi full-route navigation. Không hứa refresh persistence cho form chưa có draft contract.

returnTo chỉ chấp nhận nội bộ cùng Case, không external URL hoặc return loop. Sau reset/archive, task URL cũ được giải thích; không âm thầm mở entity khác.

## 7. Guided blocker/exception loops

| Trigger | Loop | Return/completion |
|---|---|---|
| Missing information | Parent check → question/info → response/source → evidence review/verify → check | Parent dùng nguồn; nhập text chưa là complete |
| Evidence conflict | Compare → clarification/authority → resolution → recheck | Affected requirement/checkpoint; giữ opposing sources/history |
| Quality Fail về structure/AC | Finding → đúng editor/AC → save → validate | Same finding ID; outcome mới Pass/Unknown/Fail |
| Judgment Unknown | Criterion → inputs → BA review/basis → validate | Đúng Requirement/scope, không Pass hàng loạt |
| Stale | Impact/changes/affected checks → review → validate | Dependent scope, không tự rewrite statement |
| Customer Changes Requested | Record → affected content → source/editor → quality → review lại | Giữ old record/snapshot, không approval mới bằng fixture |
| Partial/unconfirmed scope | Phần chưa confirmed → đúng version review | Không dùng confirmed subset thay toàn Case |
| Not Ready | Reasons → quality/source/confirmation task | Readiness scope ban đầu |
| Ready but Blocked | Dependency/owner/reference → domain action có căn cứ → reassess | Chỉ blocked scope; acknowledgment không resolution |
| Dev clarification/changes | Review → đúng Requirement/reference → refine/verify → recheck/review | Package/snapshot tương ứng |
| Waiting external answer | Follow-up model có sẵn, chọn việc độc lập khác | Reopen vẫn waiting nếu input chưa đổi |
| Capability thiếu | Explain limitation + chuẩn bị input hoặc Explore | Không fake complete/action |

Không đổi readiness classification để tăng cảm giác tiến độ. “Hết task được hỗ trợ” không là Case Completed.

## 8. Screen interaction specifications theo giai đoạn

| Stage | Input/visible information | Primary action theo subtask | Result/checkpoint |
|---|---|---|---|
| Incoming | Original request/source và essential missing content | Bổ sung request; nếu đủ thì review Context | Case đã nhận request; documents optional theo nhu cầu, import không auto extraction |
| Context | Known/Unknown/Assumption, owner/follow-up, complexity/hypothesis, Discovery conditions | Làm rõ → accept/adjust/reject đề xuất → BA review → bắt đầu Discovery | contextReady giữ nguyên; không auto Confirm facts |
| Discovery/Patterns | Một question/module, purpose, Required Information, response/source, lý do applicability | Save response / review pattern / checkpoint tùy task | Evidence Pending/Unconfirmed; next theo missing condition |
| Evidence/Gap hỗ trợ | Excerpt/status/authority, missing/conflict details | Review/confirm basis/clarify/resolve theo preconditions | Predicate thật; return parent |
| Formation | Selected sources/certainty, module components, related req/dependencies | Tạo/refine/save Draft | Canonical Requirement/references, judgment coverage/decomposition |
| Quality | Criterion/reason/method, prior/current, đúng target | Sửa AC/component hoặc nguồn; validate khi saved | Current Pass/Fail/Unknown/N/A; không Resolve bằng click |
| Customer | Scope, CRD/snapshot, quality/issues, reviewer/authority/basis | Chuẩn bị review hoặc ghi outcome | Scope/version rõ; gửi document không Confirmed |
| Readiness | Scope, quality, confirmation validity khi có, dependency reasons | Prerequisite/blocker action hoặc gate capability | Ready/Blocked/Not Ready semantics không đổi |
| Documents/Handoff | Canonical scope, CRD/DRD, snapshot/reference/completeness | Chuẩn bị package/snapshot/ghi review theo task | Snapshot không confirmation; Accepted with Blocker không Unblocked |
| Scope completion | Records, readiness, blockers và handoff conditions | Kết luận khi domain đủ | Completed scope không mặc định completed Case |

### Demo và Explore

Guided Demo hợp nhất thành “Giới thiệu cách dùng” trong Explore/task help, không navigation thứ tư. Chọn scene chỉ đọc/mở task; không ngầm gọi confirmCustomer hoặc tạo approval từ fixture.

Muốn thao tác thật thì chuyển rõ sang Continue với input/basis phù hợp. Future scripted outcome có nhãn Minh họa ở cả input/result và không đổi canonical state. Reset vẫn dùng service/dialog hiện tại; tasks derive lại, không task-store độc lập cần reset.

## 9. Mapping existing components/services

| Existing | Reuse | Thay đổi UI adapter đề xuất |
|---|---|---|
| AppShell, navigation.ts, App.tsx | Case identity/routes | Ba mode entries, /continue default; supporting deep links giữ |
| WorkspacePage | Case load/errors/reset/history/return | Supporting host; task host dùng chung shell, bỏ working picker |
| OverviewV2 | Summary/gates/current work | Current task sang Continue; stage rail/detail sang Explore |
| workflowDetails, stageOrder, stageLabels | Purpose/input/output/checkpoint | Correct capability narrative; không dùng narrative làm selector |
| RequestSources, uxService | Intake/extraction review/link/provenance | Targeted item/action, giữ import/demo extraction limits |
| ContextPanel, suggestionService | Context/hypothesis/review | Missing-condition subtask, một primary action, draft guard |
| ConnectedDiscovery, DiscoveryPanel | Question/response/pattern/checkpoint | Task nhận exact question/module/info, không whole action catalog |
| EvidencePanel, GapPanel, EvidenceReview | Sources/gaps/authority/clarification/resolution | Target đúng entity/view; route hiện dùng EvidencePanel, không tạo workbench song song |
| RequirementWorkspace, FormationDialog, AC editor | CRUD/formation/decomposition/drafts | Task-focused rendering, save/validation/result continuity |
| QualityWorkspace, validationService, requirementService | Checks/runs/reviews/quality/freshness | Task/scope filter, action mapping theo check/dependency |
| TraceabilityPanel, entityPath | Exact links và references | Same titles/IDs, contextual open và parent return |
| ConfirmationHandoff, các panel nội bộ | Customer/dev forms và document scope | Task adapters; không giả guards/baseline validity đầy đủ |
| documentService | CRD/DRD, default scope, devReadiness | Read existing results/reasons; show incomplete contracts |
| caseTransitions, AppContext | Reducer/commands/persistence | Không parallel workflow state; xem không dispatch |
| demoResetService, ResetDialog | Existing ownership/dependency reset | Derive lại task/context; không đổi reset semantics |
| GuidedDemo | Explanations/coach | Hợp nhất Explore, bỏ ngầm mutation; fixed scenes không task engine |

Có thể tách task rendering từ component lớn sau duyệt, giữ field validation và handlers. Không mount nguyên trang rồi giấu hàng loạt bằng CSS để giả task UI.

## 10. Migration strategy giữ nguyên business logic

1. Đóng băng domain contract/gates/authority/checks/scope/reset; ghi chênh lệch SRS/code thành dependency riêng.
2. Pure task selectors/capability mapping, unit fixtures từ canonical state; không persisted task completion.
3. Continue/Explore shell và default entry; supporting routes vẫn chạy, loại navigation cạnh tranh trong working mode.
4. Task adapters Context → Discovery/Evidence/Gap → Requirement/Quality → review/output; same entities/commands.
5. Parent return/result continuity, internal URLs và draft handling; advanced working routes được giữ.
6. Guided Demo thành coach/Explore; walkthrough không implicit fixture mutation.
7. Verify selectors, deep links, draft retention, read-only Explore, checkpoint parity, scope impact và reset trước rollout.
8. Reviewed-version validity, external blocker records hoặc issue granularity là domain extension được duyệt riêng, không lẫn UX migration.

Giữ React/Vite/TypeScript/Tailwind/Router/Context, Warm Workspace; không framework mới, backend/database/AI hoặc mockup mới trong lượt này.

## 11. Acceptance criteria có thể kiểm chứng

Đây là criteria cho implementation tương lai, không phải kết quả tests đã chạy.

| ID | Given / When | Expected |
|---|---|---|
| GW-01 | Open Case từ list/bare path | Continue có phù hợp task/reason; không bắt chọn workspace |
| GW-02 | Same state/intent/capabilities | Same candidates/recommendation, không random hoặc scene counter |
| GW-03 | Context chưa Ready, conflict tồn tại | Context prerequisite mặc định; conflict visible/alternate handling |
| GW-04 | Replay/currentStage cao, gate thiếu | Gate thiếu vẫn được xử lý, pointer không completion |
| GW-05 | Save response chưa verified | Result Evidence Pending/Unconfirmed, không auto Confirm |
| GW-06 | Conflict thiếu authority/basis | Resolve bị chặn có reason, exact prerequisite links |
| GW-07 | AC finding → sửa/save/check | Exact editor, result thật và return same task |
| GW-08 | Unknown vì source / judgment | Hai đường xử lý khác nhau, không cùng mở text editor |
| GW-09 | Upstream đổi | Impact đúng subset, không rewrite statement/clear approvals |
| GW-10 | Dirty draft, đổi task/mode/module | Preserve theo contract hoặc guard; không mất im lặng |
| GW-11 | A ready/confirmed, B chưa đủ | Scope riêng; không gắn whole Case Ready |
| GW-12 | Customer Changes Requested | Affected source/editor, preserve records, recheck/review đúng version |
| GW-13 | Ready but Blocked | Actual blocker/references/owner khi có; acknowledgment không Resolve |
| GW-14 | Version validity/capability thiếu | Chưa đủ cơ sở hoặc capability rõ, không complete giả |
| GW-15 | Explore/preview/Back/Forward | Không canonical diff/history/review/visited-state mutation |
| GW-16 | Supporting entity từ task rồi save/close | Return goal/entity/tab/scope; derive lại completion |
| GW-17 | Reset/archive/supersede target | Explain stale reference, không âm thầm đổi entity |
| GW-18 | Command bị từ chối | Input giữ; field/precondition error, không success giả |
| GW-19 | Entire/partial reset | Domain ownership giữ; task/origin evaluate lại |
| GW-20 | Accepted with Blocker | Không Implementation Unblocked/Case Completed |
| GW-21 | Ba modes | Một navigation chủ đạo mỗi mode; không full rail + workspace list cạnh tranh |
| GW-22 | Leader tự đi refund Case | Mỗi task trả lời đủ 7 câu hỏi mục tiêu; không nhớ IDs/chọn ngẫu nhiên |
| GW-23 | 1366×768 / 1440×900 | Goal/uncertainty/action tìm được; không horizontal overflow hoặc nested scroll phức tạp |
| GW-24 | Implementation xong | Gates/authority/quality/stale/scope/reset parity; chạy thực tế tests/typecheck/build |

User validation đề xuất: BA mới thực hiện Continue Case, xử lý conflict và sửa AC/recheck không được người dẫn chỉ trang/nút. Quan sát hiểu đúng next task, certainty và result. Không suy usability pass từ số badge/check Pass.

## 12. Những quyết định cần xác nhận trước implementation

Chỉ ba quyết định UX cần chốt:

| Decision | Đề xuất | Tác động |
|---|---|---|
| D1. Entry/navigation | Continue mặc định; Explore + Dữ liệu Case phụ; /overview redirect sau migration | Thay cách mở Case, giữ supporting deep links |
| D2. Mức tự dẫn dắt | Tự chọn task; sau mutation show Result rồi BA bấm Continue; cho actionable alternatives | Có guidance nhưng không auto-advance hoặc wizard cứng |
| D3. Guided Demo | Coach/Explore/task help; xem không mutate, làm thật chuyển Continue rõ | Bỏ scene navigation cạnh tranh và approval fixture ngầm |

Canonical state duy nhất, giữ business rules, một primary action và exact context return đã nằm trong yêu cầu, không cần duyệt lại.

**Dependency phạm vi cần chốt riêng:** implementation chỉ tích hợp capability hiện hành hay bao gồm hoàn thiện reviewed-version/snapshot validity, external dependency records và downstream authority/completion guards? Nếu không mở rộng domain, Continue phải trình bày giới hạn và các task chuẩn bị/Explore thay vì suy kết luận nghiệp vụ. Đây là quyết định phạm vi, không cosmetic preference.

### Tóm tắt kiến trúc

Continue là nơi BA làm việc theo task suy ra từ state; Explore là nơi xem quy trình; Dữ liệu Case để tra cứu/chỉnh sửa sâu. Một task canvas tái sử dụng component/service, giữ parent context trong vòng lặp và giải thích Result trước Next Step. Business progression chỉ do canonical commands/checkpoints quyết định. Đặc tả này hoàn tất phần thiết kế; chưa sửa ứng dụng hoặc thực hiện migration.
