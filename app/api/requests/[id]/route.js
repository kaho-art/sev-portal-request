import { NextResponse } from "next/server";
import { updateStatus } from "@/lib/sheets";

export const dynamic = "force-dynamic";

export async function PATCH(req, { params }) {
  try {
    const body = await req.json();
    const item = await updateStatus(params.id, {
      status: body.status,
      handler: body.handler,
    });
    return NextResponse.json({ item });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "更新に失敗しました。" },
      { status: 500 }
    );
  }
}
