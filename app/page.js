"use client";

import { useEffect, useMemo, useState } from "react";

const STATUSES = ["未対応", "対応中", "済"];
const FILTERS = ["すべて", "未対応", "対応中", "済"];
const TYPES = ["見積り", "部品発注", "請求書"];

const EMPTY_FORM = {
  requester: "",
  type: "見積り",
  content: "",
  editor: "",
};

function typeClass(type) {
  if (type === "見積り") return "t-quote";
  if (type === "部品発注") return "t-order";
  if (type === "請求書") return "t-invoice";
  return "t-other";
}

export default function Home() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("すべて");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null); // null=新規, それ以外=編集中のID
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState("");
  const [form, setForm] = useState(EMPTY_FORM);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/requests", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "読み込みエラー");
      setItems(data.items.slice().reverse()); // 新しい順
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function openNewForm() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function openEditForm(item) {
    setEditingId(item.id);
    setForm({
      requester: item.requester,
      type: TYPES.includes(item.type) ? item.type : "見積り",
      content: item.content,
      editor: "",
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  async function submit() {
    if (!form.requester || !form.content) {
      setError("依頼者と依頼内容は入れてください。");
      return;
    }
    if (editingId && !form.editor) {
      setError("編集者(あなたの名前)を入れてください。");
      return;
    }
    setSaving(true);
    setError("");
    try {
      if (editingId) {
        const res = await fetch(`/api/requests/${editingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "edit", ...form }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "編集エラー");
        setItems((prev) =>
          prev.map((x) => (x.id === editingId ? data.item : x))
        );
      } else {
        const res = await fetch("/api/requests", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "登録エラー");
        setItems((prev) => [data.item, ...prev]);
      }
      closeForm();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function changeStatus(item, status) {
    let handler = item.handler;
    if (status !== "未対応" && !handler) {
      handler = window.prompt("対応者の名前を入れてください", "") || "";
    }
    setBusyId(item.id);
    try {
      const res = await fetch(`/api/requests/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, handler }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "更新エラー");
      setItems((prev) => prev.map((x) => (x.id === item.id ? data.item : x)));
    } catch (e) {
      setError(e.message);
    } finally {
      setBusyId("");
    }
  }

  const counts = useMemo(() => {
    const c = { 未対応: 0, 対応中: 0, 済: 0 };
    items.forEach((i) => {
      if (c[i.status] !== undefined) c[i.status]++;
    });
    return c;
  }, [items]);

  const visible =
    filter === "すべて" ? items : items.filter((i) => i.status === filter);

  return (
    <main className="wrap">
      <header className="masthead">
        <div className="masthead-left">
          <p className="eyebrow">部品・修理 共有ボード</p>
          <h1>依頼受付簿</h1>
        </div>
        <div className="tally">
          <div className="tally-item">
            <span className="tally-num">{counts["未対応"]}</span>
            <span className="tally-label">未対応</span>
          </div>
          <div className="tally-item">
            <span className="tally-num">{counts["対応中"]}</span>
            <span className="tally-label">対応中</span>
          </div>
          <div className="tally-item done">
            <span className="tally-num">{counts["済"]}</span>
            <span className="tally-label">済</span>
          </div>
        </div>
      </header>

      <div className="toolbar">
        <div className="filters" role="tablist" aria-label="ステータスで絞り込み">
          {FILTERS.map((f) => (
            <button
              key={f}
              role="tab"
              aria-selected={filter === f}
              className={"filter" + (filter === f ? " active" : "")}
              onClick={() => setFilter(f)}
            >
              {f}
            </button>
          ))}
        </div>
        <button
          className="add-btn"
          onClick={() => (showForm ? closeForm() : openNewForm())}
        >
          {showForm ? "閉じる" : "＋ 依頼を出す"}
        </button>
      </div>

      {showForm && (
        <section
          className="form-card"
          aria-label={editingId ? "依頼の編集フォーム" : "新規依頼フォーム"}
        >
          {editingId && (
            <p className="form-title">
              依頼 <span className="meta-mono">{editingId}</span> を編集中
            </p>
          )}
          <div className="form-grid">
            <label>
              依頼者 *
              <input
                value={form.requester}
                onChange={(e) => setForm({ ...form, requester: e.target.value })}
                placeholder="例: 田中"
              />
            </label>
            <label>
              種別
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
              >
                {TYPES.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </label>
            <label className="span2">
              依頼内容 *
              <textarea
                rows={4}
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                placeholder={"自由に書いてください\n例: ベアリング6204ZZ 2個、3号ラインのコンベア用。急ぎでお願いします"}
              />
            </label>
            {editingId && (
              <label className="span2 editor-field">
                編集者(あなたの名前) *
                <input
                  value={form.editor}
                  onChange={(e) => setForm({ ...form, editor: e.target.value })}
                  placeholder="例: 佐藤"
                />
              </label>
            )}
          </div>
          <button className="submit-btn" onClick={submit} disabled={saving}>
            {saving
              ? "保存中…"
              : editingId
              ? "この内容に変更する"
              : "この内容で依頼する"}
          </button>
        </section>
      )}

      {error && <p className="error">{error}</p>}

      {loading ? (
        <p className="empty">読み込み中…</p>
      ) : visible.length === 0 ? (
        <p className="empty">
          {filter === "すべて"
            ? "まだ依頼はありません。「＋ 依頼を出す」から登録できます。"
            : `「${filter}」の依頼はありません。`}
        </p>
      ) : (
        <ul className="list">
          {visible.map((item) => (
            <li
              key={item.id}
              className={"card" + (item.status === "済" ? " is-done" : "")}
            >
              <div className="card-main">
                <div className="card-top">
                  <span className={"type-badge " + typeClass(item.type)}>
                    {item.type}
                  </span>
                  <span className="meta-mono">{item.date}</span>
                  <span className="meta-mono dim">{item.id}</span>
                </div>
                <p className="content">{item.content}</p>
                <p className="people">
                  依頼: <b>{item.requester}</b>
                  {item.handler && (
                    <>
                      {" "}/ 対応: <b>{item.handler}</b>
                    </>
                  )}
                  {item.editor && (
                    <>
                      {" "}/ 編集: <b>{item.editor}</b>
                      <span className="meta-mono dim">({item.updatedAt})</span>
                    </>
                  )}
                </p>
              </div>

              <div className="card-side">
                {item.status === "済" ? (
                  <div className="hanko" aria-label="対応済">済</div>
                ) : (
                  <span
                    className={
                      "status-pill s-" +
                      (item.status === "対応中" ? "doing" : "todo")
                    }
                  >
                    {item.status}
                  </span>
                )}
                <div className="actions">
                  {STATUSES.filter((s) => s !== item.status).map((s) => (
                    <button
                      key={s}
                      className={"act" + (s === "済" ? " act-done" : "")}
                      disabled={busyId === item.id}
                      onClick={() => changeStatus(item, s)}
                    >
                      {busyId === item.id
                        ? "…"
                        : s === "済"
                        ? "済にする"
                        : s === "対応中"
                        ? "対応中にする"
                        : "未対応に戻す"}
                    </button>
                  ))}
                  <button
                    className="act act-edit"
                    disabled={busyId === item.id}
                    onClick={() => openEditForm(item)}
                  >
                    ✎ 編集
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <footer className="foot">
        データは Google スプレッドシートに保存されます。シート側で直接編集も可能です。
      </footer>
    </main>
  );
}
