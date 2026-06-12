import { NextResponse } from "next/server";
import { listRequests, addRequest } from "@/lib/sheets";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const items = await listRequests();
    return NextResponse.json({ items });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "シートの読み込みに失敗しました。環境変数とシートの共有設定を確認してください。" },
      { status: 500 }
    );
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    if (!body.part || !body.requester) {
      return NextResponse.json(
        { error: "依頼者と部品名は必須です。" },
        { status: 400 }
      );
    }
    const item = await addRequest(body);
    return NextResponse.json({ item });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "登録に失敗しました。" },
      { status: 500 }
    );
  }
}
