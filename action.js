/* 块五「所以怎么做」、提醒、校准（第 2 期）。数据来自 GOLDOPS_STATE.action / alerts / calibration。 */
(function () {
  'use strict';
  var ST = window.GOLDOPS_STATE, D = window.GOLDOPS_DAILY, GC = window.GoldCharts, GO = window.GO;
  if (!ST || !ST.action || !GC || !GO) return;
  var A = ST.action, P = A.position, EX = A.expectation, T = A.tree, esc = GO.esc, fmtN = GO.fmtN, signed = GO.signed;
  var pct = function (v, nd) { return v === null || v === undefined ? '—' : (v > 0 ? '+' : '') + Number(v).toFixed(nd === undefined ? 1 : nd) + '%'; };
  var POST = { attack: ['attack', '进攻'], watch: ['watch', '观望'], defend: ['defend', '防守'], riskoff: ['riskoff', '避险'] };

  // 顶栏姿态与利用率
  (function header() {
    var cell = document.querySelectorAll('#cells .cell')[3];
    if (cell) cell.innerHTML = '<div class="k">建议利用率 · 姿态</div><div class="v"><span class="num">' + (P.u >= 0 ? '+' : '−') + Math.abs(Math.round(P.u * 100)) + '%</span><span class="posture">' + A.posture.cn + '</span><span class="word">战略 ' + Math.round(P.u_strategic * 100) + '% · 战术 ' + Math.round(P.u_tactical * 100) + '%' + (A.max_exposure_X ? ' · ≈ ' + (P.u < 0 ? '−' : '+') + '$' + fmtN(Math.abs(P.u) * A.max_exposure_X, 0) + '，X = $' + fmtN(A.max_exposure_X, 0) : ' · X 未填，只给比例') + '</span></div>';
  })();

  // 块五
  (function blockFive() {
    var sec = document.getElementById('b5'); var body = sec.parentNode.querySelector('.placeholder');
    var ev = T.event_path, rg = T.regime, e1 = EX.event_path, e2 = EX.regime;
    var order = { attack: '按触发条件进攻。', watch: '不加不减，等下一个三星事件之后的买点。', defend: '防守：期望为负或证伪型触发，按触发条件减仓。', riskoff: '避险：挤压覆盖，短线仓清零，现金优先。' }[A.posture.key];
    var trigByPost = {}; A.triggers.forEach(function (t) { (trigByPost[t.posture] = trigByPost[t.posture] || []).push(t); });
    function stateCard(key, act, extra) {
      var cur = A.posture.key === key; var ts = trigByPost[key] || [];
      return '<div class="state ' + key + (cur ? ' now' : '') + '"><div class="w"><b>' + POST[key][1] + '</b></div><div class="act">' + act + '</div>' +
        ts.map(function (t) { return '<div class="if"><b>如果</b>' + esc(t.condition) + (t.premise ? '；前提：' + esc(t.premise) : '') + '</div>'; }).join('') + (extra ? '<div class="if">' + extra + '</div>' : '') +
        (ts.length ? '<div class="note">' + ts.map(function (t) { return (typeof t.delta_u === 'number' ? 'ΔU ' + (t.delta_u > 0 ? '+' : '') + Math.round(t.delta_u * 100) + '%' : t.delta_u) + ' · ' + (t.layer === 'strategic' ? '长期仓' : t.layer === 'tactical' ? '短线仓' : '两层') + ' · 有效到 ' + t.valid_until; }).join('；') + '</div>' : '') + '</div>';
    }
    var html = '<p class="order">' + order + '</p><p class="order-sub">姿态 ' + A.posture.cn + ' · 建议利用率 ' + Math.round(P.u * 100) + '%（战略 ' + Math.round(P.u_strategic * 100) + '%，战术 ' + Math.round(P.u_tactical * 100) + '%，风险折减 ×' + P.haircut + '）· ' + esc(P.strategic_reason) + (P.tactical_note ? ' · ' + esc(P.tactical_note) : '') + (P.prev_u !== null && P.changed ? ' · 上次 ' + Math.round(P.prev_u * 100) + '%' : '') + '</p>' +
      '<div class="states">' + stateCard('attack', '加仓') + stateCard('watch', Math.round(P.u * 100) + '%', '区间：' + fmtN(A.bands.filter(function (b) { return b.kind === 'entry'; }).map(function (b) { return b.hi; })[0] || 0, 0) + '–' + fmtN((A.bands.filter(function (b) { return b.kind === 'watershed'; })[0] || {}).level || 0, 0) + '，入场带与 200 日线之间') + stateCard('defend', '减仓') + stateCard('riskoff', '清短线仓') + '</div>' +
      '<div class="two"><div><ul class="levels">' + A.bands.map(function (b) { var lab = b.level !== undefined ? fmtN(b.level, 0) : fmtN(b.lo, 0) + '–' + fmtN(b.hi, 0); var chip = { target: '<span class="chip">目标区</span>', watershed: '<span class="chip mid">分水岭</span>', entry: '<span class="chip bull">入场带</span>', floor: '<span class="chip">无效带</span>', scenario: '<span class="chip">情景区</span>', support: '<span class="chip">支撑</span>', now: '' }[b.kind] || ''; return '<li' + (b.kind === 'now' ? ' class="now"' : '') + '><span class="p">' + lab + '</span><span class="lab">' + chip + esc(b.label) + '</span></li>'; }).join('') + '</ul></div>' +
      '<div><div class="dist" id="ch-dist"></div><div class="figcap"><b>情景与价位分布带</b> · 色块高度 = 概率，菱形 = 加权中值 · σ ' + A.sigma_annual_pct + '% ' + A.sigma_source + '</div>' +
      '<div class="stats"><div><div class="k">到 ' + (ev.event ? ev.event.date.slice(5).replace('-', '/') : ev.horizon_days + ' 日') + ' E[r]</div><div class="v">' + pct(e1.expected_return_pct, 2) + '</div></div><div><div class="k">' + rg.horizon_months + ' 个月 E[r]</div><div class="v">' + pct(e2.expected_return_pct, 1) + '</div></div><div><div class="k">σ 年化</div><div class="v">' + A.sigma_annual_pct + '%</div></div><div><div class="k">上/下行赔率</div><div class="v">' + (e2.odds_up_down === null ? '—' : e2.odds_up_down + ':1') + '</div></div><div><div class="k">偏度</div><div class="v">' + (e2.skew >= 0 ? '+' : '') + e2.skew + '</div></div></div>' +
      '<div class="note2">事件路径 ¼ 凯利 ' + pct(e1.kelly_quarter_pct, 0) + '，体制情景 ¼ 凯利 ' + pct(e2.kelly_quarter_pct, 0) + '；最大空头情景概率 ±8 个百分点时体制段 ¼ 凯利为 ' + e2.sensitivity_bear_pm8.map(function (x) { return pct(x, 0); }).join(' / ') + '。概率加权价 ' + fmtN(e2.weighted_mid, 0) + ' 对现价 ' + fmtN(A.price, 0) + '，' + (Math.abs(e2.fair_gap_pct) < 1 ? '接近公平定价' : (e2.fair_gap_pct > 0 ? '低估' : '高估') + ' ' + Math.abs(e2.fair_gap_pct).toFixed(1) + '%') + '。概率来源：' + esc(ev.source) + '；' + esc(rg.source) + '。</div></div></div>';
    body.className = ''; body.innerHTML = html;
    sec.innerHTML = '所以怎么做 <span class="meta">利用率为最大敞口 X 的比例 · 周日裁决</span>';
    var lo = Math.min.apply(null, [].concat(ev.items.map(function (i) { return i.lo; }), rg.items.map(function (i) { return i.lo; }))), hi = Math.max.apply(null, [].concat(ev.items.map(function (i) { return i.hi; }), rg.items.map(function (i) { return i.hi; })));
    var levels = A.bands.filter(function (b) { return b.kind !== 'now' && b.kind !== 'scenario'; }).map(function (b) { return b.level !== undefined ? { p: b.level, label: b.label.split('，')[0] } : { lo: b.lo, hi: b.hi, label: b.label.split('，')[0] }; }).filter(function (l) { return (l.p || l.lo) >= lo * 0.98 && (l.p || l.hi) <= hi * 1.02; });
    var med = function (part, ex) { return ex.weighted_mid; };
    GC.distStrip(document.getElementById('ch-dist'), { min: Math.floor(lo / 50) * 50, max: Math.ceil(hi / 50) * 50, price: A.price, levels: levels,
      rows: [{ name: '到 ' + (ev.event ? ev.event.date.slice(5).replace('-', '/') + ' ' + ev.event.title.slice(0, 12) : ev.horizon_days + ' 日') + ' · 事件路径', color: GC.C.blue, median: med(ev, e1), items: ev.items.map(function (i) { return { label: i.label, p: i.p, lo: i.lo, hi: i.hi, mode: i.mode }; }) },
             { name: rg.horizon_months + ' 个月 · 体制情景', color: GC.C.orange, median: med(rg, e2), items: rg.items.map(function (i) { return { label: i.label, p: i.p, lo: i.lo, hi: i.hi, mode: i.mode }; }) }] });
  })();

  // 提醒
  (function alerts() {
    var ul = document.getElementById('alerts'); var al = ST.alerts || [];
    var h2 = document.getElementById('b6'); h2.innerHTML = '提醒 <span class="q">高 = 定时事件、体制切换、预注册条件或两信号共振，推飞书；中 = 单一信号，页面亮</span><span class="meta">' + esc(ST.alerts_push || '') + '</span>';
    ul.innerHTML = al.length ? al.slice().reverse().slice(0, 12).map(function (a) { return '<li class="' + (a.sev === '高' ? 'hi' : 'mid') + (a.date === ST.as_of || a.date > ST.as_of ? ' unread' : '') + '"><span class="d">' + a.date.slice(5) + '</span><span class="sev">' + a.sev + '</span><span class="t">' + esc(a.text) + '</span><span class="ch">' + (a.push ? '推送' : '页面') + '</span></li>'; }).join('') : '<li><span class="d"></span><span class="sev"></span><span class="t">无</span><span class="ch"></span></li>';
    var n = al.filter(function (a) { return a.sev === '高'; }).length, m = al.filter(function (a) { return a.sev === '中'; }).length;
    var cell = document.querySelectorAll('#cells .cell')[4]; if (cell) cell.innerHTML = '<div class="k">近 7 日提醒</div><div class="v"><span class="num">' + al.length + '</span><span class="word">' + n + ' 高 ' + m + ' 中</span></div>';
  })();

  // 校准
  (function calib() {
    var C = ST.calibration || {}; var sec = document.getElementById('b7'); var body = sec.parentNode.querySelector('.placeholder');
    sec.innerHTML = '我的判断准不准 <span class="q">样本随周报累积</span>';
    body.className = 'cal';
    body.innerHTML = '<div><div class="k">概率打分 Brier</div><div class="v">' + (C.brier && C.brier.brier !== null ? C.brier.brier : '—') + '</div><div class="s">越低越好，已结算 ' + (C.brier ? C.brier.n : 0) + ' 期</div></div>' +
      '<div><div class="k">预判命中</div><div class="v">' + (C.hit_rate ? C.hit_rate.confirmed + ' / ' + (C.hit_rate.confirmed + C.hit_rate.refuted) : '—') + '</div><div class="s">确认 / (确认 + 证伪)</div></div>' +
      '<div><div class="k">叙事切换领先天数</div><div class="v">' + (C.lead_days && C.lead_days.median_days !== null ? C.lead_days.median_days + ' 天' : '—') + '</div><div class="s">样本 ' + (C.lead_days ? C.lead_days.n : 0) + '，来自周日裁决</div></div>' +
      '<div><div class="k">按建议利用率的假想收益</div><div class="v ' + (C.pnl && C.pnl.excess_pct > 0 ? 'up' : C.pnl && C.pnl.excess_pct < 0 ? 'down' : '') + '">' + (C.pnl && C.pnl.n ? (C.pnl.excess_pct >= 0 ? '+' : '') + C.pnl.excess_pct + ' 个点' : '—') + '</div><div class="s">对比买入持有，自 ' + (C.pnl && C.pnl.since ? C.pnl.since : '—') + '</div></div>';
  })();

  // 简报按钮：显示最近一期简报
  (function brief() {
    var b = document.getElementById('btn-brief'); if (!b) return;
    if (ST.briefs && ST.briefs.length) { b.disabled = false; b.title = '最近简报 ' + ST.briefs[ST.briefs.length - 1]; b.addEventListener('click', function () { window.open('history.html#briefs', '_blank'); }); }
  })();
  var f = document.getElementById('footer'); if (f) f.innerHTML += ' <a href="history.html" style="color:var(--accent)">历史：决策日志、简报、警报、情景存档 →</a>';
})();
