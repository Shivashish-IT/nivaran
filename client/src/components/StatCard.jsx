const accentClass = { blue: 'stat-card-blue', amber: 'stat-card-amber', teal: 'stat-card-green', green: 'stat-card-green', violet: 'stat-card-rose', rose: 'stat-card-rose' };

export default function StatCard({ label, value, tone = 'blue', note }) {
  const cardClass = accentClass[tone] || 'stat-card-blue';
  return <article className={`stat-card stat-card-minimal ${cardClass}`}>
    <div className="stat-label">{label}</div>
    <div className="stat-value">{value}</div>
    <div className="stat-note">{note}</div>
  </article>;
}
