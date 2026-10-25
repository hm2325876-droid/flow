import {useEffect,useRef,useState} from 'react';
import {ArrowDown,Check,CheckCircle2,ChevronDown,HelpCircle,ListTodo,Loader2,LockKeyhole,MessageSquare,Minus,ShieldCheck,Square,Terminal} from 'lucide-react';
import {validateAuditAnswer,type AuditAnswer,type AuditQuestion,type AuditSnapshot} from '@flowproof/contracts';
import {Button} from './components/ui/button';
import {auditElapsed,auditIsActive,auditStatusLabel,orderedAuditEvents} from './audit-view';

export type UserAuditAnswer=Omit<AuditAnswer,'secretRef'>;
type AnswerHandler=(answer:UserAuditAnswer)=>Promise<boolean>;
export function QuestionCard({question,onAnswer,reveal=0}:{question:AuditQuestion;onAnswer:AnswerHandler;reveal?:number}){
 const [minimized,setMinimized]=useState(false),[values,setValues]=useState<string[]>([]),[text,setText]=useState(''),[sensitive,setSensitive]=useState(question.kind==='secret'),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const card=useRef<HTMLDivElement>(null);
 useEffect(()=>{setMinimized(false);const timer=setTimeout(()=>{card.current?.scrollIntoView({block:'nearest'});card.current?.querySelector<HTMLElement>('[data-question-text],[data-question-option],[data-question-submit]')?.focus();},0);return()=>clearTimeout(timer);},[question.id,reveal]);
 function choose(value:string){setError('');setValues(previous=>question.kind==='single'?[value]:previous.includes(value)?previous.filter(item=>item!==value):[...previous,value]);}
 async function submit(skipped=false){
  const answer:UserAuditAnswer=skipped?{outcome:'skipped'}:question.kind==='single'||question.kind==='multiple'?{outcome:'answered',values}:{outcome:'answered',text,sensitive:question.kind==='secret'||sensitive};
  const invalid=validateAuditAnswer(question,answer);if(invalid){setError(invalid);return;}
  setBusy(true);setError('');try{if(await onAnswer(answer)){setText('');setValues([]);}else setError('This answer was not accepted. Check the current question and retry.');}catch{setError('The desktop could not accept this answer. Your audit is still waiting.');}finally{setBusy(false);}
 }
 function minimize(){if(sensitive||question.kind==='secret')setText('');setMinimized(true);}
 function reopen(){setMinimized(false);setTimeout(()=>card.current?.querySelector<HTMLElement>('[data-question-text],[data-question-option],[data-question-submit]')?.focus(),0);}
 return <div className="question-card" data-question-card data-question-id={question.id} ref={card} aria-label="Pending agent question">
  <div className="question-heading"><span><MessageSquare size={13}/>{question.operationId?'ONE-OPERATION PERMISSION':'YOUR INPUT IS NEEDED'}</span><Button variant="ghost" size="icon" aria-label={minimized?'Open pending question':'Minimize pending question'} disabled={busy} onClick={()=>minimized?reopen():minimize()}>{minimized?<ChevronDown size={14}/>:<Minus size={14}/>}</Button></div>
  {minimized?<div className="question-minimized"><span>Still awaiting your answer. No action has been authorized.</span><Button variant="outline" size="sm" onClick={reopen}>Answer pending question</Button></div>:<form onSubmit={e=>{e.preventDefault();void submit();}}>
   <p className="question-prompt">{question.prompt}</p>
   {(question.kind==='single'||question.kind==='multiple')?<fieldset className="question-options" disabled={busy}><legend className="sr-only">{question.kind==='single'?'Choose one answer':'Choose applicable answers'}</legend>{question.options?.map(option=><label className="question-option" key={option}><input data-question-option type={question.kind==='single'?'radio':'checkbox'} name={`question-${question.id}`} value={option} checked={values.includes(option)} onChange={()=>choose(option)}/><span>{option}</span></label>)}</fieldset>:question.kind==='secret'||sensitive?<input className="question-text" data-question-text type="password" autoComplete="off" spellCheck={false} aria-label="Sensitive answer" value={text} maxLength={question.max??2000} disabled={busy} onChange={e=>{setText(e.target.value);setError('');}} placeholder="Enter privately for this operation"/>:<textarea className="question-text" data-question-text aria-label="Answer the agent" rows={3} value={text} maxLength={question.max??2000} disabled={busy} onChange={e=>{setText(e.target.value);setError('');}} placeholder="Answer this specific question"/>}
   {question.kind==='multiple'&&<p className="question-meta">Choose {question.min??(question.required?1:0)}–{question.max??question.options?.length} options.</p>}
   {question.kind==='text'&&<label className="question-private"><input type="checkbox" checked={sensitive} disabled={busy} onChange={e=>setSensitive(e.target.checked)}/>Treat this answer as sensitive</label>}
   {(question.kind==='secret'||sensitive)&&<p className="question-sensitive-note"><LockKeyhole size={12}/>Kept out of activity and history. Used only through a temporary operation reference.</p>}
   {question.operationId&&<p className="question-meta">Approval applies once to this exact eligible operation. Deny never grants permission.</p>}
   {error&&<p className="question-error" role="alert">{error}</p>}
   <div className="question-actions"><span><LockKeyhole size={11}/><small className="question-meta">Execution waits for a valid answer.</small></span><span>{question.allowSkip&&!question.operationId&&<Button type="button" data-question-skip size="sm" variant="ghost" disabled={busy} onClick={()=>void submit(true)}>Skip</Button>}<Button data-question-submit size="sm" type="submit" disabled={busy}>{busy?<Loader2 size={12} className="spin"/>:<Check size={12}/>}Submit answer</Button></span></div>
  </form>}
 </div>;
}

export function AuditFeed({audit,onAnswer,reveal=0}:{audit:AuditSnapshot;onAnswer:AnswerHandler;reveal?:number}){
 const scroll=useRef<HTMLDivElement>(null),follow=useRef(true);const [latest,setLatest]=useState(true),[now,setNow]=useState(Date.now());
 const events=orderedAuditEvents(audit.events),active=auditIsActive(audit);
 useEffect(()=>{if(!active)return;const timer=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(timer);},[active]);
 useEffect(()=>{if(follow.current&&scroll.current)scroll.current.scrollTop=scroll.current.scrollHeight;},[events.at(-1)?.seq]);
 return <section className="feed panel" aria-label="Agent activity">
  <div className="panel-heading"><span><Terminal size={16}/>Agent activity</span><span className={`audit-state ${!active?'terminal':audit.question?'needs-input':''}`} data-audit-status>{auditStatusLabel(audit.status)}</span></div>
  <div className="audit-activity" ref={scroll} onScroll={()=>{const element=scroll.current;if(!element)return;follow.current=element.scrollHeight-element.scrollTop-element.clientHeight<65;setLatest(follow.current);}}>
   {!events.length&&<div className="panel-empty"><Loader2 className="spin" size={23}/><h3>Preparing the audit</h3><p>Runtime events will appear as work happens.</p></div>}
   {events.map(event=><article className={`audit-event ${/failed|interrupted|blocked/.test(event.type)?'event-error':/completed/.test(event.type)?'event-complete':''}`} key={`${event.auditId}:${event.seq}`} data-audit-event data-event-seq={event.seq} data-event-type={event.type}>
    <div className="audit-event-top"><span className="audit-event-kind">{event.type.replaceAll('-',' ')}</span><time dateTime={event.at}>{new Date(event.at).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit',second:'2-digit'})}</time></div><p>{event.summary}</p>{event.details&&<details><summary>Execution details</summary><pre>{event.details}</pre></details>}{event.actionId&&<div className="audit-event-meta">Action {event.actionId.slice(0,8)} · event {event.seq}</div>}
   </article>)}
   {audit.question&&active&&<QuestionCard key={audit.question.id} question={audit.question} onAnswer={onAnswer} reveal={reveal}/>}
   {!active&&<div className={`audit-result ${audit.status}`} role="status"><h3>{auditStatusLabel(audit.status)}</h3><p>{audit.reason??'Execution finished. Review the recorded activity and coverage.'}</p><small>Only recorded actions are evidence. Candidate observations remain unverified; full findings verification and saved reports belong to the next slice.</small></div>}
  </div>
  <div className="audit-usage"><span>{audit.usage.modelCalls}/{audit.config.maxSteps} model calls · {audit.usage.browserActions} browser actions</span><span className="audit-budget-time">{auditElapsed(audit,now)} / {audit.config.timeoutMinutes} min</span><span>Tokens {audit.usage.inputTokens===null||audit.usage.outputTokens===null?'unavailable':`${audit.usage.inputTokens} in / ${audit.usage.outputTokens} out`} · cost unavailable</span></div>
  <div className="feed-bottom audit-feed-note"><span><ShieldCheck size={13}/>Actual operations and observed results.</span>{!latest&&<Button size="sm" variant="ghost" onClick={()=>{if(scroll.current)scroll.current.scrollTop=scroll.current.scrollHeight;follow.current=true;setLatest(true);}}>Latest <ArrowDown size={12}/></Button>}</div>
 </section>;
}

export function AuditTodos({audit}:{audit:AuditSnapshot}){
 return <section className="todos panel audit-todos" aria-label="Dynamic audit plan"><div className="panel-heading"><span><ListTodo size={16}/>Audit plan</span><span className="small-label">{audit.todos.filter(t=>t.status==='completed').length} / {audit.todos.length} completed</span></div>{audit.todos.length?<ol className="audit-todo-list">{audit.todos.map(todo=><li className={`audit-todo ${todo.status}`} key={todo.id} data-audit-todo data-todo-id={todo.id} data-todo-status={todo.status}><span className="audit-todo-marker">{todo.status==='completed'?<CheckCircle2 size={13}/>:todo.status==='in-progress'?<Loader2 size={13} className="spin"/>:todo.status==='blocked'?<HelpCircle size={13}/>:<Square size={12}/>}</span><div><strong>{todo.description}</strong><small>{todo.status.replaceAll('-',' ')}{todo.evidence.length?` · ${todo.evidence.length} action reference${todo.evidence.length===1?'':'s'}`:''}</small></div></li>)}</ol>:<div className="todo-empty"><span className="empty-check"/><div><strong>No plan has been emitted yet</strong><p>Tasks appear only when the agent creates them.</p></div></div>}</section>;
}

export function AuditCandidates({audit}:{audit:AuditSnapshot}){
 return <div className="findings-empty"><div className="page-heading"><span className="eyebrow">OBSERVATIONS FROM THIS AUDIT</span><h1>Candidate issues</h1><p className="candidate-boundary">These observations reference real activity. They are not Verified Findings; independent reproduction, reporting and persistent history remain Slice 4.</p></div>{audit.candidates.length?<div className="candidate-list">{audit.candidates.map(candidate=><article className="audit-candidate" key={candidate.id}><span>Unverified candidate</span><h3>{candidate.title}</h3><p>{candidate.observation}</p><small>Referenced actions: {candidate.actionIds.map(id=>id.slice(0,8)).join(', ')}</small></article>)}</div>:<div className="panel-empty"><HelpCircle size={25}/><h3>No candidate issues recorded</h3><p>This is not a claim that the application has no defects.</p></div>}</div>;
}
