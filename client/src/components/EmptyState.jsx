import { ClipboardList } from 'lucide-react';
export default function EmptyState({ title, description }) {
  return <div className="page-empty"><div className="empty-state-icon"><ClipboardList size={24}/></div><h2>{title}</h2><p>{description}</p></div>;
}
