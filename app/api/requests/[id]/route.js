import { NextResponse } from "next/server";
import { updateStatus, editRequest } from "@/lib/sheets";

export const dynamic = "force-dynamic";

export async function PATCH(req, { params }) {
  try {
    const body = await req.json();

    // 依頼内容の編集
    if (body.action === "edit") {
      if (!body.editor) {
        return NextResponse.json(
          { error: "編集者の名前を入れてください。" },
          { status: 400 }
        );
      }
      const item = await editRequest(params.id, {
        requester: body.requester,
        type: body.type,
        part: body.part,
        qty: body.qty,
        place: body.place,
        memo: body.memo,
        editor: body.editor,
      });
      return NextResponse.json({ item });
    }

    // ステータス変更
    const item = await updateStatus(params.id, {
      status: body.status,
      handler: body.handler,
    });
    return NextResponse.json({ item });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: e.message || "更新に失敗しました。" },
      { status: 500 }
    );
  }
}
