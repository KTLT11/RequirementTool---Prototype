import type { WorkCase } from '../types/case';
import type { AcceptanceCriterion, Requirement, RequirementField } from '../types/requirement';

export interface ContentProposal { text: string; reason: string }

// Small, explicit demo checks. Never publishes Quality Ready or confirmation.
export function inspectDemoText(text: string): string[] {
  if (!text.trim()) return ['Chưa có nội dung. Bổ sung nội dung trước khi kiểm tra lại.'];
  const issues: string[] = [];
  const vague = text.match(/nhanh chóng|hợp lý|tốt nhất|phù hợp|dễ sử dụng/iu);
  if (vague) issues.push(`“${vague[0]}” chưa có tiêu chí kiểm chứng. Làm rõ kết quả hoặc điều kiện cụ thể; không tự thêm ngưỡng chưa được xác nhận.`);
  if (/14\s*\/\s*30|chưa xác minh|chưa có quyết định|cần xác minh|còn mâu thuẫn/iu.test(text))
    issues.push('Nội dung còn thông tin chưa chốt. Làm rõ nguồn/quyết định liên quan trước khi dùng làm yêu cầu đã xác nhận.');
  if (/\[[^\]]+\]/u.test(text)) issues.push('Còn phần trong ngoặc vuông cần BA bổ sung từ nguồn trước khi kiểm tra lại.');
  return issues;
}

export function proposeRequirement(r: Requirement): ContentProposal {
  const behavior = r.fields.behavior.trim() || r.statement.trim();
  const trigger = r.fields.trigger.trim();
  return {
    text: `${trigger ? `Khi ${trigger.charAt(0).toLowerCase() + trigger.slice(1)}, ` : '[Bổ sung trigger từ nguồn]. '}${behavior ? behavior.charAt(0).toLowerCase() + behavior.slice(1) : '[Bổ sung hành vi và kết quả từ Discovery].'}`,
    reason: 'Từ Trigger và Expected Behavior hiện có; giữ thông tin chưa chốt. Chấp nhận chỉ cập nhật bản nháp.',
  };
}

export function inspectRequirementComponents(r: Requirement, fields: RequirementField[]) {
  const errors: Partial<Record<RequirementField, string>> = {};
  for (const field of fields) {
    const required = ['need', 'behavior'].includes(field) ||
      (field === 'actor' && ['Process', 'Integration', 'Permission'].includes(r.module));
    if (required || r.fields[field].trim()) {
      const issues = inspectDemoText(r.fields[field]);
      if (issues.length) errors[field] = issues.join(' ');
    }
  }
  return errors;
}

export function proposeAc(a: AcceptanceCriterion, r: Requirement, field: 'condition' | 'outcome'): ContentProposal {
  const content = field === 'condition'
    ? a.condition.trim() || r.fields.trigger.trim()
    : a.outcome.trim() || r.fields.behavior.trim();
  return {
    text: content
      ? `${field === 'condition' ? 'Khi' : 'Hệ thống'} ${content.charAt(0).toLowerCase() + content.slice(1)}`
      : field === 'condition' ? '[Bổ sung điều kiện áp dụng từ nguồn].' : '[Bổ sung kết quả quan sát được từ requirement].',
    reason: 'Dùng nội dung AC/Requirement đang có làm điểm bắt đầu. BA sửa để khớp tình huống; hệ thống chưa xác nhận tính đúng nghiệp vụ hay coverage.',
  };
}

export function proposeClarification(c: WorkCase, questionId: string, question: string): ContentProposal {
  const gap = c.discovery.gaps.find(g => g.questionId === questionId);
  return {
    text: gap?.type === 'Conflict'
      ? `${question} Vui lòng xác nhận quyết định áp dụng và căn cứ khi các nguồn đang mâu thuẫn.`
      : `${question} Vui lòng cung cấp căn cứ và những trường hợp ngoại lệ cần lưu ý.`,
    reason: 'Gợi ý cách hỏi stakeholder từ câu hỏi/gap hiện tại, không tạo câu trả lời thay stakeholder. BA có thể sửa hoặc không dùng.',
  };
}
