import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { ContentProposal } from '../../services/demoAssistService';
import { inspectDemoText } from '../../services/demoAssistService';
import { Button, Textarea } from './primitives';
import { SuggestionTag } from './SuggestionTag';

export function ContentSuggestion({ generate, onApply, onReject, label = 'Gợi ý nội dung', appliedMessage = 'Đã đưa gợi ý vào bản nháp. BA có thể tiếp tục sửa và kiểm tra.' }: {
  generate: () => ContentProposal | Promise<ContentProposal>;
  onApply: (text: string) => void;
  onReject?: () => void;
  label?: string;
  appliedMessage?: string;
}) {
  const [proposal, setProposal] = useState<ContentProposal | null>(null);
  const [draft, setDraft] = useState('');
  const [status, setStatus] = useState<'Awaiting BA Review' | 'Accepted' | 'Rejected'>('Awaiting BA Review');
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [modified, setModified] = useState(false);
  useEffect(() => {
    let active = true;
    setBusy(true);
    Promise.resolve().then(generate).then(next => {
      if (active) { setProposal(next); setDraft(next.text); }
    }).catch(e => { if (active) setError((e as Error).message); })
      .finally(() => { if (active) setBusy(false); });
    return () => { active = false; };
    // Each entity mounts its own proposal; editing never auto-applies it.
  }, []);
  const request = async () => {
    setBusy(true); setError('');
    try {
      const next = await generate();
      setProposal(next); setDraft(next.text); setStatus('Awaiting BA Review'); setEditing(false); setModified(false);
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  };
  const apply = () => {
    try {
      onApply(draft); setStatus('Accepted'); setEditing(false); setError('');
    } catch (e) { setError((e as Error).message); }
  };
  return <div className="content-assist">
    {!proposal ? <Button variant="secondary" size="small" disabled={busy} onClick={request}>{busy ? 'Đang tạo gợi ý…' : `${label} · mô phỏng`}</Button> :
      <SuggestionTag label="Hệ thống gợi ý · mô phỏng" status={status} reason={status === 'Awaiting BA Review' ? proposal.reason : undefined}>
        {status === 'Awaiting BA Review' ? <>
          {editing ? <Textarea label="Chỉnh sửa gợi ý trước khi áp dụng" value={draft} onChange={e => { setDraft(e.target.value); setModified(true); }} /> : <p className="proposal-text">{draft}</p>}
          <div className="action-row">
            <Button size="small" disabled={!draft.trim()} onClick={apply}>{editing || modified ? 'Áp dụng bản đã sửa' : 'Chấp nhận gợi ý'}</Button>
            {!editing && <Button variant="secondary" size="small" onClick={() => setEditing(true)}>Chỉnh sửa gợi ý</Button>}
            <Button variant="ghost" size="small" onClick={() => {
              try { onReject?.(); setStatus('Rejected'); setEditing(false); setError(''); }
              catch (e) { setError((e as Error).message); }
            }}>Không dùng</Button>
          </div>
          <p className="small muted">Gợi ý chưa được áp dụng. BA quyết định trước khi nội dung thay đổi.</p>
        </> : <div className="proposal-receipt">
          <p role="status">{status === 'Accepted' ? appliedMessage : 'Đã bỏ qua gợi ý. Nội dung đang làm giữ nguyên.'}</p>
          <Button variant="ghost" size="small" disabled={busy} onClick={request}>Gợi ý lại</Button>
        </div>}
      </SuggestionTag>}
    {error && <p className="field-error" role="alert">{error}</p>}
  </div>;
}

export function AssistedTextarea({ label, value, onChange, propose, rows = 3, inspect = inspectDemoText }: {
  label: string; value: string; onChange: (value: string) => void;
  propose: () => ContentProposal; rows?: number; inspect?: (text: string) => string[];
}) {
  return <ReviewableTextarea label={label} value={value} onChange={onChange} inspect={inspect} rows={rows}>
    <ContentSuggestion generate={propose} onApply={onChange} />
  </ReviewableTextarea>;
}

export function ReviewableTextarea({ label, value, onChange, inspect = inspectDemoText, rows = 3, children }: {
  label: string; value: string; onChange: (value: string) => void;
  inspect?: (text: string) => string[]; rows?: number; children?: ReactNode;
}) {
  const [review, setReview] = useState<{ text: string; issues: string[] } | null>(null);
  const current = review?.text === value;
  const error = current ? review?.issues.join(' ') : undefined;
  return <section className={`assisted-field ${error ? 'has-review-error' : ''}`} aria-label={`Hỗ trợ ${label}`}>
    <Textarea label={label} rows={rows} value={value} error={error} onChange={e => onChange(e.target.value)} />
    <div className="assist-controls">
      {children}
      <Button variant="secondary" size="small" onClick={() => setReview({ text: value, issues: inspect(value) })}>Kiểm tra nội dung</Button>
    </div>
    {review && <p className={`assist-review ${current && !error ? 'review-pass' : ''}`} role="status">
      {!current ? 'Nội dung đã thay đổi. Bấm Kiểm tra nội dung để kiểm tra lại.' : error ? 'Cần sửa tại trường được đánh dấu ở trên.' : '✓ Đạt kiểm tra nội dung demo.'}
    </p>}
  </section>;
}
