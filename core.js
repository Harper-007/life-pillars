(function(root){
  'use strict';
  const dateOK=s=>{if(typeof s!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(s))return false;const d=new Date(s+'T12:00:00Z');return !Number.isNaN(d.getTime())&&d.toISOString().slice(0,10)===s;};
  const cents=v=>{const n=Number(v);if(!Number.isFinite(n)||n<0||n>1e9)throw Error('请输入有效的非负金额');return Math.round(n*100);};
  const shift=(s,n)=>{if(!dateOK(s))throw Error('日期无效');const d=new Date(s+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10);};
  const week=s=>{const d=new Date(s+'T12:00:00Z');return shift(s,-((d.getUTCDay()+6)%7));};
  function budget(plan,day){
    const income=cents(plan.income),saving=cents(plan.saving),fixed=cents(plan.fixed),reward=cents(plan.reward),weekly=cents(plan.weekly);
    if(saving+fixed+reward>income)throw Error('储蓄、固定支出与奖励池合计不能超过月收入');
    const days=new Date(Number(day.slice(0,4)),Number(day.slice(5,7)),0).getDate();
    const flexible=Math.min(income-saving-fixed-reward,Math.floor(weekly*days/7));
    return {income,saving,fixed,reward,weekly,flexible,spend:fixed+reward+flexible,buffer:income-saving-fixed-reward-flexible};
  }
  function totals(txs,start,end){
    const result={out:0,income:0,variable:0,reward:0,categories:{}};
    for(const t of txs){if(!dateOK(t.date)||t.date<start||t.date>end)continue;const n=cents(t.amt);
      if(t.type==='in'){result.income+=n;continue;}if(t.type!=='out')continue;
      result.out+=n;result.categories[t.cat]=(result.categories[t.cat]||0)+n;
      if(!t.fixed&&t.cat!=='居住')result.variable+=n;if(t.reward)result.reward+=n;
    }return result;
  }
  function eventFor(item){
    const start=dateOK(item.start)?item.start:dateOK(item.due)?item.due:dateOK(item.end)?item.end:'';
    const end=dateOK(item.end)?item.end:dateOK(item.due)?item.due:start;
    if(!start)return null;if(end<start)throw Error('截止日期不能早于开始日期');
    return {...item,start,end,taskId:item.id,detail:item.source||''};
  }
  function icsDate(raw,params){
    const m=raw.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?(Z)?)?$/);
    if(!m)throw Error('日历日期格式不支持');
    const day=`${m[1]}-${m[2]}-${m[3]}`;if(!dateOK(day))throw Error('日历日期无效');
    if(!m[4])return {day,allDay:true};
    if(Number(m[4])>23||Number(m[5])>59||Number(m[6]||0)>59)throw Error('日历时间无效');
    const tz=(params.match(/TZID=([^;:]+)/i)||[])[1];
    if(tz&&!['Asia/Shanghai','Asia/Hong_Kong','Asia/Chongqing','Etc/GMT-8','UTC','GMT'].includes(tz))throw Error('暂不支持该日历时区，请转换为北京时间或UTC');
    const utc=!!m[7]||['UTC','GMT'].includes(tz);
    const iso=`${day}T${m[4]}:${m[5]}:${m[6]||'00'}${utc?'Z':'+08:00'}`;
    const d=new Date(iso);if(Number.isNaN(d.getTime()))throw Error('日历时间无效');
    return {day:new Date(d.getTime()+8*3600000).toISOString().slice(0,10),allDay:false,iso};
  }
  function parseICS(text){
    if(typeof text!=='string'||text.length>2e6||!text.includes('BEGIN:VCALENDAR'))throw Error('请选择有效的ICS日历文件（不超过2MB）');
    const blocks=text.replace(/\r?\n[ \t]/g,'').match(/BEGIN:VEVENT[\s\S]*?END:VEVENT/g)||[];
    const items=[],warnings=[];
    const decode=s=>s.replace(/\\[nN]/g,'\n').replace(/\\([,;\\])/g,'$1');
    for(const block of blocks){try{
      const fields={};for(const line of block.split(/\r?\n/)){const i=line.indexOf(':');if(i<0)continue;const key=line.slice(0,i);fields[key.split(';')[0]]={value:line.slice(i+1),params:key};}
      if(fields.RRULE||fields['RECURRENCE-ID']||fields.RDATE||fields.EXDATE){warnings.push('跳过重复事件，请在BB中核对');continue;}
      if(!fields.UID||!fields.DTSTART||!fields.SUMMARY)throw Error('缺少UID、名称或开始日期');
      const start=icsDate(fields.DTSTART.value,fields.DTSTART.params),finish=fields.DTEND?icsDate(fields.DTEND.value,fields.DTEND.params):start;
      let end=finish.day;if(start.allDay&&fields.DTEND)end=shift(end,-1);if(end<start.day||(!start.allDay&&finish.iso&&new Date(finish.iso)<new Date(start.iso)))throw Error('事件结束早于开始');
      items.push({uid:fields.UID.value,title:decode(fields.SUMMARY.value).slice(0,500),start:start.day,end,due:end,startAt:start.iso||'',endAt:finish.iso||'',cancelled:fields.STATUS?.value==='CANCELLED',sequence:fields.SEQUENCE?.value||'0',modified:fields['LAST-MODIFIED']?.value||'',source:'BB日历导入'});
    }catch(e){warnings.push(e.message);}}
    if(!items.length&&!warnings.length)throw Error('文件没有可导入的事件');return {items,warnings};
  }
  function mergeICS(existing,incoming,now){
    const result=existing.map(x=>({...x}));let added=0,changed=0;
    for(const x of incoming){const at=result.findIndex(y=>y.bbUID===x.uid);
      if(at>=0){const old=result[at];const oldSeq=Number(old.sequence),newSeq=Number(x.sequence);
        if(Number.isFinite(oldSeq)&&Number.isFinite(newSeq)&&newSeq<oldSeq)continue;
        if(old.modified&&x.modified&&x.modified<old.modified)continue;
        const diff=['title','start','end','startAt','endAt','cancelled'].some(k=>old[k]!==x[k]);
        result[at]={...old,...x,bbUID:x.uid,lastSeen:now,source:'BB日历导入',needsReview:old.needsReview||diff};if(diff)changed++;
      }else if(!x.cancelled){result.push({...x,id:'bb-'+Math.random().toString(36).slice(2)+Date.now(),bbUID:x.uid,section:'assignment',type:'assignment',lastSeen:now,needsReview:true});added++;}
    }return {items:result,added,changed};
  }
  function normalize(data,defaults){
    if(!data||typeof data!=='object'||Array.isArray(data)||!data.tasks||!data.money)throw Error('不是支点备份文件');
    const s=JSON.parse(JSON.stringify(defaults));
    Object.assign(s,data);s.tasks={...defaults.tasks,...data.tasks};s.money={...defaults.money,...data.money};s.streak={...defaults.streak,...data.streak};
    for(const key of ['checks','mood','body','plan','boardDone','boardOverrides','dailyTasks','reviews','activities','civilLogs'])if(!s[key]||typeof s[key]!=='object'||Array.isArray(s[key]))s[key]={};
    for(const key of ['boardCustom'])if(!Array.isArray(s[key]))s[key]=[];
    if(!Array.isArray(s.money.txs))throw Error('流水数据格式不正确');
    for(const tx of s.money.txs){if(!tx||!/^[\w-]+$/.test(tx.id)||!dateOK(tx.date)||!['out','in'].includes(tx.type))throw Error('流水日期或类型无效');cents(tx.amt);}
    if(s.money.plan){budget(s.money.plan,'2026-10-15');for(const v of Object.values(s.money.plan.caps||{}))cents(v);}
    if(s.money.vault){let balance=0;if(!Array.isArray(s.money.vault))throw Error('小金库数据无效');for(const v of s.money.vault){if(!dateOK(v.date)||!['in','out'].includes(v.type))throw Error('小金库记录无效');balance+=(v.type==='in'?1:-1)*cents(v.amt);if(balance<0)throw Error('小金库余额不能为负');}}
    if(!s.money.rewards||typeof s.money.rewards!=='object'||Array.isArray(s.money.rewards))s.money.rewards={};
    for(const taskList of Object.values(s.tasks))if(!Array.isArray(taskList)||taskList.some(t=>!t||!/^[\w-]+$/.test(t.id)||typeof t.txt!=='string'))throw Error('任务格式无效');
    const validId=id=>typeof id==='string'&&/^[\w-]+$/.test(id);
    const checkBoard=o=>{if(o.type!=null&&!['assignment','study','exam','project','capstone','school'].includes(o.type))throw Error('看板分类无效');for(const k of ['start','end','due'])if(o[k]&&!dateOK(o[k]))throw Error('看板日期无效');eventFor(o);};
    for(const [day,lists] of Object.entries(s.dailyTasks)){if(!dateOK(day)||!lists||typeof lists!=='object')throw Error('每日任务日期无效');for(const list of Object.values(lists))if(!Array.isArray(list)||list.some(t=>!t||!validId(t.id)||typeof t.txt!=='string'))throw Error('每日任务格式无效');}
    for(const [day,list] of Object.entries(s.activities))if(!dateOK(day)||!Array.isArray(list)||list.some(x=>!x||!validId(x.id)||typeof x.title!=='string'||!Number.isInteger(x.minutes)||x.minutes<1||x.minutes>1440||typeof x.area!=='string'||(x.outcome!=null&&typeof x.outcome!=='string')))throw Error('实际完成记录无效');
    for(const [day,r] of Object.entries(s.reviews))if(!dateOK(day)||!r||typeof r!=='object'||['learn','block','next'].some(k=>r[k]!=null&&typeof r[k]!=='string'))throw Error('复盘格式无效');
    for(const [id,o] of Object.entries(s.boardOverrides)){if(!validId(id)||!o||typeof o!=='object')throw Error('看板编辑数据无效');checkBoard(o);}
    for(const [day,r] of Object.entries(s.civilLogs))if(!dateOK(day)||!r||typeof r.type!=='string'||typeof r.note!=='string'||!Number.isInteger(r.total)||!Number.isInteger(r.right)||r.total<1||r.total>200||r.right<0||r.right>r.total)throw Error('考公记录格式无效');
    for(const r of Object.values(s.money.rewards)){if(!r||!/^\d{4}-\d{2}$/.test(r.month))throw Error('奖励记录无效');cents(r.amount);}
    for(const item of s.boardCustom)if(!item||!/^[\w-]+$/.test(item.id)||typeof item.title!=='string'||!['assignment','important'].includes(item.section))throw Error('看板事项格式无效');
    for(const item of s.boardCustom)checkBoard(item);
    if(s.money.wishes!=null&&(!Array.isArray(s.money.wishes)||s.money.wishes.some(w=>!w||!validId(w.id)||typeof w.name!=='string'||!w.name.trim()||w.name.length>200||typeof w.reason!=='string'||w.reason.length>300||!Number.isFinite(w.createdAt)||w.createdAt<0)))throw Error('愿望口袋格式无效');
    for(const w of s.money.wishes||[])if(!cents(w.price))throw Error('愿望价格必须大于0');
    return s;
  }
  root.PillarCore={dateOK,cents,shift,week,budget,totals,eventFor,parseICS,mergeICS,normalize};
  if(typeof module!=='undefined')module.exports=root.PillarCore;
})(typeof globalThis!=='undefined'?globalThis:this);
