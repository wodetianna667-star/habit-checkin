import { useEffect, useState } from "react";
import { HashRouter, Navigate, Route, Routes } from "react-router-dom";
import type { Session } from "@supabase/supabase-js";
import { isSupabaseConfigured, supabase } from "./lib/supabase";
import LoginPage from "./pages/LoginPage";
import Layout from "./components/Layout";
import TodayPage from "./pages/TodayPage";
import HabitsPage from "./pages/HabitsPage";
import HistoryPage from "./pages/HistoryPage";

function ConfigScreen() {
  return (
    <div className="center-screen">
      <div className="card config-card">
        <h1>21天</h1>
        <p className="muted">尚未配置 Supabase 环境变量。</p>
        <ol className="config-steps">
          <li>复制 <code>.env.example</code> 为 <code>.env</code></li>
          <li>填入你的 Supabase 项目地址与 anon 公钥</li>
          <li>保存后刷新页面即可</li>
        </ol>
        <p className="muted small">完整步骤见 README.md</p>
      </div>
    </div>
  );
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setLoading(false);
      return;
    }
    void supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="center-screen">
        <p className="muted">加载中…</p>
      </div>
    );
  }

  if (!isSupabaseConfigured) {
    return <ConfigScreen />;
  }

  return (
    <HashRouter>
      <Routes>
        <Route
          path="/login"
          element={session ? <Navigate to="/" replace /> : <LoginPage />}
        />
        <Route element={<Layout session={session} />}>
          <Route path="/" element={<TodayPage />} />
          <Route path="/habits" element={<HabitsPage />} />
          <Route path="/history" element={<HistoryPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  );
}
