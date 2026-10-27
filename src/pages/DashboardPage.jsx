import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Files, CheckCircle2, Ban, XCircle, CalendarClock, ChevronDown, GitCompareArrows, ArrowRight } from 'lucide-react';
import './DashboardPage.css';

const dayKey = (date) => `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
const daysUntil = (value) => {
  if (!value) return null;
  const parsed = new Date(`${String(value).slice(0,10)}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return null;
  const today = new Date();
  const base = new Date(`${dayKey(today)}T12:00:00`);
  return Math.round((parsed-base)/86400000);
};
const actionable = c => !['Approved','Rejected','Blocked'].includes(c.status);
const reasonEntry = c => (c.audit || []).find(a => a.note && /reject/i.test(a.action || ''));
const revisions = c => (c.audit || []).filter(a => a.before && a.after);

export default function DashboardPage({contracts=[],user}) {
  const [openedReject,setOpenedReject] = useState(null);
  const [openedRework,setOpenedRework] = useState(null);
  const [dayFilter,setDayFilter] = useState(null);
  const stats = useMemo(()=>[
    {label:'Total Contracts',value:contracts.length,icon:Files,kind:'total',tab:'All'},
    {label:'Approved',value:contracts.filter(c=>c.status==='Approved').length,icon:CheckCircle2,kind:'approved',tab:'Approved'},
    {label:'Blocked',value:contracts.filter(c=>c.status==='Blocked').length,icon:Ban,kind:'blocked',tab:'Blocked'},
    {label:'Rejected',value:contracts.filter(c=>c.status==='Rejected').length,icon:XCircle,kind:'rejected',tab:'Rejected'},
  ],[contracts]);
  const overdue = contracts.filter(c=>actionable(c) && daysUntil(c.dueDate)!==null && daysUntil(c.dueDate)<0);
  const upcoming = [
    {label:'Today',from:0,to:0},
    {label:'Tomorrow',from:1,to:1},
    {label:'Next 7 Days',from:2,to:7}
  ].map(item=>({...item,items:contracts.filter(c=>actionable(c) && daysUntil(c.dueDate)!==null && daysUntil(c.dueDate)>=item.from && daysUntil(c.dueDate)<=item.to)}));
  const rejected = contracts.filter(c=>c.status==='Rejected').map(c=>({contract:c,entry:reasonEntry(c)})).sort((a,b)=>{
    const ad=Date.parse(a.entry?.timestamp||'')||0,bd=Date.parse(b.entry?.timestamp||'')||0;return bd-ad;
  }).slice(0,3);
  const reworked = contracts.filter(c=>(c.audit||[]).some(a=>/rework|revis/i.test(a.action||''))).slice(0,3);
  const selectedUpcoming = upcoming.find(d=>d.label===dayFilter);
  return <main className="dash-page">
    <header className="dash-welcome"><div><h1>Welcome back, {user?.name || 'Reviewer'} <span aria-hidden="true">👋</span></h1><p>Your contract review workspace</p></div></header>
    <section className="dash-stats" aria-label="Contract summary">{stats.map(s=>{const Icon=s.icon;return <Link to="/queue" state={{statusFilter:s.tab}} key={s.label} className={`dash-card dash-stat dash-${s.kind}`}><span className="dash-stat-title">{s.label}<Icon size={19}/></span><strong>{s.value}</strong><span className="dash-stat-line"/></Link>})}</section>
    <div className="dash-duo">
      <section className="dash-card dash-overdue"><div className="dash-section-title"><h2>Overdue Contracts</h2><span className="dash-alert-label">Action required</span></div><div className="dash-overdue-body"><div className="dash-ring" style={{'--dash-progress':overdue.length?'235':'0'}}><svg viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="48" className="dash-ring-track"/><circle cx="60" cy="60" r="48" className="dash-ring-progress"/></svg><div className="dash-ring-count"><strong>{overdue.length}</strong><small>OVERDUE</small></div></div><div className="dash-overdue-info"><strong>{overdue.length ? `${overdue.length} contract${overdue.length===1?'':'s'} past due` : 'All caught up'}</strong><p>Open contracts with missed review deadlines.</p><Link to="/queue" state={{overdueOnly:true}} className="dash-text-link">View contracts <ArrowRight size={15}/></Link></div></div></section>
      <section className="dash-card"><div className="dash-section-title"><h2>Deadline Watch</h2><CalendarClock size={19}/></div><p className="dash-muted">Upcoming review deadlines</p><div className="dash-deadline-grid">{upcoming.map(d=><button key={d.label} type="button" className={`dash-deadline ${dayFilter===d.label?'is-selected':''}`} onClick={()=>setDayFilter(dayFilter===d.label?null:d.label)} aria-pressed={dayFilter===d.label}><span>{d.label}</span><strong>{d.items.length}</strong></button>)}</div>{selectedUpcoming && <div className="dash-deadline-results">{selectedUpcoming.items.length?selectedUpcoming.items.slice(0,4).map(c=><Link key={c.id} to="/queue" state={{contractId:c.id}}>{c.title} <ArrowRight size={13}/></Link>):<span>No contracts due in this period.</span>}</div>}</section>
    </div>
    <section className="dash-card"><div className="dash-section-title"><div><h2>Recent Rejections</h2><p className="dash-muted">Select a contract to see why it was rejected</p></div><XCircle size={19} className="dash-reject-icon"/></div><div className="dash-accordion-list">{rejected.length?rejected.map(({contract:c,entry})=><div className="dash-accordion" key={c.id}><button className="dash-accordion-trigger" type="button" onClick={()=>setOpenedReject(openedReject===c.id?null:c.id)} aria-expanded={openedReject===c.id}><span><strong>{c.title}</strong><small>{c.id} · {c.supplier}</small></span><span className="dash-status">Rejected</span><ChevronDown size={17} className={openedReject===c.id?'dash-rotated':''}/></button>{openedReject===c.id && <div className="dash-accordion-content"><strong>Reason for rejection</strong><p>{entry?.note || 'No rejection reason recorded in the available audit history.'}</p>{entry?.by && <small>By {entry.by} · {entry.timestamp}</small>}</div>}</div>):<p className="dash-muted">No rejected contracts.</p>}</div></section>
    <section className="dash-card"><div className="dash-section-title"><div><h2>Rework Changes</h2><p className="dash-muted">View recorded changes after rework</p></div><GitCompareArrows size={19}/></div><div className="dash-accordion-list">{reworked.length?reworked.map(c=><div className="dash-accordion" key={c.id}><button type="button" className="dash-accordion-trigger" onClick={()=>setOpenedRework(openedRework===c.id?null:c.id)} aria-expanded={openedRework===c.id}><span><strong>{c.title}</strong><small>{c.id} · {c.status}</small></span><ChevronDown size={17} className={openedRework===c.id?'dash-rotated':''}/></button>{openedRework===c.id && <div className="dash-accordion-content">{revisions(c).length?revisions(c).map((r,i)=><div key={i} className="dash-compare"><div><strong>Before</strong><pre>{JSON.stringify(r.before,null,2)}</pre></div><div><strong>After</strong><pre>{JSON.stringify(r.after,null,2)}</pre></div></div>):<p>Rework was recorded, but no before/after snapshot is available yet.</p>}</div>}</div>):<p className="dash-muted">No rework contracts recorded yet.</p>}</div></section>
  </main>;
}
