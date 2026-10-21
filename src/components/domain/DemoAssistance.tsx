import type { WorkCase } from '../../types/case';
import { useApp } from '../../context/AppContext';
import { ContentSuggestion } from '../ui/ContentAssist';
import { suggestHypothesis } from '../../services/suggestionService';
import { proposeClarification } from '../../services/demoAssistService';
import { questions } from '../../data/questions';

export function ContextDirectionAssist({ workCase: c }: { workCase: WorkCase }) {
  const { update } = useApp();
  return <div className="panel-stack">
    {c.context.suggestionStatus === 'Accepted' && <p className="small">Hướng BA đã chọn: {c.context.hypothesis}</p>}
    <ContentSuggestion
      label="Gợi ý hướng Discovery"
      generate={async () => ({
        text: c.context.hypothesis || await suggestHypothesis(c.incomingRequest),
        reason: 'Dựa trên incoming request và bối cảnh hiện tại. BA chọn, sửa hoặc không dùng; chưa xác nhận thông tin nghiệp vụ.',
      })}
      onApply={text => {
        if (text === c.context.hypothesis) update(c.id, { type: 'suggestion', outcome: 'Accepted' });
        else update(c.id, { type: 'context', context: { ...c.context, hypothesis: text, suggestionStatus: 'Accepted' } });
      }}
      onReject={() => update(c.id, { type: 'suggestion', outcome: 'Rejected' })}
      appliedMessage="Đã ghi hướng Discovery BA lựa chọn. Review bối cảnh trước khi tiếp tục; chưa tự chuyển bước."
    />
    {c.context.suggestionStatus === 'Rejected' && <p className="small muted">BA có thể gợi ý lại và chỉnh nội dung thành hướng phù hợp trước khi review bối cảnh.</p>}
  </div>;
}

export function DiscoveryQuestionAssist({ workCase: c, questionId }: { workCase: WorkCase; questionId: string }) {
  const { update } = useApp();
  const q = questions.find(q => q.id === questionId);
  const gap = c.discovery.gaps.find(g => g.questionId === questionId);
  if (!q || !gap || gap.status === 'Resolved') return null;
  const owner = c.discovery.stakeholders.find(s => s.modules.includes(q.module));
  return <ContentSuggestion
    label="Gợi ý câu hỏi làm rõ"
    generate={() => {
      const suggestion = proposeClarification(c, questionId, q.question);
      return { ...suggestion, reason: `${suggestion.reason}${owner ? ` Đề nghị hỏi: ${owner.name}.` : ''}` };
    }}
    onApply={text => {
      if (!owner) throw new Error('Thêm stakeholder phụ trách module trước khi ghi câu hỏi làm rõ.');
      update(c.id, { type: 'clarify', gapId: gap.id, text, owner: owner.id });
    }}
    appliedMessage="Đã ghi câu hỏi vào clarification của Gap. Chờ stakeholder trả lời; chưa đóng Gap hay xác nhận Evidence."
  />;
}
