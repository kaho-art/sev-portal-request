// Google Apps Script のウェブアプリを呼び出す薄いクライアント。
// GAS_URL はサーバー側の環境変数(ブラウザには露出しない)。

async function callGas(payload) {
  const url = process.env.GAS_URL;
  if (!url) {
    throw new Error("環境変数 GAS_URL が設定されていません。");
  }
  const res = await fetch(url, {
    method: "POST",
    // GASはtext/plainで受けるのが安定(プリフライト回避・302リダイレクト対応)
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(payload),
    redirect: "follow",
    cache: "no-store",
  });
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(
      "Apps Scriptからの応答が読み取れません。デプロイ設定(アクセス: 全員)を確認してください。"
    );
  }
  if (data.error) throw new Error(data.error);
  return data;
}

export async function listRequests() {
  const data = await callGas({ action: "list" });
  return data.items || [];
}

export async function addRequest(body) {
  const data = await callGas({ action: "add", ...body });
  return data.item;
}

export async function updateStatus(id, { status, handler }) {
  const data = await callGas({ action: "update", id, status, handler });
  return data.item;
}

export async function editRequest(id, fields) {
  const data = await callGas({ action: "edit", id, ...fields });
  return data.item;
}

export async function initSheet() {
  return callGas({ action: "init" });
}
