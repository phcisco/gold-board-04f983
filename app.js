/* 黄金大作手 · 第 1 期页面逻辑：读 GOLDOPS_DAILY / GOLDOPS_STATE，渲染顶栏、行情板一级卡、块一三四、提醒与引擎面板。
   语言规范见 DESIGN §10.3：主屏无代号；每个数字带位置词与含义词；一句一行。 */
(function () {
  'use strict';
  var D = window.GOLDOPS_DAILY, ST = window.GOLDOPS_STATE, GC = window.GoldCharts;
  if (!D || !ST || !GC) { document.body.insertAdjacentHTML('afterbegin', '<p style="padding:20px">缺少数据文件：请先运行 goldops daily 生成 web/data/daily.js 与 state.js。</p>'); return; }
  var root = document.documentElement;
  var CN = { rates: '利率主导', credit: '主权信用', haven: '避险主导', squeeze: '资金挤压', momentum: '动量主导' };
  var ORDER = ['rates', 'credit', 'haven', 'squeeze', 'momentum'];
  GC.setRegimes(D.series.REGIME_BAND);

  // ---------- 工具 ----------
  window.GO = window.GO || {};
  var S = window.GO.S = function (name) { var a = D.series[name] || []; return { dates: a.map(function (x) { return GC.pd(x[0]); }), values: a.map(function (x) { return x[1]; }), iso: a.map(function (x) { return x[0]; }) }; };
  var last = window.GO.last = function (name, k) { var a = D.series[name] || []; k = k || 0; return a.length > k ? a[a.length - 1 - k][1] : null; };
  var fmtN = window.GO.fmtN = function (v, nd) { if (v === null || v === undefined || isNaN(v)) return '—'; nd = nd === undefined ? 2 : nd; var s = Math.abs(v).toFixed(nd); s = s.replace(/\B(?=(\d{3})+(?!\d))/g, ','); return (v < 0 ? '−' : '') + s; };
  var signed = window.GO.signed = function (v, nd, unit) { if (v === null || v === undefined || isNaN(v)) return '—'; return (v > 0 ? '+' : (v < 0 ? '−' : '')) + fmtN(Math.abs(v), nd) + (unit || ''); };
  var cls = function (v) { return v > 0 ? 'up' : (v < 0 ? 'down' : ''); };
  var arrow = function (v) { return v > 0 ? '▲' : (v < 0 ? '▼' : '—'); };
  var el = GC.el;
  var esc = window.GO.esc = function (s) { return String(s === null || s === undefined ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  function chgText(r) { if (r.chg === null || r.chg === undefined) return '—'; if (r.chg_kind === 'pct') return arrow(r.chg) + Math.abs(r.chg).toFixed(1) + '% ' + r.chg_label; if (r.chg_kind === 'bp') return arrow(r.chg) + Math.abs(r.chg) + 'bp ' + r.chg_label; return arrow(r.chg) + fmtN(Math.abs(r.chg), 1) + (r.unit || '') + ' ' + r.chg_label; }
  var RG = ST.regime; var isRates = RG.state === 'rates', isCredit = RG.state === 'credit';
  var TODAY = window.GO.TODAY = (function () { var d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); })();

  // ---------- 顶栏 ----------
  (function header() {
    document.getElementById('asof').textContent = D.as_of + ' 收盘 · 生成 ' + D.generated;
    var gold = D.cards.gold[0]; var g = S('G');
    var wk = g.values.length > 5 ? (g.values[g.values.length - 1] / g.values[g.values.length - 6] - 1) * 100 : null;
    var stars3 = ST.events.filter(function (e) { return e.stars >= 3 && e.date >= TODAY; }).slice(0, 2);
    var cells = document.getElementById('cells');
    cells.innerHTML =
      '<div class="cell"><div class="k">金价 · 现货 XAUUSD 纽约收盘 · ' + D.as_of.slice(5).replace('-', '/') + '</div><div class="v"><span class="num">' + fmtN(gold.value, 0) + '</span><span class="word"><span class="' + cls(gold.chg) + '">' + arrow(gold.chg) + Math.abs(gold.chg).toFixed(1) + '%</span> 日 · <span class="' + cls(wk) + '">' + arrow(wk) + Math.abs(wk || 0).toFixed(1) + '%</span> 周</span></div></div>' +
      '<div class="cell"><div class="k">定价模式</div><div class="v"><span class="modes">' + ORDER.map(function (k) { return '<span class="' + (k === RG.state ? 'on' : '') + '">' + CN[k] + '</span>'; }).join('') + '</span><span class="word" title="领先权重 / 已投权重；' + (RG.prev ? '之前 ' + RG.prev.start + ' 至 ' + RG.prev.end + ' 为' + RG.prev.cn : '') + '">' + (RG.state === 'rates' || RG.state === 'credit' ? RG.rates_w + '/' + (RG.rates_w + RG.credit_w) + ' 票' : '否决层') + ' · 自 ' + RG.since.slice(5).replace('-', '/') + (RG.candidate ? ' · 切换中→' + CN[RG.candidate] + ' ' + RG.streak + '/3' : '') + '</span></div></div>' +
      '<div class="cell"><div class="k">下两个三星事件</div><div class="v"><span>' + (stars3.length ? stars3.map(function (e) { return e.date.slice(5).replace('-', '/'); }).join(' · ') : '—') + '</span><span class="word">' + stars3.map(function (e) { return esc(e.title); }).join(' · ') + '</span></div></div>' +
      '<div class="cell"><div class="k">建议仓位 · 姿态</div><div class="v"><span class="num">—</span><span class="word">第 2 期接入 · 风险折减 ×' + ST.risk_haircut.haircut + '</span></div></div>' +
      '<div class="cell"><div class="k">近 7 日触发的预注册条件</div><div class="v"><span class="num" id="n-alerts">0</span><span class="word" id="alerts-word"></span></div></div>';
  })();

  // ---------- 一级卡 ----------
  var CARDS = [
    { id: 'gold', title: '金价', sub: '现货金 · 白银 · 矿股', t2: 't2-gold' },
    { id: 'rates', title: '利率', sub: '美债名义收益率', t2: 't2-rates' },
    { id: 'usd', title: '美元', sub: '推导指数与货币对', t2: 't2-usd' },
    { id: 'risk', title: '风险与流动性', sub: '股市 · 波动 · 信用', t2: 't2-risk' },
    { id: 'infl', title: '油价与通胀', sub: 'Brent · PCE · 通胀预期', t2: 't2-infl' },
    { id: 'flow', title: '买家与持仓', sub: '从快钱到央行', t2: 't2-flow' }
  ];
  var SPARK_COLOR = { G: GC.C.gold, SILVER: GC.C.magenta, GDX: GC.C.orange, Y2: GC.C.blue, Y10: GC.C.blue, Y30: GC.C.blue, DXY: GC.C.blue, USDJPY: GC.C.orange, USDCNY: GC.C.aqua, SPX: GC.C.aqua, VIX: GC.C.aqua, HY: GC.C.aqua, BRENT: GC.C.orange, PCE_M: GC.C.orange, BE: GC.C.orange, LEG_W: GC.C.blue, ETF_W: GC.C.orange, PBOC_M: GC.C.blue };
  function readLine(id) {
    var LD = ST.ladders && ST.ladders[id];
    if (LD && LD.cell !== null && LD.cell !== undefined) return [LD.imp, LD.word, LD.text];
    var F = RG.features || {}, L = D.levels, c = D.corr;
    var r = D.cards[id];
    if (id === 'gold') return ['neu', '中性', (isRates ? '利率主导下随实际利率与美元反向' : isCredit ? '主权信用下与实际利率脱钩' : CN[RG.state] + '下') + '，本周 ' + signed(pctWk('G'), 1, '%')];
    if (id === 'rates') { var w2 = pctDiffWk('Y2') * 100; var flat = F.s2s30_trend20 !== null && F.s2s30_trend20 <= 0; if (w2 > 3 && flat) return ['bear', '利空', '2 年期周内 ' + signed(w2, 0, 'bp') + ' 且曲线走平，加息预期在加码']; if (w2 < -3) return ['bull', '利多', '2 年期周内 ' + signed(w2, 0, 'bp') + '，加息预期在退']; return ['neu', '中性', '2 年期周内 ' + signed(w2, 0, 'bp') + '，长短端利差 ' + L.s2s30 + 'bp']; }
    if (id === 'usd') { var w = pctWk('DXY'); if (w > 0.5) return ['bear', '利空', '美元周内 ' + signed(w, 1, '%') + '，压制金价']; if (w < -0.5) return ['bull', '利多', '美元周内 ' + signed(w, 1, '%')]; return ['neu', '中性', '美元周内 ' + signed(w, 1, '%') + '，金价的解释不在美元']; }
    if (id === 'risk') { if (F.vix > 25 || (F.hy_5d_bp !== null && F.hy_5d_bp > 50)) return ['risk', '风险', '恐慌指标抬升，挤压判据在逼近']; if (c['D.CORR_SPX60'] > 0.3) return ['risk', '风险', '金价与美股 60 日相关 ' + c['D.CORR_SPX60'].toFixed(2) + '，没有避险买盘；回撤时先被当流动性卖']; return ['neu', '中性', '金价与美股 60 日相关 ' + (c['D.CORR_SPX60'] || 0).toFixed(2) + '，无恐慌']; }
    if (id === 'infl') { var b = pctWk('BRENT'); if (isRates && b > 3) return ['bear', '利空', '利率主导下油价周涨 ' + b.toFixed(1) + '% 等于加息预期涨']; if (isCredit && b > 3) return ['bull', '利多', '主权信用下油涨即通胀与避险']; return ['neu', '中性', 'Brent 周内 ' + signed(b, 1, '%') + '，核心 PCE ' + r[1].value + '%']; }
    if (id === 'flow') { var h = ST.risk_haircut; var mm = h.mm_pct5y, lg = h.legacy_pct5y; var s = []; if (lg > 90) s.push('慢钱满仓（五年 ' + Math.round(lg) + '%）'); else s.push('慢钱五年 ' + Math.round(lg || 0) + '%'); if (mm !== null) s.push(mm > 90 ? '快钱拥挤' : '快钱不拥挤（五年 ' + Math.round(mm) + '%）'); return [lg > 90 || mm > 90 ? 'risk' : 'neu', lg > 90 || mm > 90 ? '风险' : '中性', s.join('、')]; }
    return ['neu', '中性', ''];
  }
  function pctWk(name) { var a = D.series[name]; if (!a || a.length < 6) return 0; return (a[a.length - 1][1] / a[a.length - 6][1] - 1) * 100; }
  function pctDiffWk(name) { var a = D.series[name]; if (!a || a.length < 6) return 0; return a[a.length - 1][1] - a[a.length - 6][1]; }
  // 5 个最重要变化：18 个卡片数中 |60 日 z| 最大的 5 个
  var allRows = []; CARDS.forEach(function (c) { D.cards[c.id].forEach(function (r) { allRows.push({ card: c.id, row: r }); }); });
  var hot = allRows.filter(function (x) { return x.row.z60 !== null && x.row.z60 !== undefined; }).sort(function (a, b) { return Math.abs(b.row.z60) - Math.abs(a.row.z60); }).slice(0, 5);
  var hotSet = {}; hot.forEach(function (x) { hotSet[x.row.sid] = true; });
  function ladderHTML(id) {
    var L = ST.ladders && ST.ladders[id]; if (!L || L.cell === null || L.cell === undefined) return '';
    var fv = function (v, nd) { return v === null || v === undefined ? '—' : fmtN(v, nd); };
    var val = (L.signed ? signed(L.value, L.nd) : fv(L.value, L.nd)) + (L.unit ? (L.unit === '%' ? '' : ' ') + L.unit : '');
    var src = function (s) { return s.source === '校准' ? '<i title="十年分位校准">◦</i>' : ''; };
    return '<div class="ladder" title="' + esc(L.qty) + '：' + esc(L.lo.meaning) + '；' + esc(L.hi.meaning) + (L.note ? '。' + esc(L.note) : '') + '"><span class="lq">' + esc(L.qty) + '</span>' +
      '<span class="lc' + (L.cell === 0 ? ' on' : '') + '"><b>＜' + esc(L.lo.label) + '</b>' + src(L.lo) + '<small>' + esc(L.cells[0]) + '</small></span>' +
      '<span class="lc mid' + (L.cell === 1 ? ' on' : '') + '"><b>' + val + '</b><small>' + esc(L.cells[1]) + '</small></span>' +
      '<span class="lc' + (L.cell === 2 ? ' on' : '') + '"><b>＞' + esc(L.hi.label) + '</b>' + src(L.hi) + '<small>' + esc(L.cells[2]) + '</small></span></div>';
  }
  (function cards() {
    var t1 = document.getElementById('t1');
    t1.innerHTML = CARDS.map(function (c) {
      var rl = readLine(c.id); var rows = D.cards[c.id];
      var nchains = (window.GO.chainCount && window.GO.chainCount[c.id]) || '';
      return '<div class="k1 ' + rl[0] + '" tabindex="0" role="button" aria-expanded="false" data-t2="' + c.t2 + '"><h3>' + c.title + ' <span class="n">' + c.sub + '</span><span class="chev" data-chev="' + c.id + '">诠释</span></h3><div class="rows">' +
        rows.map(function (r) { return '<div class="row' + (hotSet[r.sid] ? ' hot' : '') + '"><span class="l">' + r.label + '</span><span class="v">' + fmtN(r.value, r.value !== null && Math.abs(r.value) >= 1000 ? 0 : (r.unit === '%' ? 2 : (Math.abs(r.value) < 10 ? 2 : 1))) + (r.unit && r.unit !== '%' ? ' ' + r.unit : (r.unit || '')) + '</span><span class="cp"><span class="c ' + cls(r.chg) + '">' + chgText(r) + '</span><span class="pw' + (r.pct10 !== null && (r.pct10 >= 97 || r.pct10 <= 3) ? ' x' : '') + '">' + (r.pos || '') + '</span></span><span class="spark" id="sp-' + r.spark + '"></span></div>'; }).join('') +
        '</div>' + ladderHTML(c.id) + '<div class="read"><span class="imp ' + rl[0] + '">' + rl[1] + '</span>' + rl[2] + '</div></div>';
    }).join('');
    allRows.forEach(function (x) { var r = x.row; var a = D.series[r.spark] || []; var vals = a.slice(-60).map(function (p) { return p[1]; }); if (vals.length > 2) GC.sparkline(document.getElementById('sp-' + r.spark), vals, SPARK_COLOR[r.spark] || GC.C.grey); });
    // 金点清单
    var byS = {}; ST.hypotheses.forEach(function (h) { h.indicators.forEach(function (i) { (byS[i.series] = byS[i.series] || []).push(h); }); });
    document.getElementById('top5').innerHTML = '<h3>本周最重要的 5 个变化</h3>' + hot.map(function (x, i) {
      var r = x.row; var hs = (byS[r.sid] || []).slice(0, 2);
      return '<div><span class="i">' + (i + 1) + '</span><span class="s"><b>' + r.label + ' ' + chgText(r) + '。</b>' + (r.pos ? r.pos + '；' : '') + '这个变化相对过去 60 个同类变化 z = ' + signed(r.z60, 1) + '</span><span class="to">' + hs.map(function (h) { return '<span class="story">' + h.screen + '</span>'; }).join('') + '</span></div>';
    }).join('');
  })();

  // ---------- 块一 ----------
  (function blockOne() {
    var F = RG.features || {}, A = D.attribution, c = D.corr;
    document.getElementById('b1-meta').textContent = '数据到 ' + D.as_of + ' 收盘';
    var lead = { rates: '黄金现在跟着实际利率与美元的定价走，不是避险，也不是财政。', credit: '黄金现在与实际利率脱钩，跟着主权与货币信用的重估走。', haven: '黄金现在是避险资产，股跌金涨。', squeeze: '流动性挤压：黄金被当流动性卖，与一切同跌。', momentum: '宏观解释不了当前金价，趋势资金在定价。' }[RG.state];
    var chain = { rates: ['经济数据', '2 年期利率', '美元', '黄金'], credit: ['财政与信用', '长端与期限溢价', '美元', '黄金'], haven: ['风险事件', '股市', '黄金'], squeeze: ['去杠杆', '美元', '一切资产', '黄金'], momentum: ['趋势资金', '持仓', '黄金'] }[RG.state];
    var votes = RG.votes || {};
    var vDef = [
      ['v1_real_corr', '金价与实际利率 40 日相关 ' + fmt(F.corr_real40), '权重 1'],
      ['v1b_resid', '60 日残差脱钩 ' + signed(F.resid60, 1, ' 个百分点'), '权重 2'],
      ['v2_oil_corr', '金价与油价 40 日相关 ' + fmt(F.corr_brent40), '权重 1'],
      ['v3_real_share', '近 20 日利率上行中实际利率占 ' + (F.real_share20 === null ? '—' : Math.round(F.real_share20 * 100) + '%'), '权重 1'],
      ['v4_curve', '长短端利差 20 日 ' + signed(F.s2s30_trend20, 0, 'bp'), '权重 1']
    ];
    var vetoes = [
      ['不是流动性挤压', '股金 20 日相关 ' + fmt(F.corr_spx20) + '，美元 5 日 ' + signed(F.dxy_5d, 1, '%') + '，VIX ' + fmt(F.vix, 1), RG.state !== 'squeeze'],
      ['不是避险主导', '股金 20 日相关 ' + fmt(F.corr_spx20) + '，美股大跌日金价平均 ' + signed((F.haven_avg_ret || 0) * 100, 2, '%') + '，样本 ' + (F.haven_n || 0) + ' 天', RG.state !== 'haven'],
      ['不是动量主导', '六因子 40 日解释力 ' + fmt(F.adj_r2_40) + '，趋势强度 ' + fmt(F.trend_strength), RG.state !== 'momentum']
    ];
    var html = '<div class="attr"><div><p class="head1">' + lead + '</p><div class="chain">' + chain.map(function (x, i) { return '<span' + (i === chain.length - 1 ? ' class="gold"' : '') + '>' + x + '</span>' + (i < chain.length - 1 ? '<i>→</i>' : ''); }).join('') + '</div>' +
      '<div class="corr">40 日相关：金价×实际利率 <span>' + fmt(c['D.CORR_REAL40']) + '</span> · ×2 年期 <span>' + fmt(c['D.CORR_2Y40']) + '</span> · ×美元 <span>' + fmt(c['D.CORR_DXY40']) + '</span> · ×美股 <span>' + fmt(c['D.CORR_SPX40']) + '</span> · ×比特币 60 日 <span>' + fmt(c['D.CORR_BTC60']) + '</span></div>' +
      '<ul class="lines"><li><b>切换史</b><span>' + (ST.regime.episodes || []).slice(-6).map(function (e) { return e.start.slice(0, 7).replace('-', '/') + ' ' + e.cn + '（' + e.days + ' 天）'; }).join('；') + '</span></li>' +
      '<li><b>回测</b><span>' + RG.backtest_gate + '</span></li></ul></div>' +
      '<div><div class="chart" id="ch-attr" style="position:relative;background:var(--raised);border-radius:8px;padding:6px 6px 2px"></div><div class="figcap"><b>' + (A.date ? A.date.slice(5).replace('-', '/') : '') + ' 金价 ' + signed(A.total, 2, '%') + ' 的归因</b> · 40 日 β × 当日变动，残差为头寸与流量</div></div></div>' +
      '<details><summary>判据：三个否决项与利率锚投票</summary><ul class="crit">' +
      vetoes.map(function (v) { return '<li><span class="' + (v[2] ? 'ok' : 'muted') + '">' + (v[2] ? '✓' : '●') + '</span><span>' + v[0] + '：' + v[1] + '</span><span class="muted">否决项</span></li>'; }).join('') +
      vDef.map(function (v) { var r = votes[v[0]]; return '<li><span class="' + (r ? 'ok' : 'muted') + '">' + (r ? (r === 'rates' ? '利' : '信') : '·') + '</span><span>' + v[1] + (r ? ' → ' + CN[r] : ' → 弃权') + '</span><span class="muted">' + v[2] + '</span></li>'; }).join('') +
      '</ul></details>';
    document.getElementById('b1-body').innerHTML = html;
    if (A.items && A.items.length) GC.waterfall(document.getElementById('ch-attr'), A.items.map(function (i) { return { name: i.name, v: i.v }; }));
    function fmt(v, nd) { return v === null || v === undefined ? '—' : Number(v).toFixed(nd === undefined ? 2 : nd); }
  })();

  // ---------- 块三 ----------
  (function blockThree() {
    var hs = ST.hypotheses.slice();
    var pWord = function (p) { return p === null ? '无定价输入' : p >= 80 ? '基本已定价' : p >= 60 ? '大部分已定价' : p >= 40 ? '半信半疑' : p >= 20 ? '几乎没人信' : '无人问津'; };
    var eWord = function (e) { return e === null ? '—' : e >= 75 ? '强' : e >= 60 ? '中等偏强' : e >= 45 ? '中等' : e >= 30 ? '偏弱' : '弱'; };
    function verdict(h) { var s = h.scores, E = s.evidence, P = s.priced, M = s.marginal; if (P !== null && E !== null && P >= 70 && E >= 65) return ['gold', '拥挤']; if (P !== null && E !== null && E - P >= 15) return ['bull', '便宜']; if (M !== null && M <= -10 && P !== null && P >= 60) return ['risk', '在破裂']; if (M !== null && M <= -10) return ['neutral', '退潮']; if (M !== null && M >= 10) return ['bear', '上升']; return ['neutral', '候选']; }
    function nextTest(h) { var best = null; ['confirm', 'falsify'].forEach(function (k) { (h.tests[k] || []).forEach(function (t) { if (t.status !== 'pending') return; var m = String(t.event || '').match(/\d{4}-\d{2}-\d{2}/); var d = m ? m[0] : null; if (!best || (d && (!best.d || d < best.d))) best = { d: d, t: t, k: k }; }); }); return best; }
    var ranked = hs.filter(function (h) { return h.direction !== 'risk' && h.scores.value !== null && h.scores.value !== undefined; }).sort(function (a, b) { return b.scores.value - a.scores.value; });
    var top = ranked.slice(0, 4); var rest = hs.filter(function (h) { return top.indexOf(h) < 0 && h.direction !== 'risk'; });
    var risks = hs.filter(function (h) { return h.direction === 'risk' || h.id === 'E1' || h.id === 'E3'; });
    var html = '<div class="cards">' + top.map(function (h) {
      var s = h.scores, v = verdict(h), nt = nextTest(h);
      var contribs = (h.contribs || []).filter(function (c) { return c.available; }).length + '/' + (h.contribs || []).length;
      return '<article class="card ' + { gold: 'crowd', bull: 'cheap', risk: 'crack', neutral: 'fade', bear: 'fade' }[v[0]] + '"><h3>「' + h.screen + '」<small>' + h.name + ' · 指标可得 ' + contribs + '</small></h3><div class="meters">' +
        '<div class="meter believe"><span class="k">市场信了多少</span><div class="bar"><b style="--v:' + (s.priced || 0) + '"></b></div><span class="w">' + pWord(s.priced) + '</span></div>' +
        '<div class="meter evidence"><span class="k">证据有多硬</span><div class="bar"><b style="--v:' + (s.evidence || 0) + '"></b></div><span class="w">' + eWord(s.evidence) + '</span></div></div>' +
        '<div class="verdict"><b class="chip ' + v[0] + '">' + v[1] + '</b>' + h.mechanism + '。十日边际 ' + signed(s.marginal, 0) + '。</div>' +
        '<div class="next"><b>下次检验</b><span>' + (nt ? (nt.d ? nt.d.slice(5).replace('-', '/') + ' ' : '每日 ') + nt.t.condition + (nt.t.last_value !== undefined ? '（现 ' + nt.t.last_value + '）' : '') : '无预注册条件') + '</span></div></article>';
    }).join('') + '</div>' +
      '<details><summary>其余 ' + rest.length + ' 个故事</summary><div class="others">' + rest.map(function (h) { return '「' + h.screen + '」<span class="st">证据 ' + eWord(h.scores.evidence) + (h.scores.value !== null && h.scores.value !== undefined ? ' · V ' + h.scores.value : ' · 无定价输入') + '</span>'; }).join(' · ') + '</div></details>' +
      '<div class="risks">' + risks.slice(0, 2).map(function (h) { var ev = h.scores.evidence; return '<div><b>「' + h.screen + '」证据 ' + eWord(ev) + '。</b>' + h.mechanism + '</div>'; }).join('') + '</div>';
    document.getElementById('b3-body').innerHTML = html;
  })();

  // ---------- 块四 ----------
  (function blockFour() {
    var evs = ST.events.filter(function (e) { return e.kind !== 'ERROR'; });
    var today = TODAY;
    document.getElementById('b4-body').innerHTML = '<ul class="agenda">' + evs.map(function (e) {
      var past = e.date < today, isToday = e.date === today;
      var look = e.hypotheses.filter(function (h) { return h.condition; }).map(function (h) { return h.condition; }).slice(0, 2).join('；');
      return '<li class="' + (past ? 'done' : isToday ? 'today' : '') + '"><div class="d"><b>' + e.date.slice(5).replace('-', '/') + '</b><small>' + (e.time_et || '') + '</small></div><div class="e"><div class="ev">' + esc(e.title) + '<span class="star">' + '★'.repeat(e.stars || 0) + '</span></div><div class="look"><b>看</b>' + (esc(look) || '来源 ' + esc(e.source)) + '</div></div><div class="to">' + e.hypotheses.slice(0, 3).map(function (h) { return '<span class="story">' + h.screen + '</span>'; }).join('') + '</div></li>';
    }).join('') + '</ul>' + eventStudyHTML();
    var ES = ST.event_study;
    if (ES && ES.heat && ES.heat.rows.length) GoldCharts.heatmap(document.getElementById('es-heat'), ES.heat.rows, ES.heat.cols, ES.heat.matrix, ES.heat.scales, ES.heat.units);

    function eventStudyHTML() {
      var ES = ST.event_study;
      if (!ES || ES.error) return '<div class="gen">事件研究暂不可用' + (ES && ES.error ? '：' + esc(ES.error) : '') + '。</div>';
      var up = ES.upcoming, K = up && ES.kinds[up.kind];
      var f1 = function (v, u) { if (v === null || v === undefined) return '—'; var s = u === 'bp' ? String(Math.round(v)) : Number(v).toFixed(1); if (/^-0(\.0)?$/.test(s)) s = s.slice(1); return (Number(s) > 0 ? '+' : '') + s + (u === 'bp' ? '' : '%'); };
      var html = '<div class="es">';
      if (up && K && K.n) html += '<p class="es-lead"><b>历史上这种日子怎么走</b>' + esc(up.summary) + '</p>';
      html += '<div class="heat" id="es-heat"></div><div class="es-note">近三年（' + ES.samples.recent_from.slice(0, 4) + ' 年 ' + Number(ES.samples.recent_from.slice(5, 7)) + ' 月起）各资产在公布日的平均变动。鹰读 / 鸽读 = 2 年期当天上行 / 下行超过 ' + ES.read_threshold_bp + ' 个基点（平常日子 |变动| 的中位数），其余中性不列。</div>';
      if (K && K.recent_events && K.recent_events.length) {
        var cols = ES.assets;
        html += '<details class="es-more"><summary>近 ' + K.recent_events.length + ' 次' + esc(K.label) + '逐次反应 · 十年样本 · 口径</summary><div class="tablewrap"><table><thead><tr><th>日期</th><th>读法</th>' + (up.kind === 'FOMC' ? '<th>决议</th>' : '') + cols.map(function (a) { return '<th>' + a.name + (a.unit === 'bp' ? ' bp' : ' %') + '</th>'; }).join('') + '<th>五日金价</th></tr></thead><tbody>' +
          K.recent_events.map(function (e) { return '<tr><td>' + e.date.slice(2) + (e.unscheduled ? '<small> 紧急</small>' : '') + '</td><td class="t">' + e.read + '</td>' + (up.kind === 'FOMC' ? '<td class="t">' + (e.decision || '—') + '</td>' : '') + cols.map(function (a) { var v = e.moves[a.name]; return '<td class="' + (v > 0 ? 'up' : v < 0 ? 'down' : '') + '">' + f1(v, a.unit) + '</td>'; }).join('') + '<td class="' + (e.gold_5d > 0 ? 'up' : e.gold_5d < 0 ? 'down' : '') + '">' + f1(e.gold_5d) + '</td></tr>'; }).join('') + '</tbody></table></div>';
        var F = K.stats.full, R = K.stats.recent, bd = K.by_decision;
        html += '<div class="es-note">十年样本（' + ES.samples.full_from.slice(0, 4) + ' 年起 ' + F.n + ' 次）：公布日金价平均 ' + f1(F.mean) + '，' + Math.round(F.hit_up * 100) + '% 的日子收涨，平均波动 ±' + Number(F.mean_abs).toFixed(1) + '%（平常日子的 ' + F.ratio_vs_normal + ' 倍），次日平均 ' + f1(F.next) + '，五日平均 ' + f1(F.five) + '。近三年 ' + R.n + ' 次：平均 ' + f1(R.mean) + '，' + Math.round(R.hit_up * 100) + '% 收涨，次日 ' + f1(R.next) + '，五日 ' + f1(R.five) + '。' +
          (bd ? '按决议分（十年）：' + Object.keys(bd).filter(function (k) { return k !== '不明'; }).map(function (k) { return k + ' ' + bd[k].n + ' 次金价平均 ' + f1(bd[k].gold_mean); }).join('，') + '。' : '') + '</div>';
        html += '<div class="es-note">口径：事件日 = 前一交易日收盘到公布日收盘（FOMC 14:00、CPI 与非农 8:30 美东，都在当日纽约收盘内）；金价为现货 XAUUSD 纽约收盘（新浪，B），利率为 FRED 日终（A），美元为推导指数；公布日非交易日时顺延到下一交易日。日期来源：FOMC 为联储日历页与历史年份页（A），CPI 与非农为 ALFRED 的版本日期即 BLS 实际发布日（A，含停摆顺延与缺月）。日历更新于 ' + (ES.as_of || '—') + (ES.stale_error ? '（本次刷新失败，沿用缓存）' : '') + '。</div></details>';
      }
      return html + '</div>';
    }
  })();

  // ---------- 提醒（预注册条件触发）----------
  (function alerts() {
    var items = [];
    ST.hypotheses.forEach(function (h) { ['confirm', 'falsify'].forEach(function (k) { (h.tests[k] || []).forEach(function (t) { if (t.status === 'confirmed' || t.status === 'refuted') items.push({ d: t.triggered || t.last_checked || '', sev: k === 'falsify' ? '高' : '中', text: '「' + h.screen + '」' + (t.status === 'confirmed' ? '确认条件成立' : '证伪条件触发') + '：' + t.condition + '（现 ' + t.last_value + '）' }); }); }); });
    items.sort(function (a, b) { return b.d.localeCompare(a.d); });
    document.getElementById('alerts').innerHTML = items.length ? items.map(function (a) { return '<li class="' + (a.sev === '高' ? 'hi' : 'mid') + ' unread"><span class="d">' + a.d.slice(5) + '</span><span class="sev">' + a.sev + '</span><span class="t">' + a.text + '</span><span class="ch">页面</span></li>'; }).join('') : '<li><span class="d"></span><span class="sev"></span><span class="t">无</span><span class="ch"></span></li>';
    document.getElementById('n-alerts').textContent = items.length; document.getElementById('alerts-word').textContent = items.filter(function (a) { return a.sev === '高'; }).length + ' 高 ' + items.filter(function (a) { return a.sev === '中'; }).length + ' 中';
    document.getElementById('haircut').textContent = '×' + ST.risk_haircut.haircut + (ST.risk_haircut.reasons.length ? '（' + ST.risk_haircut.reasons.join('；') + '）' : '（无折减）');
  })();

  // ---------- 引擎面板 ----------
  (function engine() {
    var hs = ST.hypotheses.slice().sort(function (a, b) { return (b.scores.value || -1) - (a.scores.value || -1); });
    var rows = hs.map(function (h) { var s = h.scores; return '<tr><td>' + h.id + '</td><td class="t">' + h.name + '</td><td class="t">' + h.screen + '</td><td>' + h.slot + '</td><td>' + n(s.evidence) + '</td><td>' + n(s.priced) + '</td><td>' + n(s.marginal) + '</td><td>' + n(s.divergence) + '</td><td>' + n(s.tension) + '</td><td>' + h.days_to_test + '</td><td class="t">' + h.state + '</td><td>' + n(s.value) + '</td></tr>'; }).join('');
    var F = RG.features || {};
    var fv = Object.keys(F).map(function (k) { return '<tr><td class="t">' + k + '</td><td>' + n(F[k], 3) + '</td></tr>'; }).join('');
    var c = D.corr; var cm = Object.keys(c).map(function (k) { return '<tr><td class="t">' + k.replace('D.CORR_', '') + '</td><td>' + n(c[k]) + '</td></tr>'; }).join('');
    document.getElementById('engine-body').innerHTML = '<div><h3>假说记分板（E 证据 · P 定价 · M 十日边际 · D 分歧 · T 张力 · 距判决天数 · V）</h3><div class="tablewrap"><table><thead><tr><th>代号</th><th>假说</th><th>屏幕名</th><th>槽位</th><th>E</th><th>P</th><th>M</th><th>D</th><th>T</th><th>天</th><th>状态</th><th>V</th></tr></thead><tbody>' + rows + '</tbody></table></div></div>' +
      '<div><h3>体制判别特征（今日）· 状态 ' + RG.state + ' · 原始 ' + RG.raw + ' · 票 ' + RG.rates_w + ':' + RG.credit_w + '</h3><div class="tablewrap"><table><tbody>' + fv + '</tbody></table></div></div>' +
      '<div><h3>金价与因子相关（变动之间）</h3><div class="tablewrap"><table><tbody>' + cm + '</tbody></table></div></div>' +
      calibHTML() +
      '<div><h3>预测市场与期权快照</h3><pre class="gen" style="white-space:pre-wrap">' + JSON.stringify(D.snapshots, null, 1) + '</pre></div>';
    function calibHTML() {
      var ES = ST.event_study, up = ES && ES.upcoming, H = up && up.horizon, EP = ST.action && ST.action.tree && ST.action.tree.event_path;
      var LD = ST.ladders || {}, CT = ST.calibration_thresholds || {};
      var rows = Object.keys(LD).filter(function (k) { return LD[k] && LD[k].lo; }).map(function (k) { var L = LD[k]; return '<tr><td class="t">' + k + '</td><td class="t">' + L.qty + '</td><td>' + L.lo.label + '</td><td class="t">' + L.lo.source + '</td><td>' + L.hi.label + '</td><td class="t">' + L.hi.source + '</td><td>' + (L.value === null ? '—' : L.value) + '</td><td class="t">' + L.cells[L.cell] + ' · ' + L.word + '</td></tr>'; }).join('');
      var h = '<div><h3>阈值梯（DESIGN §10.6）· 校准 ' + (CT.as_of || '—') + '，样本 ' + (CT.sample ? CT.sample.from + ' → ' + CT.sample.to : '—') + '</h3><div class="tablewrap"><table><thead><tr><th>卡</th><th>量</th><th>下阈值</th><th>来源</th><th>上阈值</th><th>来源</th><th>现值</th><th>所在格</th></tr></thead><tbody>' + rows + '</tbody></table></div></div>';
      var RS = ST.reaction_stats || {};
      Object.keys(RS).forEach(function (k) {
        var r = RS[k]; var keys = ['hawk', 'neutral', 'dove'], lab = { hawk: '鹰读', neutral: '中性', dove: '鸽读' };
        h += '<div><h3>事件路径底座 · ' + k + ' · ' + r.from.slice(0, 4) + ' 年起 ' + r.n + ' 次 · 读法阈值 ' + r.thr_bp + 'bp · 窗口 前日收盘→公布后 ' + r.window_days + ' 日</h3><div class="tablewrap"><table><thead><tr><th>读法</th><th>基础率</th><th>n</th><th>金价均值 %</th><th>p25</th><th>p75</th><th>σ</th></tr></thead><tbody>' +
          keys.map(function (kk) { var c = r.cond[kk] || {}; return '<tr><td class="t">' + lab[kk] + '</td><td>' + Math.round((r.base[kk] || 0) * 100) + '%</td><td>' + (c.n || 0) + '</td><td>' + (c.mu === undefined ? '—' : (c.mu > 0 ? '+' : '') + c.mu.toFixed(2)) + '</td><td>' + (c.p25 === undefined ? '—' : c.p25.toFixed(2)) + '</td><td>' + (c.p75 === undefined ? '—' : c.p75.toFixed(2)) + '</td><td>' + (c.sd === undefined ? '—' : c.sd.toFixed(2)) + '</td></tr>'; }).join('') + '</tbody></table></div></div>';
      });
      if (H) h += '<div class="gen">到 ' + up.kind + ' 还有 ' + H.k + ' 个交易日；近三年同窗口金价 10–90 分位 ' + H.pct[0].toFixed(1) + '%…' + H.pct[4].toFixed(1) + '%（仅参考，v1.25 起到期前漂移不进事件路径）。</div>';
      return h;
    }
    function n(v, nd) { return v === null || v === undefined ? '—' : Number(v).toFixed(nd === undefined ? 1 : nd); }
  })();

  document.getElementById('footer').textContent = '口径：金价显示为现货 XAUUSD 纽约收盘（新浪伦敦金，B），引擎的相关、归因与体制票用 LBMA PM 定盘（A），两者近一年日差均值 −0.4、标准差 37.5 美元；量化序列为 COMEX 连续（新浪，B）；美元指数由 FRED 六币种按 ICE 公式推导；大资金 = CFTC Legacy 非商业净多，快钱 = 管理基金仅期货净多；央行购金用外管局口径。数据截至 ' + D.as_of + '，生成于 ' + D.generated + '。第 1 期慢环，分数与状态由引擎计算，周日裁决前为提议。不构成投资建议。';

  // ---------- 交互 ----------
  var bt = document.getElementById('btn-theme');
  function ls(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } }
  function applyTheme(m) { if (m === 'light') { root.setAttribute('data-mode', 'light'); bt.textContent = '深色'; bt.setAttribute('aria-pressed', 'true'); } else { root.removeAttribute('data-mode'); bt.textContent = '浅色'; bt.setAttribute('aria-pressed', 'false'); } }
  applyTheme(ls('gold-ops-mode') || 'dark'); bt.addEventListener('click', function () { var m = root.getAttribute('data-mode') === 'light' ? 'dark' : 'light'; applyTheme(m); ls('gold-ops-mode', m); });
  var bd = document.getElementById('btn-delta');
  function applyDelta(c) { if (c === 'cn') { root.setAttribute('data-delta', 'cn'); bd.textContent = '红涨绿跌'; bd.setAttribute('aria-pressed', 'true'); } else { root.removeAttribute('data-delta'); bd.textContent = '绿涨红跌'; bd.setAttribute('aria-pressed', 'false'); } }
  applyDelta(ls('gold-ops-delta') || 'intl'); bd.addEventListener('click', function () { var c = root.getAttribute('data-delta') === 'cn' ? 'intl' : 'cn'; applyDelta(c); ls('gold-ops-delta', c); });
  var be = document.getElementById('btn-engine'), eng = document.getElementById('engine'); be.addEventListener('click', function () { eng.open = !eng.open; if (eng.open) eng.scrollIntoView({ block: 'start', behavior: 'smooth' }); });
  window.GO.RANGE = 60;
  document.querySelectorAll('.range button').forEach(function (b) { b.addEventListener('click', function () { window.GO.RANGE = +b.getAttribute('data-range'); document.querySelectorAll('.range button').forEach(function (o) { o.setAttribute('aria-pressed', String(o === b)); }); if (window.GO.renderOpenPanel) window.GO.renderOpenPanel(); }); });
})();
