/* 米宿館 管理後台（示範版） */
(function () {
  var PW = "1234", SK = "misuguan_admin";
  var $ = function (id) { return document.getElementById(id); };
  var WEEK = ["日", "一", "二", "三", "四", "五", "六"];
  var STATUSES = ["待確認", "已確認", "已入住", "已退房", "已取消"];
  var view = "dash", invStart = Store.today();
  function money(n) { return "NT$" + Number(n || 0).toLocaleString("en-US"); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function md(s) { var d = Store.parse(s); return (d.getMonth() + 1) + "/" + d.getDate(); }
  function mdw(s) { var d = Store.parse(s); return (d.getMonth() + 1) + "/" + d.getDate() + "（" + WEEK[d.getDay()] + "）"; }
  function roomName(id) { var r = Store.room(id); return r ? r.name : id; }
  function roomDot(id) { var r = Store.room(id); return '<i class="dot" style="background:' + (r ? r.color : "#999") + '"></i>'; }
  function pill(st) { return '<span class="pill s-' + st + '">' + st + "</span>"; }

  /* 登入 */
  function authed() { try { return sessionStorage.getItem(SK) === "1"; } catch (e) { return false; } }
  function enter() { $("login").hidden = true; $("shell").hidden = false;
    $("bRoom").innerHTML = Store.rooms().map(function (r) { return '<option value="' + r.id + '">' + r.name + "</option>"; }).join("");
    render(); }
  $("loginForm").addEventListener("submit", function (e) {
    e.preventDefault();
    if ($("pw").value === PW) { try { sessionStorage.setItem(SK, "1"); } catch (x) {} enter(); }
    else $("loginErr").textContent = "密碼錯誤，請再試一次";
  });
  $("logout").onclick = function () { try { sessionStorage.removeItem(SK); } catch (x) {} location.reload(); };

  /* 導覽 */
  var TITLES = { dash: "總覽", orders: "訂單管理", inv: "房況管理", rooms: "房型與房價", sys: "系統設定" };
  $("sideNav").addEventListener("click", function (e) {
    var b = e.target.closest("button"); if (!b) return;
    view = b.dataset.view;
    $("sideNav").querySelectorAll("button").forEach(function (x) { x.classList.toggle("active", x === b); });
    document.querySelectorAll(".view").forEach(function (v) { v.hidden = v.id !== "v-" + view; });
    $("viewTitle").textContent = TITLES[view];
    render();
  });

  function render() {
    var d = Store.get();
    var pend = d.bookings.filter(function (b) { return b.status === "待確認"; }).length;
    $("pendingCount").textContent = pend ? pend : "";
    if (view === "dash") dash(d);
    if (view === "orders") orders(d);
    if (view === "inv") inv(d);
    if (view === "rooms") rooms(d);
    $("stamp").textContent = "即時同步・" + new Date().toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  }

  /* 總覽 */
  function dash(d) {
    var t = Store.today(), ym = t.slice(0, 7), live = { "待確認": 1, "已確認": 1, "已入住": 1, "已退房": 1 };
    var ins = d.bookings.filter(function (b) { return b.checkin === t && b.status !== "已取消"; });
    var outs = d.bookings.filter(function (b) { return b.checkout === t && b.status !== "已取消"; });
    var pend = d.bookings.filter(function (b) { return b.status === "待確認"; });
    var rev = d.bookings.filter(function (b) { return b.checkin.slice(0, 7) === ym && live[b.status] && b.status !== "待確認"; })
      .reduce(function (s, b) { return s + b.amount; }, 0);
    var singles = d.rooms.filter(function (r) { return !r.whole; });
    var tonightFree = singles.reduce(function (s, r) { return s + Store.remaining(r.id, t); }, 0);
    $("kpis").innerHTML = [
      ["今日入住", ins.length + " 組"], ["今日退房", outs.length + " 組"], ["待確認訂單", pend.length + " 筆", pend.length ? "warn" : ""],
      ["今晚剩餘空房", tonightFree + " / " + singles.length + " 間"], ["本月已確認營收", money(rev)]
    ].map(function (k) { return '<div class="kpi ' + (k[2] || "") + '"><span>' + k[0] + "</span><b>" + k[1] + "</b></div>"; }).join("");

    var rows = ins.map(function (b) { return ["入住", b]; }).concat(outs.map(function (b) { return ["退房", b]; }));
    $("todayList").innerHTML = rows.length ? rows.map(function (x) {
      var b = x[1];
      return '<div class="li"><span class="tag ' + (x[0] === "入住" ? "in" : "out") + '">' + x[0] + "</span>" + roomDot(b.room) +
        "<div><b>" + esc(b.name) + "</b><small>" + roomName(b.room) + "・" + b.guests + " 位・" + esc(b.phone) + (b.arrive ? "・抵達 " + esc(b.arrive) : "") + "</small></div>" + pill(b.status) + "</div>";
    }).join("") : '<p class="empty">今天沒有入住或退房</p>';

    var html = '<div class="occ">';
    for (var i = 0; i < 14; i++) {
      var day = Store.addDays(t, i), used = 0;
      singles.forEach(function (r) { used += Store.remaining(r.id, day) > 0 ? 0 : 1; });
      var pct = Math.round(used / singles.length * 100);
      html += '<div class="occ-col" title="' + mdw(day) + " 住房率 " + pct + '%"><div class="bar"><i style="height:' + pct + '%"></i></div><small>' + md(day) + "</small><em>" + pct + "%</em></div>";
    }
    $("occ").innerHTML = html + "</div>";

    var latest = d.bookings.slice().sort(function (a, b) { return b.createdAt < a.createdAt ? -1 : 1; }).slice(0, 5);
    $("latest").innerHTML = latest.map(function (b) {
      return '<div class="li click" data-open="' + b.id + '">' + roomDot(b.room) + "<div><b>" + esc(b.name) + '</b><small>' + b.id + "・" + roomName(b.room) + "・" + md(b.checkin) + "–" + md(b.checkout) + "・" + esc(b.source || "") + "</small></div><b class=\"amt\">" + money(b.amount) + "</b>" + pill(b.status) + "</div>";
    }).join("") || '<p class="empty">尚無訂單</p>';
  }

  /* 訂單 */
  ["q", "fStatus", "fRange"].forEach(function (id) { $(id).addEventListener("input", function () { render(); }); });
  function orders(d) {
    var q = $("q").value.trim().toLowerCase(), fs = $("fStatus").value, fr = $("fRange").value, t = Store.today();
    var list = d.bookings.filter(function (b) {
      if (fs && b.status !== fs) return false;
      if (fr === "upcoming" && b.checkout < t) return false;
      if (fr === "past" && b.checkout >= t) return false;
      if (q && (b.name + b.phone + b.id + (b.email || "")).toLowerCase().indexOf(q) < 0) return false;
      return true;
    }).sort(function (a, b) { return a.checkin < b.checkin ? -1 : 1; });
    $("orderEmpty").hidden = list.length > 0;
    $("orderTbl").innerHTML = '<thead><tr><th>訂單編號</th><th>訂房人</th><th>房型</th><th>入住 → 退房</th><th>人數</th><th class="r">金額</th><th>狀態</th><th></th></tr></thead><tbody>' +
      list.map(function (b) {
        return '<tr><td data-l="編號" class="mono">' + b.id + '</td><td data-l="訂房人"><b>' + esc(b.name) + "</b><small>" + esc(b.phone) + "</small></td>" +
          '<td data-l="房型">' + roomDot(b.room) + roomName(b.room) + '</td><td data-l="日期">' + mdw(b.checkin) + " → " + mdw(b.checkout) + "<small>" + b.nights + " 晚</small></td>" +
          '<td data-l="人數">' + b.guests + ' 位</td><td data-l="金額" class="r">' + money(b.amount) + '</td>' +
          '<td data-l="狀態"><select class="st s-' + b.status + '" data-st="' + b.id + '">' + STATUSES.map(function (s) { return "<option" + (s === b.status ? " selected" : "") + ">" + s + "</option>"; }).join("") + "</select></td>" +
          '<td class="act"><button class="lnk" data-open="' + b.id + '">詳情</button><button class="lnk del" data-del="' + b.id + '">刪除</button></td></tr>';
      }).join("") + "</tbody>";
  }
  document.addEventListener("change", function (e) {
    var s = e.target.closest("[data-st]"); if (s) Store.setStatus(s.dataset.st, s.value);
  });
  document.addEventListener("click", function (e) {
    var o = e.target.closest("[data-open]"); if (o) return detail(o.dataset.open);
    var dl = e.target.closest("[data-del]");
    if (dl) {
      if (dl.dataset.confirm === "1") { Store.remove(dl.dataset.del); closeModal(); }
      else { dl.dataset.confirm = "1"; dl.textContent = "再按一次確認刪除"; setTimeout(function () { if (dl.isConnected) { dl.dataset.confirm = ""; dl.textContent = "刪除"; } }, 3000); }
    }
  });

  /* 彈窗 */
  function openModal(html) { $("modalBox").innerHTML = html; $("modal").hidden = false; }
  function closeModal() { $("modal").hidden = true; }
  $("modal").addEventListener("click", function (e) { if (e.target.id === "modal" || e.target.closest("[data-close]")) closeModal(); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeModal(); });

  function detail(id) {
    var b = Store.get().bookings.filter(function (x) { return x.id === id; })[0]; if (!b) return;
    openModal('<button class="x" data-close aria-label="關閉">×</button><h2>' + b.id + "</h2>" + pill(b.status) +
      '<dl class="dl"><dt>訂房人</dt><dd>' + esc(b.name) + "</dd><dt>手機</dt><dd>" + esc(b.phone) + "</dd><dt>Email</dt><dd>" + (esc(b.email) || "—") + "</dd>" +
      "<dt>房型</dt><dd>" + roomDot(b.room) + roomName(b.room) + "</dd><dt>入住</dt><dd>" + mdw(b.checkin) + "</dd><dt>退房</dt><dd>" + mdw(b.checkout) + "（" + b.nights + " 晚）</dd>" +
      "<dt>人數</dt><dd>" + b.guests + " 位</dd><dt>預計抵達</dt><dd>" + (esc(b.arrive) || "—") + "</dd><dt>金額</dt><dd>" + money(b.amount) + "</dd>" +
      "<dt>備註</dt><dd>" + (esc(b.note) || "—") + "</dd><dt>來源</dt><dd>" + esc(b.source || "—") + "</dd><dt>建立時間</dt><dd>" + new Date(b.createdAt).toLocaleString("zh-TW") + "</dd></dl>" +
      '<div class="modal-act">' + STATUSES.filter(function (s) { return s !== b.status; }).map(function (s) { return '<button class="btn sm" data-set="' + s + '" data-id="' + b.id + '">改為' + s + "</button>"; }).join("") +
      '<button class="btn sm danger" data-del="' + b.id + '">刪除</button></div>');
  }
  $("modal").addEventListener("click", function (e) {
    var s = e.target.closest("[data-set]"); if (s) { Store.setStatus(s.dataset.id, s.dataset.set); detail(s.dataset.id); }
  });

  /* 新增訂單（電話/LINE 代訂） */
  $("newOrder").onclick = function () {
    var t = Store.today();
    openModal('<button class="x" data-close aria-label="關閉">×</button><h2>新增訂單</h2><p class="tip">電話或 LINE 訂房時，由民宿代客建立。</p>' +
      '<form id="addForm" class="form-grid" style="margin-top:14px">' +
      '<div class="full"><label for="aRoom">房型</label><select id="aRoom">' + Store.rooms().map(function (r) { return '<option value="' + r.id + '">' + r.name + "</option>"; }).join("") + "</select></div>" +
      '<div><label for="aIn">入住</label><input id="aIn" type="date" value="' + t + '" required></div><div><label for="aOut">退房</label><input id="aOut" type="date" value="' + Store.addDays(t, 1) + '" required></div>' +
      '<div><label for="aName">姓名</label><input id="aName" required></div><div><label for="aPhone">手機</label><input id="aPhone" required></div>' +
      '<div><label for="aGuests">人數</label><input id="aGuests" type="number" min="1" max="6" value="2"></div><div><label for="aSrc">來源</label><select id="aSrc"><option>電話訂房</option><option>LINE 訂房</option><option>Booking.com</option><option>現場</option></select></div>' +
      '<div class="full"><label for="aNote">備註</label><input id="aNote"></div><p class="full err" id="aErr"></p>' +
      '<div class="full"><button class="btn solid block" type="submit">建立訂單（狀態：已確認）</button></div></form>');
    $("addForm").addEventListener("submit", function (e) {
      e.preventDefault();
      try {
        Store.book({ room: $("aRoom").value, checkin: $("aIn").value, checkout: $("aOut").value, name: $("aName").value, phone: $("aPhone").value,
          guests: +$("aGuests").value, note: $("aNote").value, source: $("aSrc").value, status: "已確認", email: "", arrive: "" });
        closeModal();
      } catch (x) { $("aErr").textContent = x.message; }
    });
  };

  /* 房況 */
  $("invPrev").onclick = function () { var p = Store.addDays(invStart, -14); invStart = p < Store.today() ? Store.today() : p; render(); };
  $("invNext").onclick = function () { invStart = Store.addDays(invStart, 14); render(); };
  function inv(d) {
    var days = []; for (var i = 0; i < 14; i++) days.push(Store.addDays(invStart, i));
    $("invRange").textContent = mdw(days[0]) + " – " + mdw(days[13]);
    $("invPrev").disabled = invStart <= Store.today();
    var h = "<thead><tr><th class=\"sticky\">房型</th>" + days.map(function (x) {
      var w = Store.parse(x).getDay();
      return '<th class="' + (w === 0 || w === 6 ? "we" : "") + '">' + md(x) + "<small>" + WEEK[w] + "</small></th>";
    }).join("") + "</tr></thead><tbody>";
    d.rooms.forEach(function (r) {
      h += '<tr><th class="sticky">' + roomDot(r.id) + r.name + "</th>" + days.map(function (x) {
        var left = Store.remaining(r.id, x), bk = Store.booked(r.id, x);
        var part = r.whole && !left && !bk && d.rooms.some(function (s) { return !s.whole && Store.remaining(s.id, x) < 1; });
        return '<td><button class="cell ' + (left > 0 ? "open" : (bk ? "booked" : part ? "partial" : "closed")) + '" data-cell="' + r.id + "|" + x + '"><b>' + left + "</b><small>" +
          (bk ? "已訂 " + bk : left > 0 ? "可訂" : part ? "客房已訂" : "關房") + "</small></button></td>";
      }).join("") + "</tr>";
    });
    $("invTbl").innerHTML = h + "</tbody>";
  }
  document.addEventListener("click", function (e) {
    var c = e.target.closest("[data-cell]"); if (!c) return;
    var p = c.dataset.cell.split("|"), id = p[0], day = p[1], left = Store.remaining(id, day);
    openModal('<button class="x" data-close aria-label="關閉">×</button><h2>' + roomName(id) + "</h2><p class=\"tip\">" + mdw(day) + "・已訂 " + Store.booked(id, day) + " 間</p>" +
      '<div class="stepper"><button type="button" data-step="-1">−</button><output id="stepVal">' + left + '</output><button type="button" data-step="1">＋</button></div>' +
      '<p class="tip" style="text-align:center">剩餘可訂間數</p><div class="modal-act"><button class="btn sm" data-quick="0">設為關房</button><button class="btn solid sm" id="stepSave">儲存</button></div>');
    var val = left;
    $("modalBox").onclick = function (ev) {
      var s = ev.target.closest("[data-step]"), qk = ev.target.closest("[data-quick]");
      if (s) { val = Math.max(0, Math.min(9, val + +s.dataset.step)); $("stepVal").textContent = val; }
      if (qk) { val = 0; $("stepVal").textContent = 0; }
      if (ev.target.id === "stepSave") { Store.setRemaining(id, day, val); closeModal(); }
    };
  });
  $("bFrom").value = Store.today(); $("bTo").value = Store.addDays(Store.today(), 6);
  $("bulkForm").addEventListener("submit", function (e) {
    e.preventDefault();
    var from = $("bFrom").value, to = $("bTo").value; if (to < from) { var tmp = from; from = to; to = tmp; }
    Store.eachNight(from, Store.addDays(to, 1)).forEach(function (x) { Store.setRemaining($("bRoom").value, x, +$("bVal").value); });
  });

  /* 房型 */
  function rooms(d) {
    $("roomTbl").innerHTML = "<thead><tr><th>房型</th><th>可住人數</th><th>房間數</th><th>每晚房價（NT$）</th><th></th></tr></thead><tbody>" + d.rooms.map(function (r) {
      return '<tr><td data-l="房型">' + roomDot(r.id) + "<b>" + r.name + "</b></td>" +
        '<td data-l="人數"><input type="number" min="1" max="12" value="' + r.cap + '" id="cap-' + r.id + '"></td>' +
        '<td data-l="房間數"><input type="number" min="1" max="9" value="' + r.units + '" id="unit-' + r.id + '"' + (r.whole ? " disabled" : "") + "></td>" +
        '<td data-l="房價"><input type="number" min="0" step="100" value="' + r.price + '" id="price-' + r.id + '"></td>' +
        '<td><button class="btn solid sm" data-saveroom="' + r.id + '">儲存</button></td></tr>';
    }).join("") + "</tbody>";
  }
  document.addEventListener("click", function (e) {
    var s = e.target.closest("[data-saveroom]"); if (!s) return;
    var id = s.dataset.saveroom;
    Store.updateRoom(id, { cap: +$("cap-" + id).value, units: +$("unit-" + id).value, price: +$("price-" + id).value });
    s.textContent = "已儲存 ✓"; setTimeout(function () { s.textContent = "儲存"; }, 1500);
  });

  /* 系統 */
  $("exportCsv").onclick = function () {
    var rows = [["訂單編號", "狀態", "房型", "入住", "退房", "晚數", "人數", "金額", "姓名", "手機", "Email", "抵達時間", "備註", "來源", "建立時間"]];
    Store.get().bookings.forEach(function (b) { rows.push([b.id, b.status, roomName(b.room), b.checkin, b.checkout, b.nights, b.guests, b.amount, b.name, b.phone, b.email, b.arrive, b.note, b.source, b.createdAt]); });
    var csv = "﻿" + rows.map(function (r) { return r.map(function (c) { return '"' + String(c == null ? "" : c).replace(/"/g, '""') + '"'; }).join(","); }).join("\n");
    var a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" })); a.download = "米宿館訂單_" + Store.today() + ".csv"; a.click();
  };
  $("resetBtn").onclick = function () {
    var b = $("resetBtn");
    if (b.dataset.c === "1") { Store.reset(); b.dataset.c = ""; b.textContent = "重設資料"; $("resetMsg").textContent = "　已恢復範例資料"; }
    else { b.dataset.c = "1"; b.textContent = "再按一次確認重設"; }
  };

  Store.onChange(render);
  setInterval(render, 15000);
  if (authed()) enter();
})();
