/* 米宿館 示範訂房系統：資料層（展示版，資料存在本機瀏覽器 localStorage） */
var Store = (function () {
  var KEY = "misuguan_demo_v1";
  var ACTIVE = { "待確認": 1, "已確認": 1, "已入住": 1 };
  var DEFAULT_ROOMS = [
    { id: "orange", name: "橘一 雙人房", short: "橘一", cap: 2, units: 1, price: 2800, color: "#c9692a", photo: "images/p01.jpg" },
    { id: "blue",   name: "藍二 雙人房", short: "藍二", cap: 2, units: 1, price: 2800, color: "#3d6a8a", photo: "images/p27.jpg" },
    { id: "triple", name: "三人房",      short: "三人", cap: 3, units: 1, price: 3600, color: "#9a6b43", photo: "images/p04.jpg" },
    { id: "whole",  name: "整棟包棟",    short: "包棟", cap: 6, units: 1, price: 8800, color: "#2b2622", photo: "images/p03.jpg", whole: true }
  ];

  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function ymd(d) { return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
  function parse(s) { var p = s.split("-"); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function addDays(s, n) { var d = parse(s); d.setDate(d.getDate() + n); return ymd(d); }
  function today() { return ymd(new Date()); }
  function nights(ci, co) { return Math.round((parse(co) - parse(ci)) / 864e5); }
  function eachNight(ci, co) { var out = [], d = ci; while (d < co) { out.push(d); d = addDays(d, 1); } return out; }

  function seed() {
    var t = today();
    var d = { v: 1, rooms: JSON.parse(JSON.stringify(DEFAULT_ROOMS)), base: {}, bookings: [], seq: 0 };
    var samples = [
      ["orange", 0, 2, "林小姐", "0912-345-678", 2, "已入住", "預計 16:00 抵達"],
      ["triple", 1, 3, "陳先生", "0921-555-120", 3, "已確認", ""],
      ["blue", 2, 4, "Amy Wang", "0933-208-771", 2, "待確認", "想加購早餐資訊"],
      ["whole", 9, 11, "張家旅行團", "0988-660-321", 6, "已確認", "家族旅行，晚上 20:00 抵達"],
      ["orange", 5, 6, "黃先生", "0955-102-889", 1, "待確認", ""],
      ["blue", -3, -1, "李小姐", "0910-777-456", 2, "已確認", ""]
    ];
    samples.forEach(function (s) {
      var ci = addDays(t, s[1]), co = addDays(t, s[2]);
      add(d, { room: s[0], checkin: ci, checkout: co, name: s[3], phone: s[4], guests: s[5], status: s[6], note: s[7], email: "", arrive: "", source: "範例資料" });
    });
    d.base["blue|" + addDays(t, 7)] = 0; // 示範：老闆手動關房一天
    return d;
  }

  function load() {
    try { var d = JSON.parse(localStorage.getItem(KEY)); if (d && d.v === 1) return d; } catch (e) {}
    var s = seed(); save(s); return s;
  }
  function save(d) {
    try { localStorage.setItem(KEY, JSON.stringify(d)); } catch (e) {}
    try { window.dispatchEvent(new CustomEvent("store-change")); } catch (e) {}
  }

  function room(d, id) { for (var i = 0; i < d.rooms.length; i++) if (d.rooms[i].id === id) return d.rooms[i]; return null; }
  function singles(d) { return d.rooms.filter(function (r) { return !r.whole; }); }
  function bookedOn(d, id, date) {
    var n = 0;
    d.bookings.forEach(function (b) { if (ACTIVE[b.status] && b.room === id && b.checkin <= date && date < b.checkout) n++; });
    return n;
  }
  function baseOf(d, id, date) {
    var k = id + "|" + date;
    return d.base.hasOwnProperty(k) ? d.base[k] : room(d, id).units;
  }
  function ownLeft(d, id, date) { return baseOf(d, id, date) - bookedOn(d, id, date); }
  function remaining(d, id, date) {
    var r = room(d, id); if (!r) return 0;
    var wholeId = (d.rooms.filter(function (x) { return x.whole; })[0] || {}).id;
    if (r.whole) {
      var m = ownLeft(d, id, date);
      singles(d).forEach(function (s) { m = Math.min(m, ownLeft(d, s.id, date)); });
      return Math.max(0, m);
    }
    var left = ownLeft(d, id, date) - (wholeId ? bookedOn(d, wholeId, date) : 0);
    return Math.max(0, left);
  }
  function rangeRemaining(d, id, ci, co) {
    var m = Infinity;
    eachNight(ci, co).forEach(function (n) { m = Math.min(m, remaining(d, id, n)); });
    return m === Infinity ? 0 : m;
  }
  function total(d, id, ci, co) { var r = room(d, id); return r ? r.price * nights(ci, co) : 0; }

  function add(d, b) {
    d.seq = (d.seq || 0) + 1;
    var t = new Date();
    b.id = "RH2-" + String(t.getFullYear()).slice(2) + pad(t.getMonth() + 1) + pad(t.getDate()) + "-" + String(d.seq).padStart(3, "0");
    b.nights = nights(b.checkin, b.checkout);
    b.amount = total(d, b.room, b.checkin, b.checkout);
    b.createdAt = new Date().toISOString();
    b.status = b.status || "待確認";
    d.bookings.push(b);
    return b;
  }

  var api = {
    ymd: ymd, parse: parse, addDays: addDays, today: today, nights: nights, eachNight: eachNight,
    get: load,
    rooms: function () { return load().rooms; },
    room: function (id) { return room(load(), id); },
    remaining: function (id, date) { return remaining(load(), id, date); },
    rangeRemaining: function (id, ci, co) { return rangeRemaining(load(), id, ci, co); },
    booked: function (id, date) { var d = load(); return bookedOn(d, id, date); },
    total: function (id, ci, co) { return total(load(), id, ci, co); },
    book: function (b) {
      var d = load();
      if (!room(d, b.room)) throw new Error("找不到此房型");
      if (b.checkout <= b.checkin) throw new Error("退房日期需晚於入住日期");
      if (rangeRemaining(d, b.room, b.checkin, b.checkout) < 1) throw new Error("很抱歉，所選日期已無空房");
      var res = add(d, b); save(d); return res;
    },
    setStatus: function (id, st) { var d = load(); d.bookings.forEach(function (b) { if (b.id === id) b.status = st; }); save(d); },
    remove: function (id) { var d = load(); d.bookings = d.bookings.filter(function (b) { return b.id !== id; }); save(d); },
    setRemaining: function (id, date, val) {
      var d = load(), r = room(d, id); if (!r) return;
      val = Math.max(0, val | 0);
      var wholeId = (d.rooms.filter(function (x) { return x.whole; })[0] || {}).id;
      var extra = bookedOn(d, id, date) + (!r.whole && wholeId ? bookedOn(d, wholeId, date) : 0);
      d.base[id + "|" + date] = val + extra;
      save(d);
    },
    updateRoom: function (id, patch) { var d = load(), r = room(d, id); if (r) for (var k in patch) r[k] = patch[k]; save(d); },
    reset: function () { try { localStorage.removeItem(KEY); } catch (e) {} save(seed()); },
    onChange: function (cb) {
      window.addEventListener("storage", function (e) { if (e.key === KEY) cb(); });
      window.addEventListener("store-change", cb);
    }
  };
  return api;
})();
