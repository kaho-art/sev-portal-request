/**
 * 部品・修理 依頼ボード — Apps Script バックエンド
 *
 * 使い方:
 * 1. スプレッドシートを開く → メニュー「拡張機能」→「Apps Script」
 * 2. このファイルの中身を全部コピーして貼り付け(元からあるコードは消してOK)
 * 3. 右上「デプロイ」→「新しいデプロイ」→ 種類「ウェブアプリ」
 *    - 次のユーザーとして実行: 自分
 *    - アクセスできるユーザー: 全員
 * 4. 発行された「ウェブアプリのURL」(https://script.google.com/macros/s/.../exec)を
 *    Vercelの環境変数 GAS_URL に設定
 */

var SHEET_NAME = "依頼一覧";
var HEADERS = [
  "ID", "受付日", "依頼者", "種別", "部品名", "数量",
  "使う場所・設備", "メモ", "ステータス", "対応者", "更新日時"
];

function doPost(e) {
  var body;
  try {
    body = JSON.parse(e.postData.contents);
  } catch (err) {
    return json({ error: "リクエストの形式が不正です。" });
  }

  try {
    switch (body.action) {
      case "init":
        return json(init());
      case "list":
        return json({ items: list() });
      case "add":
        return json({ item: add(body) });
      case "update":
        return json({ item: update(body) });
      default:
        return json({ error: "不明なアクションです: " + body.action });
    }
  } catch (err) {
    return json({ error: String(err && err.message ? err.message : err) });
  }
}

// 動作確認用(ブラウザでURLを開いたとき)
function doGet() {
  return json({ ok: true, message: "依頼ボードAPIは動いています。" });
}

function json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function getSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
  }
  return sheet;
}

function init() {
  var sheet = getSheet();
  sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
  sheet.setFrozenRows(1);
  return { ok: true, message: "「" + SHEET_NAME + "」シートを初期化しました。" };
}

function nowJst() {
  return Utilities.formatDate(new Date(), "Asia/Tokyo", "yyyy-MM-dd HH:mm");
}

function rowToObj(row) {
  return {
    id: String(row[0] || ""),
    date: String(row[1] || ""),
    requester: String(row[2] || ""),
    type: String(row[3] || ""),
    part: String(row[4] || ""),
    qty: String(row[5] || ""),
    place: String(row[6] || ""),
    memo: String(row[7] || ""),
    status: String(row[8] || "未対応"),
    handler: String(row[9] || ""),
    updatedAt: String(row[10] || "")
  };
}

function list() {
  var sheet = getSheet();
  var last = sheet.getLastRow();
  if (last < 2) return [];
  var values = sheet.getRange(2, 1, last - 1, HEADERS.length).getDisplayValues();
  return values.map(rowToObj).filter(function (r) { return r.id; });
}

function add(body) {
  if (!body.part || !body.requester) {
    throw new Error("依頼者と部品名は必須です。");
  }
  var sheet = getSheet();
  var id = "R" + new Date().getTime().toString(36).toUpperCase();
  var time = nowJst();
  var row = [
    id,
    time.slice(0, 10),
    body.requester || "",
    body.type || "見積依頼",
    body.part || "",
    body.qty || "",
    body.place || "",
    body.memo || "",
    "未対応",
    "",
    time
  ];
  sheet.appendRow(row);
  return rowToObj(row);
}

function update(body) {
  var sheet = getSheet();
  var last = sheet.getLastRow();
  if (last < 2) throw new Error("データがありません。");
  var ids = sheet.getRange(2, 1, last - 1, 1).getDisplayValues();
  var idx = -1;
  for (var i = 0; i < ids.length; i++) {
    if (ids[i][0] === body.id) { idx = i; break; }
  }
  if (idx === -1) throw new Error("対象の依頼が見つかりません。");

  var rowNum = idx + 2;
  var currentHandler = sheet.getRange(rowNum, 10).getDisplayValue();
  var handler = body.handler !== undefined && body.handler !== null
    ? body.handler
    : currentHandler;

  sheet.getRange(rowNum, 9, 1, 3).setValues([[body.status, handler, nowJst()]]);

  var row = sheet.getRange(rowNum, 1, 1, HEADERS.length).getDisplayValues()[0];
  return rowToObj(row);
}
