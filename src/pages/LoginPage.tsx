import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { getSupabase } from "../lib/supabase";

function friendlyAuthError(message: string): string {
  if (/invalid login credentials/i.test(message)) return "邮箱或密码不正确";
  if (/already registered/i.test(message)) return "该邮箱已注册，请直接登录";
  if (/password should be at least/i.test(message)) return "密码至少需要 6 位";
  if (/email.*(valid|format)/i.test(message)) return "请输入有效的邮箱地址";
  if (/rate limit/i.test(message)) return "操作太频繁，请稍后再试";
  if (/email signups are disabled/i.test(message))
    return "邮箱注册功能被关闭，请在 Supabase 的 Authentication → Sign In / Up → Email 中启用「Enable Email provider」";
  return message;
}

export default function LoginPage() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setBusy(true);
    try {
      const sb = getSupabase();
      if (mode === "login") {
        const { error } = await sb.auth.signInWithPassword({ email, password });
        if (error) throw new Error(error.message);
        navigate("/");
      } else {
        const { data, error } = await sb.auth.signUp({ email, password });
        if (error) throw new Error(error.message);
        if (data.session) {
          navigate("/");
        } else {
          setMessage("注册成功！请前往邮箱点击确认链接，然后登录。");
          setMode("login");
        }
      }
    } catch (err) {
      setError(friendlyAuthError(err instanceof Error ? err.message : "操作失败，请重试"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="center-screen">
      <div className="card login-card">
        <div className="login-logo">✅</div>
        <h1 className="login-title">习惯打卡</h1>
        <p className="muted center">每天一点点，坚持看得见</p>
        <div className="seg login-seg">
          <button
            type="button"
            className={`seg-btn${mode === "login" ? " active" : ""}`}
            onClick={() => {
              setMode("login");
              setError(null);
              setMessage(null);
            }}
          >
            登录
          </button>
          <button
            type="button"
            className={`seg-btn${mode === "signup" ? " active" : ""}`}
            onClick={() => {
              setMode("signup");
              setError(null);
              setMessage(null);
            }}
          >
            注册
          </button>
        </div>
        <form onSubmit={(e) => void handleSubmit(e)}>
          <div className="field">
            <label>邮箱</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              required
            />
          </div>
          <div className="field">
            <label>密码</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="至少 6 位"
              minLength={6}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              required
            />
          </div>
          {error && <p className="form-error">{error}</p>}
          {message && <p className="form-message">{message}</p>}
          <button type="submit" className="btn primary btn-block" disabled={busy}>
            {busy ? "请稍候…" : mode === "login" ? "登录" : "注册"}
          </button>
        </form>
      </div>
    </div>
  );
}
