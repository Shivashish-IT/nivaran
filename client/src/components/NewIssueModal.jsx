import { useEffect, useState } from 'react';
import { X } from 'lucide-react';

export default function NewIssueModal({ open, onClose, onCreate }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Facilities');
  const [priority, setPriority] = useState('Medium');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (!open) return;
    const onKey = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  const submit = async e => {
    e.preventDefault();
    if (title.trim().length < 5) { setError('Please enter a title with at least 5 characters.'); return; }
    if (description.trim().length < 12) { setError('Please add a little more detail so the team can help.'); return; }
    setSaving(true);
    setError('');
    try {
      await onCreate({ title: title.trim(), description: description.trim(), category, priority });
      setTitle(''); setDescription(''); setCategory('Facilities'); setPriority('Medium'); setError('');
    } catch (err) {
      setError(err.message || 'Could not save the issue. Please try again.');
    } finally {
      setSaving(false);
    }
  };
  return <div className="modal-backdrop" role="presentation" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
    <section className="modal-card" role="dialog" aria-modal="true" aria-labelledby="new-issue-title">
      <div className="modal-heading"><div><span className="eyebrow">WORKSPACE / ISSUES</span><h2 id="new-issue-title">Report a new issue</h2><p>Give your team the details they need to resolve it.</p></div><button className="icon-button" aria-label="Close dialog" onClick={onClose}><X size={20}/></button></div>
      <form onSubmit={submit} className="issue-form">
        <label>Issue title <span className="required">*</span><input autoFocus value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Projector not working in Room 204" maxLength={120}/></label>
        <label>Description <span className="required">*</span><textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Describe the issue, where it happened, and what you have tried..." rows={4} maxLength={3000}/></label>
        <div className="form-two-col"><label>Category<select value={category} onChange={e => setCategory(e.target.value)}><option>Facilities</option><option>IT Support</option><option>Maintenance</option><option>Administration</option><option>Other</option></select></label><label>Priority<select value={priority} onChange={e => setPriority(e.target.value)}><option>Low</option><option>Medium</option><option>High</option><option>Urgent</option></select></label></div>
        {error && <p className="form-error" role="alert">{error}</p>}
        <div className="modal-actions"><button type="button" className="button button-secondary" onClick={onClose} disabled={saving}>Cancel</button><button type="submit" className="button button-primary" disabled={saving}>{saving ? "Saving…" : "Submit issue"} {!saving && <span>→</span>}</button></div>
        <p className="demo-note">Your issue is saved to your organization workspace.</p>
      </form>
    </section>
  </div>;
}
