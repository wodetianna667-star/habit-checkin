import { NavLink, Navigate, Outlet } from "react-router-dom";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";

interface Props {
  session: Session | null;
}

export default function Layout({ session }: Props) {
  if (!session) return <Navigate to="/login" replace />;

  async function handleLogout() {
    await supabase?.auth.signOut();
  }

  const d = new Date();
  const dateLabel = `${d.getMonth() + 1}月${d.getDate()}日 · 周${"日一二三四五六"[d.getDay()]}`;

  return (
    <div className="app">
      <header className="header">
        <div>
          <h1 className="app-title">习惯打卡</h1>
          <p className="app-date">{dateLabel}</p>
        </div>
        <button className="btn-ghost" onClick={() => void handleLogout()}>
          退出
        </button>
      </header>
      <main className="main">
        <Outlet />
      </main>
      <nav className="tabbar">
        <NavLink to="/" end className={({ isActive }) => (isActive ? "tab active" : "tab")}>
          今日
        </NavLink>
        <NavLink to="/habits" className={({ isActive }) => (isActive ? "tab active" : "tab")}>
          习惯
        </NavLink>
        <NavLink to="/history" className={({ isActive }) => (isActive ? "tab active" : "tab")}>
          历史
        </NavLink>
      </nav>
    </div>
  );
}
