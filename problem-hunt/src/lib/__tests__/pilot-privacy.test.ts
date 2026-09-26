import {beforeEach,expect,it,vi} from 'vitest';
import {pilotCounts,setPilotConsent,recordPilotMetric,recordPilotVisit} from '../pilot-privacy';
import {privateErrorEvent} from '../monitoring-privacy';
beforeEach(()=>{const data=new Map<string,string>();vi.stubGlobal('localStorage',{getItem:(k:string)=>data.get(k)??null,setItem:(k:string,v:string)=>data.set(k,v),removeItem:(k:string)=>data.delete(k),clear:()=>data.clear(),get length(){return data.size;}});vi.useRealTimers();});
it('records nothing by default; consent stores only counts and opt-out deletes everything',()=>{
 recordPilotMetric('searches');expect(localStorage.length).toBe(0);setPilotConsent(true);recordPilotMetric('searches');recordPilotMetric('publishedProblems');recordPilotMetric('solutions');
 expect(Object.values(pilotCounts().days)[0]).toEqual({searches:1,publishedProblems:1,solutions:1});setPilotConsent(false);expect(localStorage.length).toBe(0);
});
it('counts later-day return visits once and prunes old days',()=>{
 vi.useFakeTimers();vi.setSystemTime(new Date('2026-01-01'));setPilotConsent(true);recordPilotVisit();recordPilotMetric('searches');
 vi.setSystemTime(new Date('2026-02-10'));recordPilotVisit();recordPilotVisit();expect(pilotCounts().days['2026-01-01']).toBeUndefined();expect(pilotCounts().days['2026-02-10'].returnVisits).toBe(1);vi.useRealTimers();
});
it('monitoring allowlist strips user content, request URLs and query strings',()=>{
 const event={event_id:'event',user:{email:'private@example.invalid'},request:{url:'https://example.invalid/?q=secret'},breadcrumbs:[{message:'private draft'}],exception:{values:[{type:'TypeError',value:'password=secret',stacktrace:{frames:[{filename:'https://example.invalid/assets/app-123.js?token=secret',lineno:3}]}}]}};
 const output=JSON.stringify(privateErrorEvent(event));expect(output).not.toMatch(/secret|password|private|example.invalid\/\?/);expect(output).toContain('app-123.js');
});
