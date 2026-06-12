import { NextResponse } from "next/server";
import { initSheet } from "@/lib/sheets";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await initSheet();
    return NextResponse.json({ ok: true, message: "シートを初期化しました。「依頼一覧」シートにヘッダー行を作成済みです。" });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "初期化に失敗しました。環境変数とシートの共有設定を確認してください。" },
      { status: 500 }
    );
  }
}
