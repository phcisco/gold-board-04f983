/* 图形库：由设计稿 Demo v0.14 抽出，SVG 手绘，无第三方依赖。regimeAt 改为读 GOLDOPS_STATE.REGIME_BAND。 */
(function(){
'use strict';
  var root=document.documentElement;
  function ls(k,v){try{if(v===undefined)return localStorage.getItem(k);localStorage.setItem(k,v);}catch(e){return null;}}
  function seeded(seed){var s=seed>>>0;return function(){s=(s*1664525+1013904223)>>>0;return s/4294967296;};}
  function iso(d){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
  function md(d){return (d.getMonth()+1)+'/'+d.getDate();}
  function ym(d){return d.getFullYear()+'/'+(d.getMonth()+1);}
  function pd(s){var p=s.split('-');return new Date(+p[0],+p[1]-1,+p[2]);}
  function last(a,n){return a.slice(Math.max(0,a.length-n));}
  function fmt0(v){return Math.round(v).toString().replace(/\B(?=(\d{3})+(?!\d))/g,',');}
  function fmt1(v){return v.toFixed(1);} function fmt2(v){return v.toFixed(2);}
  var HOL={'2024-12-25':1,'2025-01-01':1,'2025-07-04':1,'2025-12-25':1,'2026-01-01':1,'2026-07-03':1};
  function bizDays(a,b){var d=pd(a),e=pd(b),out=[];while(d<=e){var w=d.getDay();if(w!==0&&w!==6&&!HOL[iso(d)])out.push(new Date(d));d.setDate(d.getDate()+1);}return out;}
  function fridays(a,b){var d=pd(a),e=pd(b),out=[];while(d<=e){out.push(new Date(d));d.setDate(d.getDate()+7);}return out;}
  function months(a,n){var d=pd(a),out=[];for(var i=0;i<n;i++){out.push(new Date(d));d.setMonth(d.getMonth()+1);}return out;}
  function cal(dates){var m={};dates.forEach(function(d,i){m[iso(d)]=i;});return {dates:dates,idx:function(s){if(m[s]!==undefined)return m[s];var t=pd(s);for(var i=0;i<dates.length;i++){if(dates[i]>=t)return i;}return dates.length-1;}};}
  // 锚点插值 + 轻噪声，锚点处取精确值
  function S(c,anchors,vol,seed){
    var n=c.dates.length,pts=anchors.map(function(a){return [c.idx(a[0]),a[1]];}).sort(function(x,y){return x[0]-y[0];});
    var out=new Array(n),k=0;
    for(var i=0;i<n;i++){while(k<pts.length-2&&i>pts[k+1][0])k++;var a=pts[k],b=pts[Math.min(k+1,pts.length-1)];var t=b[0]===a[0]?0:(i-a[0])/(b[0]-a[0]);t=Math.max(0,Math.min(1,t));out[i]=a[1]+(b[1]-a[1])*t;}
    var r=seeded(seed),noise=0,isA={};pts.forEach(function(p){isA[p[0]]=1;});
    for(var j=0;j<n;j++){noise=noise*0.55+(r()-0.5)*2*vol;if(!isA[j])out[j]=out[j]*(1+noise);}
    return out;
  }
  var RGFILL={rates:'var(--rg-rates)',credit:'var(--rg-credit)',haven:'var(--rg-haven)',squeeze:'var(--rg-squeeze)',momentum:'var(--rg-momentum)'};
  var _band=null,_bandKeys=null;
  function regimeAt(d){var band=window.__REGIME_BAND;if(!band||!band.length)return null;if(_band!==band){_band=band;_bandKeys={};band.forEach(function(x){_bandKeys[x[0]]=x[1];});}
    var k=iso(d);if(_bandKeys[k])return _bandKeys[k];var lo=0,hi=band.length-1,best=null;while(lo<=hi){var mid=(lo+hi)>>1;if(band[mid][0]<=k){best=band[mid][1];lo=mid+1;}else hi=mid-1;}return best;}
  // ================= 图形库 =================
  var C={gold:'var(--gold)',blue:'var(--c-blue)',orange:'var(--c-orange)',aqua:'var(--c-aqua)',violet:'var(--c-violet)',magenta:'var(--c-magenta)',grey:'var(--ink-3)'};
  var GROUPS={};
  function el(tag,cls,text){var e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e;}
  function setSVG(host,s){host.innerHTML=s;}
  function hostW(host,fb){if(!host||!host.clientWidth)return fb;var cs=getComputedStyle(host);var w=host.clientWidth-parseFloat(cs.paddingLeft||0)-parseFloat(cs.paddingRight||0);return w>120?Math.round(w):fb;}
  function xTicks(dates){var n=dates.length,span=(dates[n-1]-dates[0])/864e5,t=[];
    if(span>500){var seen={};dates.forEach(function(d,i){var y=d.getFullYear();if(!seen[y]&&d.getMonth()===0){seen[y]=1;t.push({i:i,l:String(y)});}});if(t.length<2){t=[{i:0,l:ym(dates[0])},{i:n-1,l:ym(dates[n-1])}];}}
    else if(span>200){var seenm={};dates.forEach(function(d,i){var k=d.getFullYear()+'-'+d.getMonth();if(!seenm[k]&&d.getMonth()%3===0){seenm[k]=1;t.push({i:i,l:ym(d)});}});t.push({i:n-1,l:md(dates[n-1])});}
    else{t=[{i:0,l:md(dates[0])},{i:Math.round((n-1)/2),l:md(dates[Math.round((n-1)/2)])},{i:n-1,l:md(dates[n-1])}];}
    return t;}
  function legendHTML(items){var d=el('div','legend');items.forEach(function(it){var s=el('span');var i=el('i');i.style.background=it.color;if(it.dash)i.className='dash';if(it.dash)i.style.color=it.color;s.appendChild(i);s.appendChild(document.createTextNode(it.name));d.appendChild(s);});return d;}
  function lineChart(host,opt){
    if(!host)return;host.innerHTML='';
    var W=hostW(host,opt.w||440),H=opt.h||150,L=opt.l||40,R=(opt.endName===false?36:76)+(opt.posbar?26:0),T=12,B=20,dates=opt.dates;var n=dates.length;
    var hasEmph=opt.series.some(function(s){return s.emph;});
    var ser=opt.series.map(function(s){var v=opt.index?s.values.map(function(x){return x/s.values[0]*100;}):s.values.slice();return {name:s.name,color:s.color,v:v,raw:s.values,dash:s.dash,muted:hasEmph&&!s.emph,emph:s.emph};});
    var all=[];ser.forEach(function(s){s.v.forEach(function(x){if(x!==null&&!isNaN(x))all.push(x);});});(opt.hlines||[]).forEach(function(h){all.push(h.y);});if(opt.band){all.push(opt.band.lo,opt.band.hi);}
    var min=Math.min.apply(null,all),max=Math.max.apply(null,all),pad=(max-min)*0.08||1;min-=pad;max+=pad;
    function x(i){return L+(W-L-R)*i/(n-1);}function y(v){return T+(H-T-B)*(1-(v-min)/(max-min));}
    var fmt=opt.fmt||fmt0,s='';
    s+='<svg viewBox="0 0 '+W+' '+H+'" role="img" aria-label="'+(opt.aria||'')+'">';
    if(opt.regimes!==false){var i0=0;for(var i=1;i<=n;i++){var same=i<n&&regimeAt(dates[i])===regimeAt(dates[i0]);if(!same){var k=regimeAt(dates[i0]);if(k){var xa=x(i0),xb=x(Math.min(i,n-1));s+='<rect x="'+xa.toFixed(1)+'" y="'+T+'" width="'+Math.max(1,xb-xa).toFixed(1)+'" height="'+(H-T-B)+'" fill="'+RGFILL[k]+'"/>';}i0=i;}}}
    if(opt.band){s+='<rect x="'+L+'" y="'+y(opt.band.hi).toFixed(1)+'" width="'+(W-L-R)+'" height="'+(y(opt.band.lo)-y(opt.band.hi)).toFixed(1)+'" fill="var(--ink-3)" opacity=".13"/>';}
    for(var g=1;g<=3;g++){var gv=min+(max-min)*g/4;s+='<line x1="'+L+'" x2="'+(W-R)+'" y1="'+y(gv).toFixed(1)+'" y2="'+y(gv).toFixed(1)+'" stroke="var(--line-2)"/>';s+='<text x="'+(L-4)+'" y="'+(y(gv)+3).toFixed(1)+'" font-size="9" text-anchor="end" fill="var(--ink-3)" font-family="ui-monospace,Menlo,monospace">'+fmt(gv)+'</text>';}
    (opt.hlines||[]).forEach(function(h){s+='<line x1="'+L+'" x2="'+(W-R)+'" y1="'+y(h.y).toFixed(1)+'" y2="'+y(h.y).toFixed(1)+'" stroke="var(--ink-3)" stroke-dasharray="3 3"/>';s+='<text x="'+(L+3)+'" y="'+(y(h.y)-3).toFixed(1)+'" font-size="9" fill="var(--ink-3)">'+h.label+'</text>';});
    (opt.marks||[]).forEach(function(m,mi){var i=dates.findIndex(function(d){return iso(d)>=m.date;});if(i<0)return;s+='<line x1="'+x(i).toFixed(1)+'" x2="'+x(i).toFixed(1)+'" y1="'+T+'" y2="'+(H-B)+'" stroke="var(--accent)" opacity=".6"/>';s+='<text x="'+(x(i)+3).toFixed(1)+'" y="'+(T+8+(mi%2)*11)+'" font-size="9" fill="var(--accent)">'+m.label+'</text>';});
    ser.forEach(function(sr){var d='',pen=false;sr.v.forEach(function(v,i){if(v===null||isNaN(v)){pen=false;return;}d+=(pen?'L':'M')+x(i).toFixed(1)+' '+y(v).toFixed(1)+' ';pen=true;});var sw=sr.emph?2.6:(sr.dash?1.5:2);var op=sr.muted?0.45:1;s+='<path d="'+d+'" fill="none" stroke="'+sr.color+'" stroke-width="'+sw+'" opacity="'+op+'"'+(sr.dash?' stroke-dasharray="4 3"':'')+' stroke-linejoin="round" stroke-linecap="round"/>';var lv=sr.v[n-1];if(!sr.dash&&lv!==null){s+='<circle cx="'+x(n-1).toFixed(1)+'" cy="'+y(lv).toFixed(1)+'" r="3.5" fill="'+sr.color+'" stroke="var(--raised)" stroke-width="2" opacity="'+op+'"/>';}});
    var ends=ser.filter(function(sr){return sr.v[n-1]!==null;}).map(function(sr){return {name:sr.name,yy:y(sr.v[n-1]),val:sr.v[n-1],raw:sr.raw[n-1],muted:sr.muted};}).sort(function(a,b){return a.yy-b.yy;});
    for(var k2=1;k2<ends.length;k2++){if(ends[k2].yy-ends[k2-1].yy<11)ends[k2].yy=ends[k2-1].yy+11;}
    var ex=W-R+6;ends.forEach(function(e){s+='<text x="'+ex+'" y="'+(e.yy+3).toFixed(1)+'" font-size="10" fill="var(--ink-2)" opacity="'+(e.muted?0.6:1)+'">'+(opt.endName===false?'':e.name+' ')+(opt.index?e.val.toFixed(0):fmt(e.raw))+'</text>';});
    if(opt.posbar){var v0=ser[0].v.filter(function(v){return v!==null;}),lo=Math.min.apply(null,v0),hi=Math.max.apply(null,v0),cur=v0[v0.length-1],pct=(cur-lo)/(hi-lo);var bx=W-14,by0=T+4,by1=H-B-4;s+='<line x1="'+bx+'" x2="'+bx+'" y1="'+by0+'" y2="'+by1+'" stroke="var(--line)" stroke-width="4" stroke-linecap="round"/>';var cy=by1-(by1-by0)*pct;s+='<circle cx="'+bx+'" cy="'+cy.toFixed(1)+'" r="4" fill="'+ser[0].color+'" stroke="var(--raised)" stroke-width="1.5"/>';s+='<text x="'+bx+'" y="'+(by0-1)+'" font-size="8.5" text-anchor="middle" fill="var(--ink-3)">'+Math.round(pct*100)+'%</text>';}
    (opt.xticks||xTicks(dates)).forEach(function(t){var anchor=t.i===0?'start':t.i===n-1?'end':'middle';s+='<text x="'+x(t.i).toFixed(1)+'" y="'+(H-6)+'" font-size="9" fill="var(--ink-3)" text-anchor="'+anchor+'">'+t.l+'</text>';});
    s+='</svg>';
    if(opt.legend){host.appendChild(legendHTML(ser.map(function(sr){return {name:sr.name,color:sr.color,dash:sr.dash};})));}
    var wrap=el('div');wrap.style.position='relative';host.appendChild(wrap);setSVG(wrap,s);
    var tip=el('div','tip');tip.hidden=true;wrap.appendChild(tip);
    function show(i,px){tip.hidden=false;if(px!==undefined){var rect=wrap.getBoundingClientRect();var left=px+10;if(left>rect.width-170)left=rect.width-170;tip.style.left=Math.max(0,left)+'px';}else{tip.style.left='8px';}while(tip.firstChild)tip.removeChild(tip.firstChild);tip.appendChild(el('b',null,(dates[i].getFullYear()!==2026?dates[i].getFullYear()+'/':'')+md(dates[i])));ser.forEach(function(sr){var row=el('div');var sw=el('i');sw.style.background=sr.color;row.appendChild(sw);var v=sr.v[i];row.appendChild(document.createTextNode(sr.name+' '+(v===null?'—':(opt.index?v.toFixed(1):fmt(sr.raw[i])))));tip.appendChild(row);});}
    function hide(){tip.hidden=true;}
    var api={show:show,hide:hide,n:n};
    if(opt.group){(GROUPS[opt.group]=GROUPS[opt.group]||[]).push(api);}
    wrap.addEventListener('mousemove',function(ev){var rect=wrap.getBoundingClientRect();var px=(ev.clientX-rect.left)/rect.width*W;var i=Math.round((px-L)/(W-L-R)*(n-1));if(i<0||i>=n){hide();return;}show(i,ev.clientX-rect.left);if(opt.group){GROUPS[opt.group].forEach(function(o){if(o!==api&&o.n===n)o.show(i);});}});
    wrap.addEventListener('mouseleave',function(){hide();if(opt.group){GROUPS[opt.group].forEach(function(o){if(o!==api)o.hide();});}});
  }
  function sparkline(host,vals,color){if(!host)return;var v=vals.filter(function(x){return x!==null;});var W=72,H=24,min=Math.min.apply(null,v),max=Math.max.apply(null,v),n=v.length;function x(i){return 2+(W-8)*i/(n-1);}function y(k){return 2+(H-4)*(1-(k-min)/((max-min)||1));}var d=v.map(function(k,i){return (i?'L':'M')+x(i).toFixed(1)+' '+y(k).toFixed(1);}).join(' ');setSVG(host,'<svg viewBox="0 0 '+W+' '+H+'" aria-hidden="true"><path d="'+d+'" fill="none" stroke="'+color+'" stroke-width="1.5" stroke-linejoin="round"/><circle cx="'+x(n-1).toFixed(1)+'" cy="'+y(v[n-1]).toFixed(1)+'" r="2.2" fill="'+color+'"/></svg>');}
  function barChart(host,opt){
    if(!host)return;var W=hostW(host,opt.w||440),H=opt.h||150,L=30,R=10,T=14,B=20;var vals=opt.values,labels=opt.labels,n=labels.length;
    var max=Math.max.apply(null,vals.concat(opt.hline?[opt.hline.y]:[]))*1.15;function x(i){return L+(W-L-R)*i/n;}function y(v){return T+(H-T-B)*(1-v/max);}var bw=(W-L-R)/n-4;
    var s='<svg viewBox="0 0 '+W+' '+H+'" role="img" aria-label="'+(opt.aria||'')+'">';
    for(var g=1;g<=3;g++){var gv=max*g/4;s+='<line x1="'+L+'" x2="'+(W-R)+'" y1="'+y(gv).toFixed(1)+'" y2="'+y(gv).toFixed(1)+'" stroke="var(--line-2)"/>';s+='<text x="'+(L-4)+'" y="'+(y(gv)+3).toFixed(1)+'" font-size="9" text-anchor="end" fill="var(--ink-3)">'+gv.toFixed(0)+'</text>';}
    vals.forEach(function(v,i){s+='<rect x="'+(x(i)+2).toFixed(1)+'" y="'+y(v).toFixed(1)+'" width="'+bw.toFixed(1)+'" height="'+(y(0)-y(v)).toFixed(1)+'" rx="2" fill="'+opt.color+'"/>';s+='<text x="'+(x(i)+2+bw/2).toFixed(1)+'" y="'+(y(v)-3).toFixed(1)+'" font-size="9" text-anchor="middle" fill="var(--ink-2)">'+v+'</text>';});
    if(n>vals.length){var i2=vals.length;s+='<rect x="'+(x(i2)+2).toFixed(1)+'" y="'+y(max*0.5).toFixed(1)+'" width="'+bw.toFixed(1)+'" height="'+(y(0)-y(max*0.5)).toFixed(1)+'" rx="2" fill="none" stroke="var(--accent)" stroke-dasharray="3 3"/>';s+='<text x="'+(x(i2)+2+bw/2).toFixed(1)+'" y="'+(y(max*0.5)-3).toFixed(1)+'" font-size="9" text-anchor="middle" fill="var(--accent)">今天</text>';}
    if(opt.hline){s+='<line x1="'+L+'" x2="'+(W-R)+'" y1="'+y(opt.hline.y).toFixed(1)+'" y2="'+y(opt.hline.y).toFixed(1)+'" stroke="var(--ink-3)" stroke-dasharray="3 3"/>';s+='<text x="'+(W-R)+'" y="'+(y(opt.hline.y)-3).toFixed(1)+'" font-size="9" text-anchor="end" fill="var(--ink-3)">'+opt.hline.label+'</text>';}
    labels.forEach(function(l,i){s+='<text x="'+(x(i)+2+bw/2).toFixed(1)+'" y="'+(H-6)+'" font-size="9" text-anchor="middle" fill="var(--ink-3)">'+l+'</text>';});
    s+='</svg>';setSVG(host,s);
  }
  function waterfall(host,items,opt){
    if(!host)return;var W=hostW(host,440),H=170,L=40,R=12,T=16,B=24;var n=items.length+1;var cum=0,steps=[];items.forEach(function(it){steps.push({name:it.name,from:cum,to:cum+it.v,v:it.v});cum+=it.v;});
    var lo=Math.min(0,Math.min.apply(null,steps.map(function(s){return Math.min(s.from,s.to);}))),hi=Math.max(0,Math.max.apply(null,steps.map(function(s){return Math.max(s.from,s.to);})));var pad=(hi-lo)*0.15;lo-=pad;hi+=pad;
    function x(i){return L+(W-L-R)*i/n;}function y(v){return T+(H-T-B)*(1-(v-lo)/(hi-lo));}var bw=(W-L-R)/n-8;
    var s='<svg viewBox="0 0 '+W+' '+H+'" role="img" aria-label="归因瀑布">';
    s+='<line x1="'+L+'" x2="'+(W-R)+'" y1="'+y(0).toFixed(1)+'" y2="'+y(0).toFixed(1)+'" stroke="var(--ink-3)"/>';
    steps.forEach(function(st,i){var up=st.v>=0;var col=up?'var(--up)':'var(--down)';var yt=y(Math.max(st.from,st.to)),yb=y(Math.min(st.from,st.to));s+='<rect x="'+(x(i)+4).toFixed(1)+'" y="'+yt.toFixed(1)+'" width="'+bw.toFixed(1)+'" height="'+Math.max(1,yb-yt).toFixed(1)+'" rx="2" fill="'+col+'"/>';s+='<text x="'+(x(i)+4+bw/2).toFixed(1)+'" y="'+(yt-4).toFixed(1)+'" font-size="9.5" text-anchor="middle" fill="var(--ink-2)" font-family="ui-monospace,Menlo,monospace">'+(st.v>0?'+':'')+st.v.toFixed(2)+'</text>';s+='<text x="'+(x(i)+4+bw/2).toFixed(1)+'" y="'+(H-8)+'" font-size="9.5" text-anchor="middle" fill="var(--ink-3)">'+st.name+'</text>';if(i<steps.length-1){s+='<line x1="'+(x(i)+4+bw).toFixed(1)+'" x2="'+(x(i+1)+4).toFixed(1)+'" y1="'+y(st.to).toFixed(1)+'" y2="'+y(st.to).toFixed(1)+'" stroke="var(--ink-3)" stroke-dasharray="2 2"/>';}});
    var yt2=y(Math.max(0,cum)),yb2=y(Math.min(0,cum));s+='<rect x="'+(x(n-1)+4).toFixed(1)+'" y="'+yt2.toFixed(1)+'" width="'+bw.toFixed(1)+'" height="'+Math.max(1,yb2-yt2).toFixed(1)+'" rx="2" fill="var(--gold)"/>';s+='<text x="'+(x(n-1)+4+bw/2).toFixed(1)+'" y="'+(yt2-4).toFixed(1)+'" font-size="9.5" text-anchor="middle" fill="var(--ink)" font-weight="600" font-family="ui-monospace,Menlo,monospace">'+(cum>0?'+':'')+cum.toFixed(2)+'%</text>';s+='<text x="'+(x(n-1)+4+bw/2).toFixed(1)+'" y="'+(H-8)+'" font-size="9.5" text-anchor="middle" fill="var(--ink-2)">金价</text>';
    s+='</svg>';setSVG(host,s);
  }
  function termStructure(host,tenors,curves){
    if(!host)return;host.innerHTML='';var W=hostW(host,300),H=130,L=34,R=12,T=12,B=20;var all=[];curves.forEach(function(c){all=all.concat(c.vals);});var min=Math.min.apply(null,all)-0.15,max=Math.max.apply(null,all)+0.15;var n=tenors.length;
    function x(i){return L+(W-L-R)*i/(n-1);}function y(v){return T+(H-T-B)*(1-(v-min)/(max-min));}
    var s='<svg viewBox="0 0 '+W+' '+H+'" role="img" aria-label="期限结构快照">';
    for(var g=1;g<=3;g++){var gv=min+(max-min)*g/4;s+='<line x1="'+L+'" x2="'+(W-R)+'" y1="'+y(gv).toFixed(1)+'" y2="'+y(gv).toFixed(1)+'" stroke="var(--line-2)"/>';s+='<text x="'+(L-4)+'" y="'+(y(gv)+3).toFixed(1)+'" font-size="9" text-anchor="end" fill="var(--ink-3)" font-family="ui-monospace,Menlo,monospace">'+gv.toFixed(2)+'</text>';}
    curves.forEach(function(c){var d=c.vals.map(function(v,i){return (i?'L':'M')+x(i).toFixed(1)+' '+y(v).toFixed(1);}).join(' ');s+='<path d="'+d+'" fill="none" stroke="'+c.color+'" stroke-width="'+(c.emph?2.6:1.8)+'"'+(c.dash?' stroke-dasharray="4 3"':'')+' stroke-linejoin="round"/>';c.vals.forEach(function(v,i){s+='<circle cx="'+x(i).toFixed(1)+'" cy="'+y(v).toFixed(1)+'" r="'+(c.emph?3.5:2.5)+'" fill="'+c.color+'" stroke="var(--raised)" stroke-width="1.5"/>';});});
    tenors.forEach(function(t,i){s+='<text x="'+x(i).toFixed(1)+'" y="'+(H-6)+'" font-size="9.5" text-anchor="middle" fill="var(--ink-3)">'+t+' 年</text>';});
    s+='</svg>';host.appendChild(legendHTML(curves.map(function(c){return {name:c.name,color:c.color,dash:c.dash};})));var wrap=el('div');host.appendChild(wrap);setSVG(wrap,s);
  }
  function tenorBars(host,tenors,vals){
    if(!host)return;var W=hostW(host,300),H=130,L=30,R=10,T=14,B=20;var n=tenors.length,max=Math.max.apply(null,vals)*1.25;function x(i){return L+(W-L-R)*i/n;}function y(v){return T+(H-T-B)*(1-v/max);}var bw=(W-L-R)/n-12;
    var s='<svg viewBox="0 0 '+W+' '+H+'" role="img" aria-label="各期限本月变动">';
    for(var g=1;g<=3;g++){var gv=max*g/4;s+='<line x1="'+L+'" x2="'+(W-R)+'" y1="'+y(gv).toFixed(1)+'" y2="'+y(gv).toFixed(1)+'" stroke="var(--line-2)"/>';s+='<text x="'+(L-4)+'" y="'+(y(gv)+3).toFixed(1)+'" font-size="9" text-anchor="end" fill="var(--ink-3)">'+gv.toFixed(0)+'</text>';}
    vals.forEach(function(v,i){s+='<rect x="'+(x(i)+6).toFixed(1)+'" y="'+y(v).toFixed(1)+'" width="'+bw.toFixed(1)+'" height="'+(y(0)-y(v)).toFixed(1)+'" rx="2" fill="var(--c-blue)"/>';s+='<text x="'+(x(i)+6+bw/2).toFixed(1)+'" y="'+(y(v)-4).toFixed(1)+'" font-size="9.5" text-anchor="middle" fill="var(--ink-2)" font-family="ui-monospace,Menlo,monospace">+'+v+'bp</text>';s+='<text x="'+(x(i)+6+bw/2).toFixed(1)+'" y="'+(H-6)+'" font-size="9.5" text-anchor="middle" fill="var(--ink-3)">'+tenors[i]+' 年</text>';});
    s+='</svg>';setSVG(host,s);
  }
  function scatter(host,xs,ys,dates,opt){
    if(!host)return;host.innerHTML='';var W=hostW(host,440),H=210,L=44,R=14,T=12,B=22;var n=xs.length;
    var xmin=Math.min.apply(null,xs)-0.2,xmax=Math.max.apply(null,xs)+0.2;var lys=ys.map(Math.log),ymin=Math.min(Math.log(800),Math.min.apply(null,lys))-0.05,ymax=Math.max.apply(null,lys)+0.08;
    function x(v){return L+(W-L-R)*(v-xmin)/(xmax-xmin);}function y(v){return T+(H-T-B)*(1-(Math.log(v)-ymin)/(ymax-ymin));}
    var s='<svg viewBox="0 0 '+W+' '+H+'" role="img" aria-label="金价对实际利率散点">';
    [1000,1500,2000,3000,4000,5000].forEach(function(gv){if(Math.log(gv)<ymin||Math.log(gv)>ymax)return;s+='<line x1="'+L+'" x2="'+(W-R)+'" y1="'+y(gv).toFixed(1)+'" y2="'+y(gv).toFixed(1)+'" stroke="var(--line-2)"/>';s+='<text x="'+(L-4)+'" y="'+(y(gv)+3).toFixed(1)+'" font-size="9" text-anchor="end" fill="var(--ink-3)" font-family="ui-monospace,Menlo,monospace">'+fmt0(gv)+'</text>';});
    [-1,0,1,2].forEach(function(xv){if(xv<xmin||xv>xmax)return;s+='<text x="'+x(xv).toFixed(1)+'" y="'+(H-6)+'" font-size="9" text-anchor="middle" fill="var(--ink-3)">'+(xv>0?'+':'')+xv.toFixed(1)+'%</text>';});
    var a=opt.a,b=opt.b;var mx0=xmin+0.1,mx1=xmax-0.1;s+='<line x1="'+x(mx0).toFixed(1)+'" x2="'+x(mx1).toFixed(1)+'" y1="'+y(Math.exp(a+b*mx0)).toFixed(1)+'" y2="'+y(Math.exp(a+b*mx1)).toFixed(1)+'" stroke="var(--ink-2)" stroke-dasharray="4 3"/>';s+='<text x="'+x(mx1).toFixed(1)+'" y="'+(y(Math.exp(a+b*mx1))+12).toFixed(1)+'" font-size="9" text-anchor="end" fill="var(--ink-3)">旧模型 2019–21 拟合</text>';
    var col=function(d){var yr=d.getFullYear();return yr<=2021?C.grey:yr<=2024?C.blue:yr===2025?C.orange:C.gold;};
    for(var i=0;i<n;i++){var d=dates[i];var r=i===n-1?5:2.6;s+='<circle cx="'+x(xs[i]).toFixed(1)+'" cy="'+y(ys[i]).toFixed(1)+'" r="'+r+'" fill="'+col(d)+'" opacity="'+(i===n-1?1:0.85)+'" stroke="var(--raised)" stroke-width="1"/>';}
    var cx=xs[n-1],cy=ys[n-1],my=Math.exp(a+b*cx);s+='<line x1="'+x(cx).toFixed(1)+'" x2="'+x(cx).toFixed(1)+'" y1="'+y(cy).toFixed(1)+'" y2="'+y(my).toFixed(1)+'" stroke="var(--accent)" stroke-dasharray="2 2"/>';s+='<text x="'+(x(cx)-6).toFixed(1)+'" y="'+((y(cy)+y(my))/2).toFixed(1)+'" font-size="10" text-anchor="end" fill="var(--accent)" font-weight="600">×'+(cy/my).toFixed(1)+' 溢价</text>';s+='<text x="'+(x(cx)-8).toFixed(1)+'" y="'+(y(cy)-6).toFixed(1)+'" font-size="9.5" text-anchor="end" fill="var(--ink)">9/4 · 4,430 @ 2.43%</text>';
    s+='</svg>';host.appendChild(legendHTML([{name:'2019–21 拟合样本',color:C.grey},{name:'2022–24',color:C.blue},{name:'2025',color:C.orange},{name:'2026',color:C.gold}]));var wrap=el('div');host.appendChild(wrap);setSVG(wrap,s);
  }
  function eventStudy(host,series){
    if(!host)return;host.innerHTML='';var W=hostW(host,440),H=160,L=36,R=70,T=12,B=22;var n=11;var all=[];series.forEach(function(s){all=all.concat(s.vals);});var min=Math.min.apply(null,all)-0.3,max=Math.max.apply(null,all)+0.3;
    function x(i){return L+(W-L-R)*i/(n-1);}function y(v){return T+(H-T-B)*(1-(v-min)/(max-min));}
    var s='<svg viewBox="0 0 '+W+' '+H+'" role="img" aria-label="事件研究">';
    for(var g=1;g<=3;g++){var gv=min+(max-min)*g/4;s+='<line x1="'+L+'" x2="'+(W-R)+'" y1="'+y(gv).toFixed(1)+'" y2="'+y(gv).toFixed(1)+'" stroke="var(--line-2)"/>';s+='<text x="'+(L-4)+'" y="'+(y(gv)+3).toFixed(1)+'" font-size="9" text-anchor="end" fill="var(--ink-3)" font-family="ui-monospace,Menlo,monospace">'+gv.toFixed(1)+'%</text>';}
    s+='<line x1="'+x(5).toFixed(1)+'" x2="'+x(5).toFixed(1)+'" y1="'+T+'" y2="'+(H-B)+'" stroke="var(--accent)" opacity=".7"/><text x="'+(x(5)+3).toFixed(1)+'" y="'+(T+8)+'" font-size="9" fill="var(--accent)">事件日</text>';
    s+='<line x1="'+L+'" x2="'+(W-R)+'" y1="'+y(0).toFixed(1)+'" y2="'+y(0).toFixed(1)+'" stroke="var(--ink-3)" stroke-dasharray="3 3"/>';
    series.forEach(function(sr){var d=sr.vals.map(function(v,i){return (i?'L':'M')+x(i).toFixed(1)+' '+y(v).toFixed(1);}).join(' ');s+='<path d="'+d+'" fill="none" stroke="'+sr.color+'" stroke-width="'+(sr.emph?2.6:1.8)+'"'+(sr.dash?' stroke-dasharray="4 3"':'')+' stroke-linejoin="round"/>';s+='<text x="'+(W-R+6)+'" y="'+(y(sr.vals[n-1])+3).toFixed(1)+'" font-size="10" fill="var(--ink-2)">'+sr.name+'</text>';});
    for(var i=0;i<n;i++){if(i%5===0||i===n-1){s+='<text x="'+x(i).toFixed(1)+'" y="'+(H-6)+'" font-size="9" fill="var(--ink-3)" text-anchor="middle">'+(i-5>0?'+':'')+(i-5)+'</text>';}}
    s+='</svg>';var wrap=el('div');host.appendChild(wrap);setSVG(wrap,s);
  }
  function heatmap(host,rows,cols,matrix,scales,units){
    if(!host)return;host.innerHTML='';var t=el('table');var thead=el('thead'),tr=el('tr');tr.appendChild(el('th','',''));cols.forEach(function(c,j){tr.appendChild(el('th','',c+(units&&units[j]?' '+units[j]:'')));});thead.appendChild(tr);t.appendChild(thead);
    var tb=el('tbody');rows.forEach(function(r,i){var trr=el('tr');trr.appendChild(el('td','',r));matrix[i].forEach(function(v,j){var td=el('td');var sp=el('span');var sc=scales[j]||3;var inten=Math.min(1,Math.abs(v)/sc);var rgb=v<0?'57,135,229':'217,89,38';sp.style.background='rgba('+rgb+','+(0.10+0.65*inten).toFixed(2)+')';sp.style.color=inten>0.55?'#fff':'var(--ink)';sp.textContent=(v>0?'+':'')+(Number.isInteger(v)?v:v.toFixed(1));td.appendChild(sp);trr.appendChild(td);});tb.appendChild(trr);});t.appendChild(tb);host.appendChild(t);
  }
  function distStrip(host,opt){
    if(!host)return;var W=hostW(host,440),H=230,L=14,R=14,T=14,B=42;var pmin=opt.min,pmax=opt.max;function x(p){return L+(W-L-R)*(p-pmin)/(pmax-pmin);}
    var s='<svg viewBox="0 0 '+W+' '+H+'" role="img" aria-label="情景与价位分布带">';
    // 关键位
    opt.levels.forEach(function(lv){if(lv.hi){s+='<rect x="'+x(lv.lo).toFixed(1)+'" y="'+T+'" width="'+(x(lv.hi)-x(lv.lo)).toFixed(1)+'" height="'+(H-T-B)+'" fill="var(--accent)" opacity=".10"/>';s+='<text x="'+((x(lv.lo)+x(lv.hi))/2).toFixed(1)+'" y="'+(H-B+12)+'" font-size="9" text-anchor="middle" fill="var(--ink-2)">'+lv.label+'</text>';s+='<text x="'+((x(lv.lo)+x(lv.hi))/2).toFixed(1)+'" y="'+(H-B+23)+'" font-size="9" text-anchor="middle" fill="var(--ink-3)" font-family="ui-monospace,Menlo,monospace">'+fmt0(lv.lo)+'–'+fmt0(lv.hi)+'</text>';}else{s+='<line x1="'+x(lv.p).toFixed(1)+'" x2="'+x(lv.p).toFixed(1)+'" y1="'+T+'" y2="'+(H-B)+'" stroke="var(--ink-3)" stroke-dasharray="3 3"/>';s+='<text x="'+x(lv.p).toFixed(1)+'" y="'+(H-B+12)+'" font-size="9" text-anchor="middle" fill="var(--ink-2)">'+lv.label+'</text>';s+='<text x="'+x(lv.p).toFixed(1)+'" y="'+(H-B+23)+'" font-size="9" text-anchor="middle" fill="var(--ink-3)" font-family="ui-monospace,Menlo,monospace">'+fmt0(lv.p)+'</text>';}});
    // 情景行
    var rowH=(H-T-B-16)/opt.rows.length;
    opt.rows.forEach(function(r,ri){var y0=T+8+ri*rowH,maxh=rowH-22;s+='<text x="'+L+'" y="'+(y0+8).toFixed(1)+'" font-size="10" fill="var(--ink-2)" font-weight="600">'+r.name+'</text>';var base=y0+rowH-14;r.items.forEach(function(it){var h=Math.max(6,maxh*it.p/0.45);var xa=x(it.lo),xb=x(it.hi);s+='<rect x="'+xa.toFixed(1)+'" y="'+(base-h).toFixed(1)+'" width="'+Math.max(2,xb-xa).toFixed(1)+'" height="'+h.toFixed(1)+'" rx="2" fill="'+r.color+'" opacity="'+(it.mode?0.9:0.55)+'" stroke="var(--panel)" stroke-width="1"/>';s+='<text x="'+((xa+xb)/2).toFixed(1)+'" y="'+(base-h-3).toFixed(1)+'" font-size="9" text-anchor="middle" fill="var(--ink)">'+it.label+' '+Math.round(it.p*100)+'%</text>';});
      var mx=x(r.median);s+='<path d="M'+mx.toFixed(1)+' '+(base+2)+' l5 6 l-5 6 l-5 -6 z" fill="var(--ink)"/>';s+='<text x="'+(mx+8).toFixed(1)+'" y="'+(base+12)+'" font-size="9" fill="var(--ink-2)">加权中值 '+fmt0(r.median)+'</text>';});
    // 现价
    s+='<line x1="'+x(opt.price).toFixed(1)+'" x2="'+x(opt.price).toFixed(1)+'" y1="'+(T-4)+'" y2="'+(H-B+4)+'" stroke="var(--gold)" stroke-width="2"/>';s+='<text x="'+(x(opt.price)+4).toFixed(1)+'" y="'+(T+4)+'" font-size="10" fill="var(--gold)" font-weight="600">现价 '+fmt0(opt.price)+'</text>';
    // 轴
    s+='<line x1="'+L+'" x2="'+(W-R)+'" y1="'+(H-B)+'" y2="'+(H-B)+'" stroke="var(--line)"/>';[pmin,pmax].forEach(function(p){s+='<text x="'+x(p).toFixed(1)+'" y="'+(H-4)+'" font-size="9" text-anchor="'+(p===pmin?'start':'end')+'" fill="var(--ink-3)" font-family="ui-monospace,Menlo,monospace">'+fmt0(p)+'</text>';});
    s+='</svg>';setSVG(host,s);
  }


  window.GoldCharts={lineChart:lineChart,sparkline:sparkline,barChart:barChart,waterfall:waterfall,termStructure:termStructure,tenorBars:tenorBars,scatter:scatter,eventStudy:eventStudy,heatmap:heatmap,distStrip:distStrip,legendHTML:legendHTML,el:el,fmt0:fmt0,fmt1:fmt1,fmt2:fmt2,md:md,ym:ym,iso:iso,pd:pd,C:C,setRegimes:function(band){window.__REGIME_BAND=band;}};
})();
