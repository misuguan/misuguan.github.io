// 米宿館 Roomi house2
var BOOKING_URL = "https://www.booking.com/hotel/tw/mi-su-guan-roomi-house2.zh-tw.html";
var LINE_URL = "https://line.me/R/ti/p/@qji1016i";

// mobile menu
document.addEventListener("click", function (e) {
  var btn = e.target.closest(".menu-btn");
  if (btn) document.querySelector(".nav").classList.toggle("open");
});

// fade-in
var io = "IntersectionObserver" in window ? new IntersectionObserver(function (es) {
  es.forEach(function (x) { if (x.isIntersecting) { x.target.classList.add("in"); io.unobserve(x.target); } });
}, { threshold: .12 }) : null;
document.querySelectorAll(".fade").forEach(function (el) { io ? io.observe(el) : el.classList.add("in"); });

function fmt(d) { return d.toISOString().slice(0, 10); }
function initDates(ci, co) {
  if (!ci || !co) return;
  var t = new Date(); var tm = new Date(Date.now() + 864e5);
  ci.min = fmt(t); co.min = fmt(tm);
  if (!ci.value) ci.value = fmt(t);
  if (!co.value) co.value = fmt(tm);
  ci.addEventListener("change", function () {
    var n = new Date(ci.value); n.setDate(n.getDate() + 1);
    co.min = fmt(n);
    if (co.value <= ci.value) co.value = fmt(n);
  });
}
function nights(a, b) { return Math.round((new Date(b) - new Date(a)) / 864e5); }

// availability page
var avail = document.getElementById("availForm");
if (avail) {
  var ci = avail.querySelector("[name=checkin]"), co = avail.querySelector("[name=checkout]");
  initDates(ci, co);
  avail.addEventListener("submit", function (e) {
    e.preventDefault();
    var adults = avail.querySelector("[name=adults]").value;
    var url = BOOKING_URL + "?checkin=" + ci.value + "&checkout=" + co.value +
      "&group_adults=" + adults + "&no_rooms=1&group_children=0#availability";
    window.open(url, "_blank", "noopener");
  });
  document.getElementById("availLine").addEventListener("click", function () {
    var adults = avail.querySelector("[name=adults]").value;
    var msg = "您好，想詢問空房：\n入住 " + ci.value + "\n退房 " + co.value + "（" + nights(ci.value, co.value) + " 晚）\n人數 " + adults + " 位";
    copyThenOpen(msg, LINE_URL, document.getElementById("availHint"));
  });
}

// booking page
var bf = document.getElementById("bookForm");
if (bf) {
  var bci = bf.querySelector("[name=checkin]"), bco = bf.querySelector("[name=checkout]");
  initDates(bci, bco);
  var q = new URLSearchParams(location.search).get("room");
  if (q) { var sel = bf.querySelector("[name=room]"); for (var i = 0; i < sel.options.length; i++) if (sel.options[i].value === q) sel.selectedIndex = i; }
  bf.addEventListener("submit", function (e) {
    e.preventDefault();
    var f = new FormData(bf);
    var msg = "【米宿館 訂房申請】\n" +
      "姓名：" + f.get("name") + "\n電話：" + f.get("phone") + "\n" +
      "房型：" + f.get("room") + "\n入住：" + f.get("checkin") + "\n退房：" + f.get("checkout") +
      "（" + nights(f.get("checkin"), f.get("checkout")) + " 晚）\n人數：" + f.get("adults") + " 位\n" +
      "預計抵達時間：" + (f.get("arrive") || "未填") + "\n備註：" + (f.get("note") || "無");
    var box = document.getElementById("bookResult");
    box.querySelector("pre").textContent = msg;
    box.classList.add("show");
    box.scrollIntoView({ behavior: "smooth", block: "center" });
    box.dataset.msg = msg;
  });
  document.getElementById("sendLine").addEventListener("click", function () {
    copyThenOpen(document.getElementById("bookResult").dataset.msg, LINE_URL, document.getElementById("bookHint"));
  });
}

function copyThenOpen(text, url, hint) {
  var done = function () {
    if (hint) hint.textContent = "✓ 訊息已複製，請在 LINE 對話框中貼上送出";
    window.open(url, "_blank", "noopener");
  };
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, done);
  else done();
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
  bar.innerHTML = "<b>示範版本 DEMO</b><span>本網站僅供提案展示，功能尚未啟用。網站設計與程式著作權屬九號科技工作室所有，未經授權禁止使用、複製或轉載。</span>";
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
    if (e.target.closest("#availLine,#sendLine")) return show(e);
  }, true);
  document.addEventListener("submit", function (e) { if (e.target.id === "availForm") show(e); }, true);

  ["contextmenu", "dragstart", "copy", "cut"].forEach(function (t) {
    document.addEventListener(t, function (e) { e.preventDefault(); });
  });
  document.addEventListener("keydown", function (e) {
    var k = (e.key || "").toLowerCase(), mod = e.ctrlKey || e.metaKey;
    if (e.key === "F12" || (mod && "supc".indexOf(k) > -1 && k) ||
        (mod && (e.shiftKey || e.altKey) && "ijcu".indexOf(k) > -1 && k)) e.preventDefault();
  });
})();
