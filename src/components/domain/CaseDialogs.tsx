import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Modal } from "../ui/Overlay";
import { Button, TextInput, Textarea, Select } from "../ui/primitives";
import { useApp } from "../../context/AppContext";
import { useToast } from "../ui/Toast";
import { casePath } from "../../app/navigation";
import { stageOrder, stageLabels } from "../../data/cases";
import { resetImpact } from "../../services/demoResetService";
import type { WorkCase, Stage } from "../../types/case";
export function CaseForm({
  workCase,
  onClose,
}: {
  workCase?: WorkCase;
  onClose: () => void;
}) {
  const [name, setName] = useState(workCase?.name ?? "");
  const [request, setRequest] = useState(workCase?.incomingRequest ?? "");
  const [error, setError] = useState("");
  const { create, update } = useApp();
  const navigate = useNavigate();
  const toast = useToast();
  const save = () => {
    try {
      if (workCase) update(workCase.id, { type: "edit", name, request });
      else {
        const id = create(name, request);
        navigate(casePath(id));
      }
      toast(workCase ? "Đã cập nhật Case." : "Đã tạo Case.");
      onClose();
    } catch (e) {
      setError((e as Error).message);
    }
  };
  return (
    <Modal
      open
      title={workCase ? "Chỉnh sửa Case" : "Tạo Case"}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Hủy
          </Button>
          <Button onClick={save}>Lưu Case</Button>
        </>
      }
    >
      <div className="form-stack">
        <TextInput
          label="Tên Case"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={180}
        />
        <Textarea
          label="Incoming Request"
          value={request}
          onChange={(e) => setRequest(e.target.value)}
          rows={5}
        />
        {error && (
          <p className="field-error" role="alert">
            {error}
          </p>
        )}
      </div>
    </Modal>
  );
}
export function ResetDialog({
  workCase,
  onClose,
}: {
  workCase: WorkCase;
  onClose: () => void;
}) {
  const [type, setType] = useState("entire");
  const [selected, setSelected] = useState<Stage>("discovery");
  const { update } = useApp();
  const toast = useToast();
  const navigate = useNavigate();
  const stage = type === "entire" ? "incoming" : selected;
  const impact = resetImpact(stage);
  return (
    <Modal
      open
      title="Reset Demo"
      description={workCase.id}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              update(workCase.id, { type: "reset", stage });
              toast(`Đã reset từ ${stageLabels[stage]}.`);
              onClose();
              navigate(casePath(workCase.id, "continue"));
            }}
          >
            Confirm Reset
          </Button>
        </>
      }
    >
      <div className="form-stack">
        <Select
          label="Reset Type"
          value={type}
          onChange={(e) => setType(e.target.value)}
        >
          <option value="entire">Reset Entire Demo</option>
          <option value="stage">Reset From Selected Workflow Stage</option>
        </Select>
        {type === "stage" && (
          <Select
            label="Workflow Stage"
            value={selected}
            onChange={(e) => setSelected(e.target.value as Stage)}
          >
            {stageOrder.map((s) => (
              <option key={s} value={s}>
                {stageLabels[s]}
              </option>
            ))}
          </Select>
        )}
        <div className="reset-impact">
          <h3>Preserved</h3>
          <p>
            {impact.preserved.join(" · ") ||
              "Case ID và lịch sử thao tác; các Case khác không thay đổi."}
          </p>
          <h3>Reset</h3>
          <p>
            {type === "entire"
              ? "Toàn bộ dữ liệu kịch bản của Case này."
              : impact.reset}
          </p>
          <h3>Downstream affected</h3>
          <p>{impact.downstream.join(" · ") || "Không có bước downstream."}</p>
          <p>
            Những preview phụ thuộc sẽ quay về baseline hoặc cần review lại. Xác
            nhận khách hàng không được tự tạo.
          </p>
        </div>
      </div>
    </Modal>
  );
}
