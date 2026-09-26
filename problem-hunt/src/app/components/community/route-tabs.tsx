import {Link} from 'react-router';
import type {LucideIcon} from 'lucide-react';
export function RouteTabs({label,items}:{label:string;items:{label:string;to:string;active:boolean;icon:LucideIcon}[]}) {
 return <nav aria-label={label} className="community-tabs" onKeyDown={e=>{
  if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;
  const links=Array.from(e.currentTarget.querySelectorAll<HTMLAnchorElement>('a'));
  const i=links.indexOf(document.activeElement as HTMLAnchorElement);if(i<0)return;
  e.preventDefault();links[e.key==='Home'?0:e.key==='End'?links.length-1:(i+(e.key==='ArrowRight'?1:-1)+links.length)%links.length]?.focus();
 }}>{items.map(({label,to,active,icon:Icon})=><Link key={label} to={to} aria-current={active?'page':undefined} className={`community-tab ${active?'is-active':''}`}><span className="community-icon"><Icon size={17} aria-hidden="true"/></span>{label}</Link>)}</nav>;
}
