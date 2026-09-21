/* 二级诠释链：按 DESIGN §10.1.1 六卡各链，图形按 §10.1.2；数据来自 GOLDOPS_DAILY.series。同时只展开一张卡。 */
(function () {
  'use strict';
  var D = window.GOLDOPS_DAILY, ST = window.GOLDOPS_STATE, GC = window.GoldCharts, GO = window.GO;
  if (!D || !GC || !GO) return;
  var S = GO.S, fmtN = GO.fmtN, signed = GO.signed, esc = GO.esc, C = GC.C;
  var host = document.getElementById('t2-host');
  var cls = function (v) { return v > 0 ? 'up' : (v < 0 ? 'down' : ''); };

  // ---- 序列工具 ----
  function tail(s, n) { return { dates: s.dates.slice(-n), values: s.values.slice(-n), iso: s.iso.slice(-n) }; }
  function alignTo(base, other) { // 把 other 对齐到 base.dates（前向填充）
    var m = {}; other.iso.forEach(function (d, i) { m[d] = other.values[i]; });
    var lastv = null; var out = [];
    var oi = 0;
    for (var i = 0; i < base.iso.length; i++) { var d = base.iso[i]; while (oi < other.iso.length && other.iso[oi] <= d) { lastv = other.values[oi]; oi++; } out.push(m[d] !== undefined ? m[d] : lastv); }
    return out;
  }
  function pctChg(vals, k) { var n = vals.length; if (n <= k || vals[n - 1 - k] === null) return null; return (vals[n - 1] / vals[n - 1 - k] - 1) * 100; }
  function diffChg(vals, k) { var n = vals.length; if (n <= k) return null; return vals[n - 1] - vals[n - 1 - k]; }
  function ytdChg(s, pct) { var y = s.iso[s.iso.length - 1].slice(0, 4); var i0 = -1; for (var i = 0; i < s.iso.length; i++) { if (s.iso[i].slice(0, 4) === y) { i0 = i; break; } } if (i0 <= 0) return null; var a = s.values[i0 - 1], b = s.values[s.values.length - 1]; return pct ? (b / a - 1) * 100 : b - a; }
  function ddFromHigh(vals) { var mx = -Infinity; return vals.map(function (v) { mx = Math.max(mx, v); return (v / mx - 1) * 100; }); }
  function pctCell(v, nd) { return v === null || v === undefined || isNaN(v) ? '<td>—</td>' : '<td class="' + cls(v) + '">' + (v > 0 ? '+' : (v < 0 ? '−' : '')) + Math.abs(v).toFixed(nd === undefined ? 1 : nd) + '%</td>'; }
  function bpCell(v) { return v === null || v === undefined || isNaN(v) ? '<td>—</td>' : '<td class="' + cls(v) + '">' + (v > 0 ? '+' : (v < 0 ? '−' : '')) + Math.abs(Math.round(v * 100)) + 'bp</td>'; }
  function rng() { return GO.RANGE || 60; }
  function sw(color) { return '<i class="sw" style="background:' + color + '"></i>'; }
  function lc(id, opt) { var h = document.getElementById(id); if (h) GC.lineChart(h, opt); }
  function fig(id, cap) { return '<div class="fig"><div class="chart" id="' + id + '"></div><div class="cap">' + cap + '</div></div>'; }
  function small(id, cap) { return '<div class="small"><div class="chart" id="' + id + '"></div><div class="cap">' + cap + '</div></div>'; }
  function chain(lbl, sub, body, so, wide) { return '<div class="chain3' + (wide ? ' wide' : '') + '"><div class="lbl">' + lbl + '<small>' + sub + '</small></div>' + body + (so ? '<div class="so">' + so + '</div>' : '') + '</div>'; }
  function tbl(head, rows) { return '<div class="tbl"><table class="cmp"><thead><tr>' + head.map(function (h) { return '<th>' + h + '</th>'; }).join('') + '</tr></thead><tbody>' + rows.join('') + '</tbody></table></div>'; }
  function rbCell(p, x) { return p === null || p === undefined ? '<td>—</td>' : '<td><div class="rb"><span class="tr"><i' + (x ? ' class="x"' : '') + ' style="--p:' + Math.round(p) + '"></i></span>' + Math.round(p) + '%</div></td>'; }
  function pctRank(vals) { var last = vals[vals.length - 1]; var n = 0, k = 0; vals.forEach(function (v) { if (v === null) return; n++; if (v < last) k++; }); return n ? k / n * 100 : null; }
  var hikeProb = D.snapshots && D.snapshots.hike_prob;

  var PANELS = {
    // ================= 金价 =================
    't2-gold': function () {
      var n = rng(); var g = tail(S('G'), n), eur = tail(S('XAUEUR'), n), jpy = tail(S('XAUJPY'), n), cny = tail(S('XAUCNY_G'), n);
      var gF = S('G'), eF = S('XAUEUR'), jF = S('XAUJPY'), cF = S('XAUCNY_G');   // G 为现货收盘，欧元/日元/人民币计价由 LBMA PM 定盘换算
      var rowsCcy = [[sw(C.gold) + '美元', gF, 0], [sw(C.orange) + '欧元', eF, 0], [sw(C.aqua) + '日元 万/盎司', jF, 2], [sw(C.magenta) + '人民币 元/克', cF, 1]].map(function (r) {
        var s = r[1]; var v = s.values; var mx = Math.max.apply(null, v.slice(-252));
        return '<tr><td>' + r[0] + '</td><td>' + fmtN(v[v.length - 1], r[2]) + '</td>' + pctCell(pctChg(v, 1)) + pctCell(pctChg(v, 5)) + pctCell(pctChg(v, 21)) + pctCell(pctChg(v, 63)) + pctCell(ytdChg(s, true)) + pctCell((v[v.length - 1] / mx - 1) * 100, 0) + '</tr>';
      });
      var silver = S('SILVER'), gdx = S('GDX'), gsr = S('GSR_W'), gdxr = S('GDXR_W'), gor = S('GOR_W');
      var rowsB = [['白银', silver, 2, true], ['金矿股 GDX', gdx, 2, true], ['<b>金银比</b>', gsr, 1, false], ['<b>矿股 / 金价</b>', gdxr, 4, false], ['<b>金油比</b>', gor, 1, false]].map(function (r) {
        var v = r[1].values; var weekly = !r[3];
        return '<tr><td>' + r[0] + '</td><td>' + fmtN(v[v.length - 1], r[2]) + '</td>' + pctCell(pctChg(v, weekly ? 1 : 5)) + pctCell(pctChg(v, weekly ? 4 : 21)) + pctCell(pctChg(v, weekly ? 13 : 63)) + pctCell(ytdChg(r[1], true)) + (weekly ? rbCell(pctRank(v.slice(-260)), pctRank(v.slice(-260)) > 95) : '<td>—</td>') + '</tr>';
      });
      var L = D.levels; var gl = gF.values[gF.values.length - 1];
      var lv = [['52 周高点', L.high_52w, '目标区'], ['200 日线', L.ma200, gl < L.ma200 ? '现价在下，分水岭' : '现价在上，多头结构'], ['现价', gl, ''], ['50 日线', L.ma50, gl > L.ma50 ? '现价在上' : '现价在下']].sort(function (a, b) { return b[1] - a[1]; });
      var r2 = L.adj_r2_20; var bulletWord = r2 === null ? '—' : r2 < 0.2 ? '低 · 资金定价' : r2 < 0.5 ? '中' : '高 · 宏观定价';
      return '<h4>金价 <span class="q">这轮涨跌是美元的事，还是黄金自己的事</span></h4>' +
        chain('计价货币', '同涨还是独涨', fig('ch-ccy', '<b>四种计价的金价</b> · 起点 = 100') + '<div class="smalls two">' + small('ch-ccy-rel', '<b>相对美元计价</b> · 100 = 同步') + small('ch-dd', '<b>距各自 52 周高点的回撤</b>') + '</div>' + tbl(['金价按', '现价', '日', '周', '月', '3 月', '年初至今', '距 52 周高'], rowsCcy), null, true) +
        chain('板块广度', '白银、矿股跟不跟', tbl(['品种 / 比价', '现值', '周', '月', '3 月', '年初至今', '五年位置'], rowsB) + '<div class="smalls">' + small('ch-gsr', '<b>金银比</b> · 五年 · 虚线长期均值 78') + small('ch-gdxr', '<b>矿股 / 金价</b> · 五年') + small('ch-gor', '<b>金油比</b> · 五年 · 虚线长期均值 28') + '</div>', null, true) +
        chain('价格与技术位', '均线、买点区', fig('ch-px', '<b>现货金与 50、200 日线</b>') + tbl(['位', '价', '距现价', '读法'], lv.map(function (x) { return '<tr><td>' + x[0] + '</td><td>' + fmtN(x[1], 0) + '</td>' + (x[0] === '现价' ? '<td>—</td>' : pctCell((x[1] / gl - 1) * 100)) + '<td>' + x[2] + '</td></tr>'; })) + '<div class="note2" style="grid-column:2 / -1">隐含波动 ' + L.gvz + ' · 已实现 20 日 ' + L.rv20 + ' · RSI ' + L.rsi14 + '</div>', null) +
        chain('宏观解释力', '宏观还是资金在定价', '<div class="fig"><div class="bullet"><div class="bl-head"><span>近 20 日六因子回归调整解释力</span><span class="num"><b>' + (r2 === null ? '—' : r2.toFixed(2)) + '</b> · ' + bulletWord + '</span></div><div class="bl-track"><span class="bl-fill" style="width:' + Math.max(0, Math.min(100, (r2 || 0) * 100)) + '%"></span><span class="bl-tick" style="left:20%"><i></i><em>门槛 0.20</em></span></div><div class="bl-bands"><span>低 · 资金定价</span><span>中</span><span>高 · 宏观定价</span></div></div></div>' + tbl(['窗口', '调整解释力', '读法'], ['<tr><td>近 20 日</td><td><b>' + (r2 === null ? '—' : r2.toFixed(2)) + '</b></td><td>' + bulletWord + '</td></tr>', '<tr><td>近 40 日</td><td>' + (L.adj_r2_40 === null ? '—' : L.adj_r2_40.toFixed(2)) + '</td><td>' + (L.adj_r2_40 < 0.15 ? '低于动量门槛 0.15' : '宏观有解释') + '</td></tr>']), null);
    },
    // ================= 利率 =================
    't2-rates': function () {
      var y2 = S('Y2'), y5 = S('Y5'), y10 = S('Y10'), y30 = S('Y30'), real = S('REAL'), be = S('BE'), tp = S('TP'), s2 = S('S2S30');
      var rows = [['2 年期', y2], ['5 年期', y5], ['10 年期', y10], ['30 年期', y30]].map(function (r) { var v = r[1].values; return '<tr><td>' + r[0] + '</td><td>' + v[v.length - 1].toFixed(2) + '%</td>' + bpCell(diffChg(v, 1)) + bpCell(diffChg(v, 5)) + bpCell(diffChg(v, 21)) + bpCell(diffChg(v, 63)) + bpCell(ytdChg(r[1], false)) + '</tr>'; });
      var sv = s2.values; rows.push('<tr><td><b>30 减 2</b></td><td>' + Math.round(sv[sv.length - 1]) + 'bp</td>' + [1, 5, 21, 63].map(function (k) { var d = diffChg(sv, k); return d === null ? '<td>—</td>' : '<td class="' + cls(d) + '">' + signed(d, 0, 'bp') + '</td>'; }).join('') + '<td class="' + cls(ytdChg(s2, false)) + '">' + signed(ytdChg(s2, false), 0, 'bp') + '</td></tr>');
      var tv = tp.values; rows.push('<tr><td>期限溢价 Kim-Wright</td><td>' + tv[tv.length - 1].toFixed(2) + '%</td>' + bpCell(diffChg(tv, 1)) + bpCell(diffChg(tv, 5)) + bpCell(diffChg(tv, 21)) + bpCell(diffChg(tv, 63)) + bpCell(ytdChg(tp, false)) + '</tr>');
      var comp = [['<i class="sw" style="background:' + C.violet + '"></i>10 年实际利率', real], ['<i class="sw" style="background:' + C.orange + '"></i>10 年通胀预期', be]].map(function (r) { var v = r[1].values; return '<tr><td>' + r[0] + '</td><td>' + v[v.length - 1].toFixed(2) + '%</td>' + bpCell(diffChg(v, 5)) + bpCell(diffChg(v, 21)) + '<td>' + Math.round(pctRank(r[1].values)) + '%</td></tr>'; });
      var F = ST.regime.features || {};
      comp.push('<tr><td>20 日名义变动中实际占比</td><td>' + (F.real_share20 === null ? '—' : Math.round(F.real_share20 * 100) + '%') + '</td><td></td><td></td><td>' + (F.real_share20 > 0.6 ? '> 60%，判利率主导' : '≤ 60%') + '</td></tr>');
      var pm = D.snapshots.polymarket || {}, ka = D.snapshots.kalshi || {};
      var kv = '<div class="fig"><div class="kv">' +
        '<div><span class="k">9/16 加息 25bp 概率</span><span class="v">' + (hikeProb !== null && hikeProb !== undefined ? Math.round(hikeProb * 100) + '%' : '—') + '</span><span class="w">Polymarket ' + (pm.hike25 !== undefined ? Math.round(pm.hike25 * 100) + '%' : '—') + ' · Kalshi ' + (ka.H25 !== undefined ? Math.round(ka.H25 * 100) + '%' : '—') + '</span></div>' +
        '<div><span class="k">按兵不动</span><span class="v">' + (pm.hold !== undefined ? Math.round(pm.hold * 100) + '%' : '—') + '</span><span class="w">Polymarket；Kalshi ' + (ka.H0 !== undefined ? Math.round(ka.H0 * 100) + '%' : '—') + '</span></div>' +
        '<div><span class="k">加息 50bp 以上</span><span class="v">' + (pm.hike50 !== undefined ? Math.round(pm.hike50 * 100) + '%' : '—') + '</span><span class="w">第二次未定价</span></div>' +
        '<div><span class="k">联邦基金期货推算</span><span class="v muted">待接入</span><span class="w">CME 与 Yahoo 不可达，预测市场交叉代替</span></div></div></div>';
      return '<h4>利率 <span class="q">哪一段在动，为什么动，联储怎么走</span></h4>' +
        chain('曲线形态', '期限结构快照', '<div class="smalls">' + small('ch-term', '<b>期限结构</b> · 年初、一月前、今天') + small('ch-tenor', '<b>本月各期限变动</b> bp') + small('ch-2s30s', '<b>30 减 2</b> · 一年 · 60 / 100 / 120 判据线') + '</div>' + tbl(['期限 / 利差', '现值', '日', '周', '月', '3 月', '年初至今'], rows), null, true) +
        chain('实际利率的构成', '名义 = 实际 + 通胀预期', fig('ch-comp', '<b>名义、实际、通胀预期</b> · 同轴') + tbl(['成分', '现值', '周', '月', '十年分位'], comp), null) +
        chain('金价对实际利率', '散点与旧模型', fig('ch-scatter', '<b>2019 年起月度点，纵轴对数</b> · 虚线为 2019–21 拟合') + '<div class="tbl"><div class="note2">点群离旧模型线越远，体制溢价越大；沿斜率下跌 = 利率主导下溢价未掉。</div></div>', null, true) +
        chain('联储路径', '预测市场交叉', kv + tbl(['市场', '加息 25', '不变', '加息 50+', '降息 25'], ['<tr><td>Polymarket</td><td>' + p(pm.hike25) + '</td><td>' + p(pm.hold) + '</td><td>' + p(pm.hike50) + '</td><td>' + p(pm.cut25) + '</td></tr>', '<tr><td>Kalshi 中价</td><td>' + p(ka.H25) + '</td><td>' + p(ka.H0) + '</td><td>' + p(ka.H26) + '</td><td>' + p(ka.C25) + '</td></tr>']), null) +
        chain('全球长端', '财政故事是否全球化', fig('ch-global', '<b>五国长端累计变动</b> bp') + tbl(['品种', '现值', '周', '月', '3 月', '十年分位'], [['<i class="sw" style="background:' + C.blue + '"></i>美债 30 年', y30], ['<i class="sw" style="background:' + C.orange + '"></i>日债 10 年', S('JGB10')], ['<i class="sw" style="background:' + C.aqua + '"></i>日债 30 年', S('JGB30')], ['<i class="sw" style="background:' + C.violet + '"></i>德债 30 年', S('BUND30')], ['<i class="sw" style="background:' + C.magenta + '"></i>英债 20 年', S('GILT20')]].map(function (r) { var v = r[1].values; return '<tr><td>' + r[0] + '</td><td>' + v[v.length - 1].toFixed(2) + '%</td>' + bpCell(diffChg(v, 5)) + bpCell(diffChg(v, 21)) + bpCell(diffChg(v, 63)) + '<td>' + Math.round(pctRank(v)) + '%</td></tr>'; })), null);
      function p(x) { return x === undefined || x === null ? '—' : Math.round(x * 100) + '%'; }
    },
    // ================= 美元 =================
    't2-usd': function () {
      var dxy = S('DXY'), jpy = S('USDJPY'), cny = S('USDCNY'), eur = S('EURUSD');
      var rows = [[sw(C.blue) + '美元指数（推导）', dxy, 2], [sw(C.orange) + '日元', jpy, 1], [sw(C.aqua) + '人民币', cny, 3], [sw(C.magenta) + '欧元（1/EURUSD）', { values: eur.values.map(function (v) { return 1 / v; }), iso: eur.iso, dates: eur.dates }, 3]].map(function (r) { var v = r[1].values; return '<tr><td>' + r[0] + '</td><td>' + fmtN(v[v.length - 1], r[2]) + '</td>' + pctCell(pctChg(v, 1)) + pctCell(pctChg(v, 5)) + pctCell(pctChg(v, 21)) + pctCell(pctChg(v, 63)) + pctCell(ytdChg(r[1], true)) + '</tr>'; });
      var dv = dxy.values[dxy.values.length - 1];
      var hb = [['兑日元', pctChg(jpy.values, 5)], ['兑欧元', pctChg(eur.values.map(function (v) { return 1 / v; }), 5)], ['美元指数', pctChg(dxy.values, 5)], ['兑人民币', pctChg(cny.values, 5)]].sort(function (a, b) { return a[1] - b[1]; });
      var hbars = '<div class="hbars">' + hb.map(function (h) { var w = Math.min(50, Math.abs(h[1]) / 2.5 * 50); var left = h[1] < 0 ? 50 - w : 50; return '<div class="hb"><span>' + h[0] + '</span><div class="bar"><b style="left:' + left + '%;width:' + w + '%"></b></div><span class="v ' + cls(h[1]) + '">' + signed(h[1], 1, '%') + '</span></div>'; }).join('') + '</div>';
      return '<h4>美元 <span class="q">对谁强对谁弱</span></h4>' +
        chain('主要货币对', '路径与排序', '<div class="smalls two">' + small('ch-fx', '<b>美元兑各币</b> · 起点 = 100，上行 = 美元强') + '<div class="small">' + hbars + '<div class="cap"><b>本周涨跌排序</b> · 刻度 ±2.5%</div></div></div>' +
          '<div class="gate"><div><div class="k">跌破</div><div class="v">97</div><div class="w">美元转弱，贬值交易回归</div></div><i>→</i><div class="now"><div class="k">现在 · 十年 ' + Math.round(pctRank(dxy.values)) + '%</div><div class="v">' + dv.toFixed(1) + '</div><div class="w">' + (dv > 100 ? '站上 100，利率主导加深' : dv < 97 ? '跌破 97' : '两态之间，模式判断不变') + '</div></div><i>→</i><div><div class="k">站上</div><div class="v">100</div><div class="w">美元走强，利率主导加深</div></div></div>' +
          tbl(['美元兑', '现值', '日', '周', '月', '3 月', '年初至今'], rows) + '<div class="note2" style="grid-column:2">美元指数由 FRED 六币种纽约中午价按 ICE 公式推导，与 ICE 收盘有小时差；9/4 推导值 99.11 对真值 99.16。</div>', null, true);
    },
    // ================= 风险与流动性 =================
    't2-risk': function () {
      var L = D.levels, F = ST.regime.features || {}, c = D.corr;
      var kv = '<div class="fig"><div class="kv"><div><span class="k">SOFR − IORB</span><span class="v">' + signed(L.sofr_iorb, 0, 'bp') + '</span><span class="w">尖峰 > +10bp 为管道压力</span></div><div><span class="k">VIX</span><span class="v">' + F.vix + '</span><span class="w">挤压判据 25</span></div><div><span class="k">高收益利差 5 日</span><span class="v">' + signed(F.hy_5d_bp, 0, 'bp') + '</span><span class="w">挤压判据 +50bp</span></div><div><span class="k">MOVE</span><span class="v muted">待接入</span><span class="w">Yahoo 限流；第 1 期挤压判据只用上两条</span></div></div></div>';
      var rrp = S('RRP_W'), res = S('RES_W'), tga = S('TGA_W');
      var plumbing = [['隔夜逆回购 $B', rrp, 0], ['准备金 $T', res, 2], ['财政部现金 $B', tga, 0]].map(function (r) { var v = r[1].values; return '<tr><td>' + r[0] + '</td><td>' + fmtN(v[v.length - 1], r[2]) + '</td>' + pctCell(pctChg(v, 1)) + pctCell(pctChg(v, 4)) + '<td>' + Math.round(pctRank(v)) + '%</td></tr>'; });
      var corrRows = [[sw(C.orange) + '比特币', 'D.CORR_BTC20', 'D.CORR_BTC60'], [sw(C.aqua) + '标普 500', 'D.CORR_SPX20', 'D.CORR_SPX60'], [sw(C.magenta) + '白银', null, 'D.CORR_SILVER60'], [sw(C.violet) + '实际利率', null, 'D.CORR_REAL40']].map(function (r) { return '<tr><td>' + r[0] + '</td><td>' + (r[1] ? f(c[r[1]]) : '—') + '</td><td>' + f(c[r[2]]) + '</td><td>' + (c[r[2]] > 0.5 ? '同一个篓子' : c[r[2]] < -0.3 ? '反向' : '弱') + '</td></tr>'; });
      return '<h4>风险与流动性 <span class="q">恐慌在不在，钱紧不紧，黄金和谁一起动</span></h4>' +
        chain('债市压力', '数字，不画图', kv + tbl(['挤压否决项', '现状'], ['<tr><td>股金 20 日相关 > 0.5 · 美元 5 日 > 1% · VIX > 25 或利差 5 日 > 50bp</td><td>' + f(F.corr_spx20) + ' · ' + signed(F.dxy_5d, 1, '%') + ' · ' + F.vix + '，' + (ST.regime.state === 'squeeze' ? '已触发' : '未触发') + '</td></tr>']), null) +
        chain('流动性管道', '四季度会不会钱荒', '<div class="smalls">' + small('ch-rrp', '<b>隔夜逆回购</b> $B · 一年') + small('ch-res', '<b>准备金</b> $T · 一年') + small('ch-tga', '<b>财政部现金</b> $B · 一年') + '</div>' + tbl(['量', '现值', '周', '月', '一年分位'], plumbing), null, true) +
        chain('同篓子资产', '黄金和谁一起动', fig('ch-corr', '<b>金价与四资产的 40 日滚动相关</b> · 阴影 ±0.3 无意义区') + tbl(['金价与', '20 日', '40/60 日', '读法'], corrRows), null);
      function f(v) { return v === null || v === undefined ? '—' : Number(v).toFixed(2); }
    },
    // ================= 油价与通胀 =================
    't2-infl': function () {
      var pce = S('PCE_M'), pce3 = S('PCE3M_M'), cpi = S('CPI_M'), mich = S('MICH_M'), unr = S('UNR_M'), nfp = S('NFP_M'), brent = S('BRENT');
      var lastv = function (s, nd) { var v = s.values; return v.length ? fmtN(v[v.length - 1], nd) : '—'; };
      var rows = ['<tr><td>核心 PCE 同比</td><td>' + lastv(pce, 1) + '%</td><td>' + lastv(pce3, 1) + '% 三月年化</td><td>' + (pce.iso.length ? pce.iso[pce.iso.length - 1].slice(0, 7) : '') + '</td></tr>',
        '<tr><td>核心 CPI 同比</td><td>' + lastv(cpi, 1) + '%</td><td></td><td>' + (cpi.iso.length ? cpi.iso[cpi.iso.length - 1].slice(0, 7) : '') + '</td></tr>',
        '<tr><td>密歇根 1 年预期</td><td>' + lastv(mich, 1) + '%</td><td></td><td>' + (mich.iso.length ? mich.iso[mich.iso.length - 1].slice(0, 7) : '') + '</td></tr>',
        '<tr><td>失业率</td><td>' + lastv(unr, 1) + '%</td><td>非农 ' + signed(nfp.values[nfp.values.length - 1], 0, '千') + '</td><td>' + (unr.iso.length ? unr.iso[unr.iso.length - 1].slice(0, 7) : '') + '</td></tr>',
        '<tr><td>ISM 服务业价格</td><td class="muted">待手工</td><td colspan="2">ISM 官网有验证码</td></tr>'];
      var bv = brent.values;
      return '<h4>油价与通胀 <span class="q">通胀在降还是第二波，增长在不在</span></h4>' +
        chain('通胀与就业', '月频四幅', '<div class="smalls four">' + small('ch-pce', '<b>核心 PCE 同比</b> % · 虚线 2 与 3') + small('ch-cpi', '<b>核心 CPI 同比</b> %') + small('ch-mich', '<b>密歇根 1 年预期</b> % · 虚线 3') + small('ch-unr', '<b>失业率</b> % · 虚线 4.1') + '</div>' + tbl(['指标', '最新', '补充', '数据月'], rows), null, true) +
        chain('能源细节', '水平与关键位', fig('ch-brent', '<b>Brent</b> · 一年') + tbl(['量', '现值', '周', '月', '年初至今'], ['<tr><td>Brent</td><td>' + fmtN(bv[bv.length - 1], 2) + '</td>' + pctCell(pctChg(bv, 5)) + pctCell(pctChg(bv, 21)) + pctCell(ytdChg(brent, true)) + '</tr>', '<tr><td>金油比</td><td>' + fmtN(S('GOR_W').values.slice(-1)[0], 1) + '</td><td colspan="3">见金价卡板块广度</td></tr>', '<tr><td>金价与油价 40 日相关</td><td>' + (D.corr['D.CORR_BRENT40'] === null ? '—' : D.corr['D.CORR_BRENT40'].toFixed(2)) + '</td><td colspan="3">转正是模式切换判据之一</td></tr>']), null);
    },
    // ================= 买家与持仓 =================
    't2-flow': function () {
      var mm = S('MM_W'), ms = S('MM_SHORT_W'), oi = S('OI_W'), leg = S('LEG_W'), etf = S('ETF_W'), pboc = S('PBOC_M'), sge = S('SGE_PREM_W'), shfe = S('SHFE_OI');
      var r = function (name, s, nd, unit) { var v = s.values; return '<tr><td>' + name + '</td><td>' + fmtN(v[v.length - 1], nd) + (unit || '') + '</td><td class="' + cls(diffChg(v, 1)) + '">' + signed(diffChg(v, 1), nd, unit) + '</td>' + rbCell(pctRank(v.slice(-260)), pctRank(v.slice(-260)) > 95) + '</tr>'; };
      var pv = pboc.values;
      return '<h4>买家与持仓 <span class="q">从快钱到央行，谁在买谁在卖</span></h4>' +
        chain('快钱', '期货投机盘', '<div class="smalls two">' + small('ch-mm', '<b>管理基金净多</b> 千手 · 五年 · 虚线 100 / 200') + small('ch-oi', '<b>COMEX 期货总持仓</b> 千手 · CFTC 周') + '</div>' + tbl(['量', '现值', '周', '五年位置'], [r('管理基金净多', mm, 1, ' 千手'), r('管理基金空头', ms, 1, ' 千手'), r('期货总持仓', oi, 1, ' 千手')]) + '<div class="note2" style="grid-column:2">期权偏斜（Cboe 延迟链）：' + (D.snapshots.skew ? 'GLD 30 日 25Δ 风险逆转 ' + signed(D.snapshots.skew.rr25_pts, 2, ' 个点') + '，put/call 持仓 ' + D.snapshots.skew.put_call_oi + '，ATM 隐含 ' + D.snapshots.skew.atm_iv + '%' : '未取到') + '</div>', null, true) +
        chain('慢钱与 ETF', '位置', '<div class="smalls two">' + small('ch-legacy', '<b>大资金净多</b> 千手 · 五年') + small('ch-etf', '<b>GLD 持仓</b> 吨 · 一年') + '</div>' + tbl(['量', '现值', '周', '五年位置'], [r('大资金净多', leg, 1, ' 千手'), r('GLD 持仓', etf, 0, ' 吨')]) + '<div class="note2" style="grid-column:2">全球 ETF 流量（WGC）需登录，第 1 期只接 GLD 官方档案。</div>', null, true) +
        chain('央行', '月度柱状看加速', fig('ch-pboc', '<b>中国央行月度增持</b> 吨 · 虚线 15 为加速判据') + tbl(['量', '最新', '读法'], ['<tr><td>中国央行月增</td><td>' + fmtN(pv[pv.length - 1], 1) + ' 吨（' + pboc.iso[pboc.iso.length - 1].slice(0, 7) + '）</td><td>' + (pv[pv.length - 1] >= 15 ? '≥ 15 吨，加速' : pv[pv.length - 1] < 10 ? '< 10 吨，减分' : '正常') + '</td></tr>', '<tr><td>WGC 央行购金</td><td class="muted">待 LLM 月度整理</td><td>需登录</td></tr>']), null) +
        chain('实物', '趋势与门槛', fig('ch-sge', '<b>上海金溢价</b> 美元/盎司 · 周均 · 虚线 0 与 +10') + tbl(['量', '现值', '读法'], ['<tr><td>上海溢价（周均）</td><td>' + signed(sge.values[sge.values.length - 1], 1) + '</td><td>' + (sge.values[sge.values.length - 1] > 10 ? '> +10，买盘回归' : sge.values[sge.values.length - 1] <= 0 ? '≤ 0，零售不追价' : '0 到 +10 之间') + '</td></tr>', '<tr><td>上期所黄金持仓</td><td>' + fmtN(shfe.values[shfe.values.length - 1], 0) + ' 手</td><td>周 ' + signed(pctChg(shfe.values, 5), 1, '%') + '</td></tr>', '<tr><td>COMEX 库存</td><td class="muted">盲区</td><td>CME 封禁</td></tr>']), null);
    }
  };

  // ---- 图渲染（面板打开后调用，容器已有宽度）----
  function drawPanel(id) {
    var n = rng();
    if (id === 't2-gold') {
      var g = tail(S('G'), n), e = tail(S('XAUEUR'), n), j = tail(S('XAUJPY'), n), c = tail(S('XAUCNY_G'), n);
      var ix = function (s) { var v = alignTo(g, s); return v.map(function (x) { return x / v[0] * 100; }); };
      var gU = g.values.map(function (x) { return x / g.values[0] * 100; }), gE = ix(e), gJ = ix(j), gC = ix(c);
      lc('ch-ccy', { dates: g.dates, index: false, legend: true, series: [{ name: '美元', color: C.gold, values: gU, emph: true }, { name: '欧元', color: C.orange, values: gE }, { name: '日元', color: C.aqua, values: gJ }, { name: '人民币', color: C.magenta, values: gC }], fmt: GC.fmt0 });
      lc('ch-ccy-rel', { dates: g.dates, endName: false, fmt: GC.fmt1, series: [{ name: '欧元', color: C.orange, values: gE.map(function (v, i) { return v / gU[i] * 100; }) }, { name: '日元', color: C.aqua, values: gJ.map(function (v, i) { return v / gU[i] * 100; }) }, { name: '人民币', color: C.magenta, values: gC.map(function (v, i) { return v / gU[i] * 100; }) }], hlines: [{ y: 100, label: '与美元计价同步' }] });
      var full = { G: S('G'), E: S('XAUEUR'), J: S('XAUJPY'), C: S('XAUCNY_G') };
      var dd = function (s) { var v = alignTo(full.G, s); return ddFromHigh(v).slice(-n); };
      lc('ch-dd', { dates: g.dates, endName: false, fmt: function (v) { return v.toFixed(0) + '%'; }, series: [{ name: '美元', color: C.gold, values: ddFromHigh(full.G.values).slice(-n), emph: true }, { name: '欧元', color: C.orange, values: dd(full.E) }, { name: '日元', color: C.aqua, values: dd(full.J) }, { name: '人民币', color: C.magenta, values: dd(full.C) }], hlines: [{ y: 0, label: '高点' }] });
      var gsr = S('GSR_W'), gdxr = S('GDXR_W'), gor = S('GOR_W');
      lc('ch-gsr', { dates: gsr.dates, endName: false, posbar: true, group: 'breadth', fmt: GC.fmt0, series: [{ name: '金银比', color: C.blue, values: gsr.values }], hlines: [{ y: 78, label: '长期均值 78' }] });
      lc('ch-gdxr', { dates: gdxr.dates, endName: false, posbar: true, group: 'breadth', l: 44, fmt: function (v) { return v.toFixed(4); }, series: [{ name: '矿股/金价', color: C.orange, values: gdxr.values }] });
      lc('ch-gor', { dates: gor.dates, endName: false, posbar: true, group: 'breadth', fmt: GC.fmt0, series: [{ name: '金油比', color: C.aqua, values: gor.values }], hlines: [{ y: 28, label: '长期均值 28' }] });
      var ma50 = alignTo(g, S('MA50')), ma200 = alignTo(g, S('MA200'));
      lc('ch-px', { dates: g.dates, fmt: GC.fmt0, series: [{ name: '现货金', color: C.gold, values: g.values, emph: true }, { name: '50 日线', color: C.orange, values: ma50, dash: true }, { name: '200 日线', color: C.violet, values: ma200, dash: true }], hlines: [{ y: D.levels.high_52w, label: '52 周高 ' + fmtN(D.levels.high_52w, 0) }] });
    }
    if (id === 't2-rates') {
      var y2 = S('Y2'), y5 = S('Y5'), y10 = S('Y10'), y30 = S('Y30'), real = S('REAL'), be = S('BE'), s2 = S('S2S30');
      var at = function (s, k) { var v = s.values; return v[Math.max(0, v.length - 1 - k)]; };
      var ytd0 = function (s) { var yr = s.iso[s.iso.length - 1].slice(0, 4); for (var i = 0; i < s.iso.length; i++) if (s.iso[i].slice(0, 4) === yr) return s.values[i]; return s.values[0]; };
      var tenors = [2, 5, 10, 30], ss = [y2, y5, y10, y30];
      GC.termStructure(document.getElementById('ch-term'), tenors, [{ name: '年初', color: C.grey, vals: ss.map(ytd0), dash: true }, { name: '一月前', color: C.orange, vals: ss.map(function (s) { return at(s, 21); }) }, { name: '今天', color: C.blue, vals: ss.map(function (s) { return at(s, 0); }), emph: true }]);
      GC.tenorBars(document.getElementById('ch-tenor'), tenors, ss.map(function (s) { return Math.round((at(s, 0) - at(s, 21)) * 100); }));
      var s2y = tail(s2, 252); lc('ch-2s30s', { dates: s2y.dates, endName: false, fmt: GC.fmt0, series: [{ name: '30 减 2', color: C.blue, values: s2y.values }], hlines: [{ y: 60, label: '60' }, { y: 100, label: '100 财政复活' }, { y: 120, label: '120' }] });
      var rN = tail(y10, n); lc('ch-comp', { dates: rN.dates, endName: false, legend: true, fmt: GC.fmt2, series: [{ name: '10 年名义', color: C.blue, values: rN.values }, { name: '实际利率', color: C.violet, values: alignTo(rN, real), emph: true }, { name: '通胀预期', color: C.orange, values: alignTo(rN, be) }] });
      var sc = D.series.SCATTER || []; var xs = sc.map(function (p) { return p[1]; }), ys = sc.map(function (p) { return p[2]; }), ds = sc.map(function (p) { return GC.pd(p[0] + '-01'); });
      var fit = sc.filter(function (p) { return p[0] <= '2021-12'; }); var n1 = fit.length, sx = 0, sy = 0, sxx = 0, sxy = 0; fit.forEach(function (p) { var x = p[1], y = Math.log(p[2]); sx += x; sy += y; sxx += x * x; sxy += x * y; }); var b = n1 > 2 ? (n1 * sxy - sx * sy) / (n1 * sxx - sx * sx) : -0.2, a = n1 > 2 ? (sy - b * sx) / n1 : 7.4;
      GC.scatter(document.getElementById('ch-scatter'), xs, ys, ds, { a: a, b: b });
      var gN = tail(y30, n); var bp = function (s) { var v = alignTo(gN, s); return v.map(function (x) { return (x - v[0]) * 100; }); };
      lc('ch-global', { dates: gN.dates, legend: true, fmt: function (v) { return (v > 0 ? '+' : '') + v.toFixed(0); }, series: [{ name: '美债 30', color: C.blue, values: gN.values.map(function (x) { return (x - gN.values[0]) * 100; }) }, { name: '日债 10', color: C.orange, values: bp(S('JGB10')) }, { name: '日债 30', color: C.aqua, values: bp(S('JGB30')) }, { name: '德债 30', color: C.violet, values: bp(S('BUND30')) }, { name: '英债 20', color: C.magenta, values: bp(S('GILT20')) }], hlines: [{ y: 0, label: '起点' }] });
    }
    if (id === 't2-usd') {
      var d = tail(S('DXY'), n); var j2 = alignTo(d, S('USDJPY')), c2 = alignTo(d, S('USDCNY')), e2 = alignTo(d, S('EURUSD')).map(function (v) { return 1 / v; });
      lc('ch-fx', { dates: d.dates, index: true, legend: true, series: [{ name: '美元指数', color: C.blue, values: d.values, emph: true }, { name: '兑日元', color: C.orange, values: j2 }, { name: '兑人民币', color: C.aqua, values: c2 }, { name: '兑欧元', color: C.magenta, values: e2 }] });
    }
    if (id === 't2-risk') {
      var rrp = S('RRP_W'), res = S('RES_W'), tga = S('TGA_W');
      lc('ch-rrp', { dates: rrp.dates, endName: false, group: 'plumb', fmt: GC.fmt0, series: [{ name: '逆回购', color: C.blue, values: rrp.values }] });
      lc('ch-res', { dates: res.dates, endName: false, group: 'plumb', fmt: GC.fmt2, series: [{ name: '准备金', color: C.orange, values: res.values }] });
      lc('ch-tga', { dates: tga.dates, endName: false, group: 'plumb', fmt: GC.fmt0, series: [{ name: 'TGA', color: C.aqua, values: tga.values }] });
      var cb = tail(S('CBTC'), n); lc('ch-corr', { dates: cb.dates, legend: true, fmt: GC.fmt2, band: { lo: -0.3, hi: 0.3 }, series: [{ name: '比特币 60 日', color: C.orange, values: cb.values }, { name: '标普 40 日', color: C.aqua, values: alignTo(cb, S('CSPX')) }, { name: '白银 60 日', color: C.magenta, values: alignTo(cb, S('CSLV')) }, { name: '实际利率 40 日', color: C.violet, values: alignTo(cb, S('CREAL')), emph: true }], hlines: [{ y: 0, label: '0' }] });
    }
    if (id === 't2-infl') {
      var m = function (id2, name, color, s, hl, f) { lc(id2, { dates: s.dates, endName: false, group: 'infl', fmt: f || GC.fmt1, series: [{ name: name, color: color, values: s.values }], hlines: hl }); };
      m('ch-pce', '核心 PCE', C.blue, S('PCE_M'), [{ y: 2.0, label: '目标 2%' }, { y: 3.0, label: '门槛 3%' }]); m('ch-cpi', '核心 CPI', C.orange, S('CPI_M'), [{ y: 2.0, label: '2%' }]); m('ch-mich', '密歇根 1 年', C.aqua, S('MICH_M'), [{ y: 3.0, label: '3%' }]); m('ch-unr', '失业率', C.magenta, S('UNR_M'), [{ y: 4.1, label: '4.1' }]);
      var b = tail(S('BRENT'), 252); lc('ch-brent', { dates: b.dates, fmt: GC.fmt0, series: [{ name: 'Brent', color: C.blue, values: b.values }] });
    }
    if (id === 't2-flow') {
      var mm = S('MM_W'), oi = S('OI_W'), leg = S('LEG_W'), etf = S('ETF_W'), pb = S('PBOC_M'), sg = S('SGE_PREM_W');
      lc('ch-mm', { dates: mm.dates, endName: false, posbar: true, fmt: GC.fmt0, series: [{ name: '管理基金净多', color: C.blue, values: mm.values }], hlines: [{ y: 100, label: '100 清洗完成' }, { y: 200, label: '200 拥挤' }] });
      lc('ch-oi', { dates: oi.dates, endName: false, fmt: GC.fmt0, series: [{ name: '总持仓', color: C.orange, values: oi.values }] });
      lc('ch-legacy', { dates: leg.dates, endName: false, posbar: true, fmt: GC.fmt0, series: [{ name: '大资金净多', color: C.blue, values: leg.values }] });
      lc('ch-etf', { dates: etf.dates, endName: false, fmt: GC.fmt0, series: [{ name: 'GLD 持仓', color: C.orange, values: etf.values }] });
      GC.barChart(document.getElementById('ch-pboc'), { values: pb.values.map(function (v) { return Math.round(v * 10) / 10; }), labels: pb.iso.map(function (d) { return d.slice(5, 7) + '月'; }), color: C.blue, hline: { y: 15, label: '加速 15 吨' } });
      lc('ch-sge', { dates: sg.dates, fmt: GC.fmt0, series: [{ name: '上海溢价', color: C.blue, values: sg.values }], hlines: [{ y: 0, label: '0' }, { y: 10, label: '+10 买盘回归' }] });
    }
  }

  // ---- 展开 / 收起 ----
  var openId = null;
  function closeAll() { host.innerHTML = ''; openId = null; document.querySelectorAll('.k1').forEach(function (k) { k.classList.remove('open'); k.setAttribute('aria-expanded', 'false'); }); }
  function open(card) {
    var id = card.getAttribute('data-t2'); if (openId === id) { closeAll(); return; }
    closeAll(); openId = id; card.classList.add('open'); card.setAttribute('aria-expanded', 'true');
    var div = document.createElement('div'); div.className = 't2 open'; div.id = id; div.innerHTML = PANELS[id](); host.appendChild(div);
    requestAnimationFrame(function () { drawPanel(id); var r = div.getBoundingClientRect(); if (r.top > window.innerHeight * 0.6 || r.top < 0) div.scrollIntoView({ block: 'start', behavior: 'smooth' }); });
  }
  GO.renderOpenPanel = function () { if (!openId) return; var div = document.getElementById(openId); div.innerHTML = PANELS[openId](); drawPanel(openId); };
  document.querySelectorAll('.k1').forEach(function (c) { c.addEventListener('click', function () { open(c); }); c.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(c); } }); });
  var want = (location.hash || '').slice(1); var first = document.querySelector('.k1[data-t2="' + (/^t2-/.test(want) ? want : 't2-gold') + '"]'); if (first) open(first);
  var rsz; window.addEventListener('resize', function () { clearTimeout(rsz); rsz = setTimeout(function () { if (openId) drawPanel(openId); }, 150); });
})();
