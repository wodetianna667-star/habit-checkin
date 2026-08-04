import { useCallback, useEffect, useState } from "react";
import { disablePush, enablePush, getPushStatus, isPushSupported } from "../lib/push";

export default function PushSettings() {
  const [status, setStatus] = useState<"on" | "off" | "unsupported" | "loading">("loading");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setStatus(await getPushStatus());
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function handleEnable() {
    setBusy(true);
    setError(null);
    try {
      await enablePush();
      setStatus("on");
    } catch (err) {
      setError(err instanceof Error ? err.message : "开启失败，请重试");
    } finally {
      setBusy(false);
    }
  }

  async function handleDisable() {
    setBusy(true);
    setError(null);
    try {
      await disablePush();
      setStatus("off");
    } catch (err) {
      setError(err instanceof Error ? err.message : "关闭失败，请重试");
    } finally {
      setBusy(false);
    }
  }

  if (status === "loading") {
    return (
      <div className="card push-card">
        <p className="muted small">检查推送状态…</p>
      </div>
    );
  }

  if (status === "unsupported" || !isPushSupported()) {
    return (
      <div className="card push-card">
        <h3>手机推送</h3>
        <p className="muted small">
          当前浏览器不支持推送通知。iPhone 请用 Safari 打开并把网站「添加到主屏幕」；安卓请用 Chrome。
        </p>
      </div>
    );
  }

  return (
    <div className="card push-card">
      <h3>手机推送</h3>
      <p className="muted small">
        {status === "on"
          ? "已开启：到点提醒会推送到这台设备（即使网页没打开）"
          : "开启后：到点提醒会推送到这台设备（即使网页没打开）"}
      </p>
      {status === "on" ? (
        <button type="button" className="btn danger" disabled={busy} onClick={() => void handleDisable()}>
          {busy ? "处理中…" : "关闭推送"}
        </button>
      ) : (
        <button type="button" className="btn primary" disabled={busy} onClick={() => void handleEnable()}>
          {busy ? "处理中…" : "开启推送"}
        </button>
      )}
      {error && <p className="form-error">{error}</p>}
    </div>
  );
}
