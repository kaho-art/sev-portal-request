import { google } from "googleapis";

const SHEET_NAME = "依頼一覧";

// 列の並び(A〜K)
// ID | 受付日 | 依頼者 | 種別 | 部品名 | 数量 | 使う場所・設備 | メモ | ステータス | 対応者 | 更新日時
export const HEADERS = [
  "ID",
  "受付日",
  "依頼者",
  "種別",
  "部品名",
  "数量",
  "使う場所・設備",
  "メモ",
  "ステータス",
  "対応者",
  "更新日時",
];

function getClient() {
  const auth = new google.auth.JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: (process.env.GOOGLE_PRIVATE_KEY || "").replace(/\\n/g, "\n"),
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  return google.sheets({ version: "v4", auth });
}

function sheetId() {
  return process.env.SHEET_ID;
}

function rowToObj(row) {
  return {
    id: row[0] || "",
    date: row[1] || "",
    requester: row[2] || "",
    type: row[3] || "",
    part: row[4] || "",
    qty: row[5] || "",
    place: row[6] || "",
    memo: row[7] || "",
    status: row[8] || "未対応",
    handler: row[9] || "",
    updatedAt: row[10] || "",
  };
}

export async function listRequests() {
  const sheets = getClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId(),
    range: `${SHEET_NAME}!A2:K`,
  });
  const rows = res.data.values || [];
  return rows.map(rowToObj).filter((r) => r.id);
}

export async function addRequest(data) {
  const sheets = getClient();
  const now = new Date();
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const dateStr = jst.toISOString().slice(0, 10);
  const timeStr = jst.toISOString().slice(0, 16).replace("T", " ");
  const id = "R" + now.getTime().toString(36).toUpperCase();

  const row = [
    id,
    dateStr,
    data.requester || "",
    data.type || "見積依頼",
    data.part || "",
    data.qty || "",
    data.place || "",
    data.memo || "",
    "未対応",
    "",
    timeStr,
  ];

  await sheets.spreadsheets.values.append({
    spreadsheetId: sheetId(),
    range: `${SHEET_NAME}!A:K`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [row] },
  });

  return rowToObj(row);
}

export async function updateStatus(id, { status, handler }) {
  const sheets = getClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId(),
    range: `${SHEET_NAME}!A2:K`,
  });
  const rows = res.data.values || [];
  const idx = rows.findIndex((r) => r[0] === id);
  if (idx === -1) throw new Error("not found");

  const rowNum = idx + 2; // ヘッダー分ずらす
  const now = new Date(Date.now() + 9 * 60 * 60 * 1000);
  const timeStr = now.toISOString().slice(0, 16).replace("T", " ");

  await sheets.spreadsheets.values.update({
    spreadsheetId: sheetId(),
    range: `${SHEET_NAME}!I${rowNum}:K${rowNum}`,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [[status, handler ?? rows[idx][9] ?? "", timeStr]],
    },
  });

  rows[idx][8] = status;
  rows[idx][9] = handler ?? rows[idx][9] ?? "";
  rows[idx][10] = timeStr;
  return rowToObj(rows[idx]);
}

export async function initSheet() {
  const sheets = getClient();
  // シートがなければ作る
  const meta = await sheets.spreadsheets.get({ spreadsheetId: sheetId() });
  const exists = meta.data.sheets?.some(
    (s) => s.properties?.title === SHEET_NAME
  );
  if (!exists) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: sheetId(),
      requestBody: {
        requests: [{ addSheet: { properties: { title: SHEET_NAME } } }],
      },
    });
  }
  await sheets.spreadsheets.values.update({
    spreadsheetId: sheetId(),
    range: `${SHEET_NAME}!A1:K1`,
    valueInputOption: "RAW",
    requestBody: { values: [HEADERS] },
  });
  return { ok: true };
}
