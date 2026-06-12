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
      { error: e.message || "シートの読み込みに失敗しました。" },
      { status: 500 }
    );
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    if (!body.content || !body.requester) {
      return NextResponse.json(
        { error: "依頼者と依頼内容は必須です。" },
        { status: 400 }
      );
    }
    const item = await addRequest(body);
    return NextResponse.json({ item });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: e.message || "登録に失敗しました。" },
      { status: 500 }
    );
  }
}
