# Requirement Tool — Giai đoạn 3

Functional Interactive Prototype cho leader review, giữ UX Redesign V2 và Warm Workspace. Code chính tại `D:\RequirementTool`.

```powershell
Set-Location D:\RequirementTool
npm ci
npm run dev
```

Mở http://127.0.0.1:5173/cases/CASE-DEMO-001/overview. Dữ liệu và draft lưu localStorage của trình duyệt. React/Vite/TypeScript, Tailwind, React Router và Context/useReducer; không backend/database thật.

```powershell
npm run typecheck
npm test
npm run build
```

Đã có Requirement/AC editor, formation từ Discovery, module fields, CRUD/archive/decomposition, quality checklist và BA review, deterministic validation/findings, scoped Stale/impact/re-validation, extended traceability, Guided Demo thật cho Layer 2 và dependency reset. Customer/Dev workflows và output publication vẫn preview Stage 4.

Xem [DEMO_GUIDE.md](DEMO_GUIDE.md) để demo, [STAGE3_REPORT.md](STAGE3_REPORT.md) để xem verification và giới hạn. Ảnh/log kiểm chứng ở `review/stage3/`. Các báo cáo Stage 2/UX V2 vẫn được giữ làm lịch sử.

Business logic: `src/services/requirementService.ts`, `validationService.ts`, `caseTransitions.ts`, `demoResetService.ts`. Models: `src/types/requirement.ts`. Workspace: `src/components/domain/RequirementWorkspace.tsx`. Traceability: `TraceabilityPanel.tsx`. Tests: `stage2.test.ts` và `stage3.test.ts`.

Dừng tại Stage 3 để review trước Stage 4. Không tạo ZIP source code.
