// 米宿館 Roomi house2 — 前台
document.addEventListener("click", function (e) {
  if (e.target.closest(".menu-btn")) document.querySelector(".nav").classList.toggle("open");
});
var io = "IntersectionObserver" in window ? new IntersectionObserver(function (es) {
  es.forEach(function (x) { if (x.isIntersecting) { x.target.classList.add("in"); io.unobserve(x.target); } });
}, { threshold: .12 }) : null;
document.querySelectorAll(".fade").forEach(function (el) { io ? io.observe(el) : el.classList.add("in"); });

function money(n) { return "NT$" + Number(n).toLocaleString("en-US"); }
function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
var WEEK = ["日", "一", "二", "三", "四", "五", "六"];
function nice(s) { var d = Store.parse(s); return (d.getMonth() + 1) + "/" + d.getDate() + "（" + WEEK[d.getDay()] + "）"; }

/* ---------- 房型卡片：今晚剩餘 ---------- */
function paintBadges() {
  var t = Store.today();
  document.querySelectorAll("[data-room]").forEach(function (el) {
    var left = Store.remaining(el.dataset.room, t);
    var b = el.querySelector(".avail-badge");
    if (!b) { b = document.createElement("span"); b.className = "avail-badge"; (el.querySelector(".badge-slot") || el).appendChild(b); }
    b.className = "avail-badge " + (left > 0 ? "ok" : "full");
    b.textContent = left > 0 ? "今晚尚有 " + left + " 間" : "今晚已滿";
  });
}
if (window.Store) { paintBadges(); Store.onChange(paintBadges); }

/* ---------- 空房日曆 ---------- */
var cal = document.getElementById("cal");
if (cal && window.Store) {
  var now = new Date(), view = new Date(now.getFullYear(), now.getMonth(), 1), filter = "all", picked = null;
  var tabs = document.getElementById("calTabs");
  tabs.innerHTML = '<button data-f="all" class="active">全部房型</button>' + Store.rooms().map(function (r) {
    return '<button data-f="' + r.id + '"><i style="background:' + r.color + '"></i>' + esc(r.name) + "</button>";
  }).join("");
  tabs.addEventListener("click", function (e) {
    var b = e.target.closest("button"); if (!b) return;
    filter = b.dataset.f; tabs.querySelectorAll("button").forEach(function (x) { x.classList.toggle("active", x === b); });
    renderCal();
  });
  document.getElementById("calPrev").onclick = function () { view.setMonth(view.getMonth() - 1); renderCal(); };
  document.getElementById("calNext").onclick = function () { view.setMonth(view.getMonth() + 1); renderCal(); };
  cal.addEventListener("click", function (e) {
    var c = e.target.closest(".day[data-date]"); if (!c || c.classList.contains("past")) return;
    picked = c.dataset.date; renderCal(); renderDay();
  });
  function cellInfo(date) {
    var rooms = Store.rooms();
    if (filter !== "all") { var n = Store.remaining(filter, date); return { n: n, label: n > 0 ? "可訂" : "已滿" }; }
    var singles = rooms.filter(function (r) { return !r.whole; }), n2 = 0;
    singles.forEach(function (r) { n2 += Store.remaining(r.id, date); });
    return { n: n2, label: n2 > 0 ? "剩 " + n2 + " 間" : "已滿" };
  }
  function renderCal() {
    var y = view.getFullYear(), m = view.getMonth(), first = new Date(y, m, 1).getDay(), days = new Date(y, m + 1, 0).getDate();
    var t = Store.today();
    document.getElementById("calTitle").textContent = y + " 年 " + (m + 1) + " 月";
    var minView = new Date(now.getFullYear(), now.getMonth(), 1);
    document.getElementById("calPrev").disabled = view <= minView;
    var h = WEEK.map(function (w) { return '<div class="dow">' + w + "</div>"; }).join("");
    for (var i = 0; i < first; i++) h += '<div class="day blank"></div>';
    for (var d = 1; d <= days; d++) {
      var ds = Store.ymd(new Date(y, m, d));
      if (ds < t) { h += '<div class="day past"><b>' + d + "</b></div>"; continue; }
      var info = cellInfo(ds);
      h += '<button type="button" class="day ' + (info.n > 0 ? "ok" : "full") + (ds === t ? " today" : "") + (ds === picked ? " picked" : "") +
        '" data-date="' + ds + '"><b>' + d + "</b><span>" + info.label + "</span></button>";
    }
    cal.innerHTML = h;
    document.getElementById("calStamp").textContent = "房況更新於 " + new Date().toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  }
  function renderDay() {
    var box = document.getElementById("dayPanel"); if (!picked) return;
    var co = Store.addDays(picked, 1);
    box.innerHTML = "<h3>" + nice(picked) + " 入住・1 晚</h3>" + Store.rooms().map(function (r) {
      var n = Store.remaining(r.id, picked);
      return '<div class="day-room ' + (n > 0 ? "" : "is-full") + '"><i style="background:' + r.color + '"></i><div><b>' + esc(r.name) + "</b><small>" + r.cap + " 人・" + money(r.price) + " / 晚</small></div>" +
        (n > 0 ? '<a class="btn solid sm" href="booking.html?room=' + r.id + "&checkin=" + picked + "&checkout=" + co + '">預訂</a>' : '<span class="full-tag">已滿</span>') + "</div>";
    }).join("") + '<a class="more" href="booking.html?checkin=' + picked + "&checkout=" + co + '">住多晚？到訂房頁選擇日期 →</a>';
  }
  renderCal();
  Store.onChange(function () { renderCal(); renderDay(); });
  setInterval(function () { renderCal(); }, 15000);
}

/* ---------- 線上訂房 ---------- */
var bk = document.getElementById("bookApp");
if (bk && window.Store) {
  var q = new URLSearchParams(location.search), st = { room: q.get("room") };
  var ci = document.getElementById("bkIn"), co = document.getElementById("bkOut"), gs = document.getElementById("bkGuests");
  var t0 = Store.today();
  ci.min = t0; ci.value = q.get("checkin") && q.get("checkin") >= t0 ? q.get("checkin") : t0;
  co.min = Store.addDays(ci.value, 1);
  co.value = q.get("checkout") && q.get("checkout") > ci.value ? q.get("checkout") : Store.addDays(ci.value, 1);
  if (q.get("guests")) gs.value = q.get("guests");
  ci.addEventListener("change", function () { co.min = Store.addDays(ci.value, 1); if (co.value <= ci.value) co.value = co.min; list(); });
  co.addEventListener("change", list); gs.addEventListener("change", list);

  function step(n, still) {
    bk.querySelectorAll(".bk-step").forEach(function (s, i) { s.hidden = i + 1 !== n; });
    bk.querySelectorAll(".bk-progress li").forEach(function (li, i) { li.classList.toggle("on", i < n); });
    if (!still) window.scrollTo({ top: bk.offsetTop - 90, behavior: "smooth" });
  }
  function list() {
    var n = Store.nights(ci.value, co.value), g = +gs.value;
    document.getElementById("bkNights").textContent = n + " 晚";
    document.getElementById("bkRooms").innerHTML = Store.rooms().map(function (r) {
      var left = Store.rangeRemaining(r.id, ci.value, co.value), fit = g <= r.cap, ok = left > 0 && fit;
      var why = left < 1 ? "所選日期已滿" : (!fit ? "最多 " + r.cap + " 人入住" : "剩 " + left + " 間");
      return '<div class="bk-room ' + (ok ? "" : "off") + (st.room === r.id ? " sel" : "") + '" data-id="' + r.id + '">' +
        '<img src="' + r.photo + '" alt="' + esc(r.name) + '"><div class="bk-room-body"><h3><i style="background:' + r.color + '"></i>' + esc(r.name) + "</h3>" +
        "<p>" + r.cap + " 人房・" + money(r.price) + " / 晚</p><span class=\"left " + (ok ? "ok" : "full") + "\">" + why + "</span></div>" +
        '<div class="bk-room-price"><small>' + n + " 晚合計</small><b>" + money(r.price * n) + "</b>" +
        (ok ? '<button type="button" class="btn solid sm" data-pick="' + r.id + '">選擇</button>' : '<button type="button" class="btn sm" disabled>無法預訂</button>') + "</div></div>";
    }).join("");
  }
  document.getElementById("bkRooms").addEventListener("click", function (e) {
    var b = e.target.closest("[data-pick]"); if (!b) return;
    st.room = b.dataset.pick; fillSummary(); step(2);
  });
  function fillSummary() {
    var r = Store.room(st.room), n = Store.nights(ci.value, co.value);
    document.querySelectorAll(".bk-summary").forEach(function (el) {
      el.innerHTML = '<img src="' + r.photo + '" alt=""><div><b>' + esc(r.name) + "</b><p>" + nice(ci.value) + " → " + nice(co.value) + "・" + n + " 晚<br>" + gs.value + " 位成人</p></div>" +
        '<div class="sum-total"><span>總金額</span><b>' + money(r.price * n) + "</b></div>";
    });
  }
  document.getElementById("bkBack").onclick = function () { step(1); list(); };
  document.getElementById("bkForm").addEventListener("submit", function (e) {
    e.preventDefault();
    var f = new FormData(e.target), err = document.getElementById("bkErr");
    try {
      var b = Store.book({ room: st.room, checkin: ci.value, checkout: co.value, guests: +gs.value, name: f.get("name"), phone: f.get("phone"),
        email: f.get("email"), arrive: f.get("arrive"), note: f.get("note"), source: "官網訂房" });
      err.textContent = "";
      document.getElementById("bkDone").innerHTML =
        '<div class="done-mark">✓</div><h2>訂房申請已送出</h2><p class="note">訂單編號</p><div class="done-id">' + b.id + "</div>" +
        '<div class="done-grid"><div><span>房型</span><b>' + esc(Store.room(b.room).name) + "</b></div><div><span>入住</span><b>" + nice(b.checkin) + "</b></div>" +
        "<div><span>退房</span><b>" + nice(b.checkout) + "</b></div><div><span>金額</span><b>" + money(b.amount) + "</b></div></div>" +
        '<p class="note">訂單狀態：<b>待確認</b>。民宿將以電話或 LINE 與您聯繫，提供訂金匯款資訊；完成轉帳後即訂房成功。</p>' +
        '<p class="demo-note">示範模式：此訂單只存在於這台裝置的瀏覽器中，不會真正送出給民宿。</p>' +
        '<div class="btns" style="justify-content:center"><a class="btn solid" href="index.html">回首頁</a><a class="btn" href="availability.html">查看空房日曆</a><a class="btn" href="admin.html">到後台查看此訂單</a></div>';
      e.target.reset(); step(3);
    } catch (x) { err.textContent = x.message; }
  });
  list(); step(1, true);
  if (st.room && Store.rangeRemaining(st.room, ci.value, co.value) > 0) {
    var row = bk.querySelector('.bk-room[data-id="' + st.room + '"]'); if (row) row.scrollIntoView({ block: "nearest" });
  }
  Store.onChange(function () { if (!document.getElementById("bkStep1").hidden) list(); });
}

// gallery
var grid = document.querySelector(".masonry");
if (grid) {
  var figs = Array.prototype.slice.call(grid.querySelectorAll("figure"));
  var lb = document.querySelector(".lightbox"), lbImg = lb.querySelector("img"), lbCount = lb.querySelector(".lb-count");
  var visible = figs, cur = 0;
  function show(i) {
    cur = (i + visible.length) % visible.length;
    lbImg.src = visible[cur].querySelector("img").src;
    lbImg.alt = visible[cur].querySelector("img").alt;
    lbCount.textContent = (cur + 1) + " / " + visible.length;
  }
  figs.forEach(function (f) {
    f.addEventListener("click", function () { show(visible.indexOf(f)); lb.classList.add("open"); });
  });
  lb.querySelector(".lb-close").onclick = function () { lb.classList.remove("open"); };
  lb.querySelector(".lb-prev").onclick = function (e) { e.stopPropagation(); show(cur - 1); };
  lb.querySelector(".lb-next").onclick = function (e) { e.stopPropagation(); show(cur + 1); };
  lb.addEventListener("click", function (e) { if (e.target === lb) lb.classList.remove("open"); });
  document.addEventListener("keydown", function (e) {
    if (!lb.classList.contains("open")) return;
    if (e.key === "Escape") lb.classList.remove("open");
    if (e.key === "ArrowLeft") show(cur - 1);
    if (e.key === "ArrowRight") show(cur + 1);
  });
  function applyFilter(cat) {
    document.querySelectorAll(".filters button").forEach(function (b) { b.classList.toggle("active", b.dataset.cat === cat); });
    figs.forEach(function (f) { f.classList.toggle("hide", cat !== "all" && f.dataset.cat.indexOf(cat) < 0); });
    visible = figs.filter(function (f) { return !f.classList.contains("hide"); });
  }
  document.querySelectorAll(".filters button").forEach(function (b) {
    b.addEventListener("click", function () { applyFilter(b.dataset.cat); history.replaceState(null, "", b.dataset.cat === "all" ? location.pathname : "#" + b.dataset.cat); });
  });
  var h = location.hash.slice(1);
  if (h && document.querySelector('.filters button[data-cat="' + h + '"]')) applyFilter(h);
}


/* ===== DEMO LOCK：提案示範版專用 ===== */
(function () {
  var CONTACT = "九號科技工作室 NINTH LAB｜LINE：@417lyjkr";
  var bar = document.createElement("div");
  bar.className = "demo-bar";
  bar.innerHTML = "<b>示範版本 DEMO</b><span>本網站僅供提案展示，線上訂房為模擬操作，不會成立真實訂單。網站設計與程式著作權屬九號科技工作室所有，未經授權禁止使用、複製或轉載。</span>";
  document.body.insertBefore(bar, document.body.firstChild);

  var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="360" height="220"><text x="180" y="120" text-anchor="middle" transform="rotate(-24 180 110)" font-family="sans-serif" font-size="22" font-weight="700" fill="rgba(128,128,128,0.22)">示範版本 DEMO・NINTH LAB</text></svg>';
  var wm = document.createElement("div");
  wm.className = "demo-wm";
  wm.setAttribute("aria-hidden", "true");
  wm.style.backgroundImage = 'url("data:image/svg+xml,' + encodeURIComponent(svg) + '")';
  document.body.appendChild(wm);

  var m = document.createElement("div");
  m.className = "demo-modal";
  m.innerHTML = '<div class="demo-box"><b>示範版本</b><p>此功能將於正式版上線後啟用。<br>目前網站僅供提案展示，未經授權請勿使用。</p><p class="demo-c">正式版洽詢：' + CONTACT + '</p><button type="button">我知道了</button></div>';
  document.body.appendChild(m);
  function show(e) { if (e) { e.preventDefault(); e.stopPropagation(); } m.classList.add("open"); }
  m.addEventListener("click", function (e) { if (e.target === m || e.target.tagName === "BUTTON") m.classList.remove("open"); });

  document.addEventListener("click", function (e) {
    if (e.target.closest(".demo-modal")) return;
    var a = e.target.closest("a");
    if (a && /^(https?:|tel:|mailto:)/.test(a.getAttribute("href") || "")) return show(e);
  }, true);

  ["contextmenu", "dragstart", "copy", "cut"].forEach(function (t) {
    document.addEventListener(t, function (e) { e.preventDefault(); });
  });
  document.addEventListener("keydown", function (e) {
    var k = (e.key || "").toLowerCase(), mod = e.ctrlKey || e.metaKey;
    if (e.key === "F12" || (mod && "supc".indexOf(k) > -1 && k) ||
        (mod && (e.shiftKey || e.altKey) && "ijcu".indexOf(k) > -1 && k)) e.preventDefault();
  });
})();
