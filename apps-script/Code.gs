/**
 * 部品・修理 依頼ボード — Apps Script バックエンド (v2)
 *
 * 変更点(v2):
 * - 種別: 見積り / 部品発注 / 請求書
 * - 依頼日時(時刻まで)を記録
 * - 依頼内容の編集に対応。最終編集者と更新日時を記録
 *
 * 更新方法:
 * 1. スプレッドシート →「拡張機能」→「Apps Script」
 * 2. 中身を全部このコードに置き換えて保存
 * 3. 「デプロイ」→「デプロイを管理」→ 鉛筆アイコン →
 *    バージョン「新バージョン」を選んで「デプロイ」(URLは変わりません)
 * 4. アプリ側で /api/init に一度アクセスしてヘッダーを更新
 */

var SHEET_NAME = "依頼一覧";
var HEADERS = [
  "ID", "依頼日時", "依頼者", "種別", "部品名", "数量",
  "使う場所・設備", "メモ", "ステータス", "対応者", "最終編集者", "更新日時"
];
var COLS = HEADERS.length; // 12

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
      case "edit":
        return json({ item: edit(body) });
      default:
        return json({ error: "不明なアクションです: " + body.action });
    }
  } catch (err) {
    return json({ error: String(err && err.message ? err.message : err) });
  }
}

// 動作確認用(ブラウザでURLを開いたとき)
function doGet() {
  return json({ ok: true, message: "依頼ボードAPI v2 は動いています。" });
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
    sheet.getRange(1, 1, 1, COLS).setValues([HEADERS]);
  }
  return sheet;
}

function init() {
  var sheet = getSheet();
  sheet.getRange(1, 1, 1, COLS).setValues([HEADERS]);
  sheet.setFrozenRows(1);
  return { ok: true, message: "「" + SHEET_NAME + "」シートを初期化しました(v2)。" };
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
    editor: String(row[10] || ""),
    updatedAt: String(row[11] || "")
  };
}

function list() {
  var sheet = getSheet();
  var last = sheet.getLastRow();
  if (last < 2) return [];
  var values = sheet.getRange(2, 1, last - 1, COLS).getDisplayValues();
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
    time,                       // 依頼日時(時刻まで)
    body.requester || "",
    body.type || "見積り",
    body.part || "",
    body.qty || "",
    body.place || "",
    body.memo || "",
    "未対応",
    "",                         // 対応者
    "",                         // 最終編集者
    time                        // 更新日時
  ];
  sheet.appendRow(row);
  return rowToObj(row);
}

function findRow(sheet, id) {
  var last = sheet.getLastRow();
  if (last < 2) return -1;
  var ids = sheet.getRange(2, 1, last - 1, 1).getDisplayValues();
  for (var i = 0; i < ids.length; i++) {
    if (ids[i][0] === id) return i + 2; // 行番号
  }
  return -1;
}

// ステータス変更
function update(body) {
  var sheet = getSheet();
  var rowNum = findRow(sheet, body.id);
  if (rowNum === -1) throw new Error("対象の依頼が見つかりません。");

  var currentHandler = sheet.getRange(rowNum, 10).getDisplayValue();
  var handler = body.handler !== undefined && body.handler !== null
    ? body.handler
    : currentHandler;

  // I:ステータス J:対応者
  sheet.getRange(rowNum, 9, 1, 2).setValues([[body.status, handler]]);
  // L:更新日時
  sheet.getRange(rowNum, 12).setValue(nowJst());

  var row = sheet.getRange(rowNum, 1, 1, COLS).getDisplayValues()[0];
  return rowToObj(row);
}

// 依頼内容の編集
function edit(body) {
  if (!body.editor) throw new Error("編集者の名前は必須です。");
  if (!body.part || !body.requester) {
    throw new Error("依頼者と部品名は必須です。");
  }
  var sheet = getSheet();
  var rowNum = findRow(sheet, body.id);
  if (rowNum === -1) throw new Error("対象の依頼が見つかりません。");

  // C:依頼者 D:種別 E:部品名 F:数量 G:場所 H:メモ
  sheet.getRange(rowNum, 3, 1, 6).setValues([[
    body.requester || "",
    body.type || "見積り",
    body.part || "",
    body.qty || "",
    body.place || "",
    body.memo || ""
  ]]);
  // K:最終編集者 L:更新日時
  sheet.getRange(rowNum, 11, 1, 2).setValues([[body.editor, nowJst()]]);

  var row = sheet.getRange(rowNum, 1, 1, COLS).getDisplayValues()[0];
  return rowToObj(row);
}
