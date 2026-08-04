# 习惯打卡

一个简单好看的个人习惯打卡网页。每天打开，点击打卡（+1），达到目标自动打勾；支持每日 / 每周 / 每月三种周期，带历史日历与连续打卡统计。

技术栈：React + TypeScript + Vite + Supabase（云端同步、邮箱登录），部署到 GitHub Pages。

## 功能

- 添加 / 编辑 / 删除习惯：名称、emoji、周期（每日 / 每周 / 每月）、每周期目标次数
- 支持**一次性任务**：设定截止日期，到期未完成自动标记为已过期
- 支持**定时提醒**：每个习惯可设每天 / 每周 / 每月固定时间提醒，**可添加多个提醒时间**（打开网页时弹提示 + 浏览器通知）
- 今日页：点 + 打卡、点 − 撤销，实时进度（如 3/8），达标自动打勾，顶部显示「今日已完成 X 项」
- 历史页：月历视图（格子里的小数字 = 当天完成的习惯数）、连续打卡天数、本月完成天数
- 首次使用提供「喝水 / 运动 / 读书」示例习惯一键添加

## 一、创建 Supabase 项目

1. 打开 <https://database.new> 注册 / 登录并创建一个项目（免费档即可），记下项目密码。
2. 进入项目控制台 → **SQL Editor**，把 `supabase/migrations/20260803000000_init.sql` 的**全部内容**粘贴进去，点击 **Run** 执行（会创建 `habits`、`checkins` 两张表和打卡 RPC）。
3. 建议关闭邮箱确认（可选）：控制台 → **Authentication → Sign In / Up → Email**，关闭「Confirm email」，这样注册后即可直接登录。
4. 控制台 → **Project Settings → API**，复制：
   - `Project URL`（形如 `https://xxxx.supabase.co`）
   - `anon public` 密钥

## 二、本地运行

```bash
cp .env.example .env   # 填入上面两个值
pnpm install
pnpm dev
```

打开终端提示的地址即可使用。

## 三、部署到 GitHub Pages

1. 在 GitHub 创建一个仓库（可设为 Private），把本项目推上去：
   ```bash
   git init
   git add .
   git commit -m "init"
   git branch -M main
   git remote add origin git@github.com:<你的用户名>/<仓库名>.git
   git push -u origin main
   ```
2. 仓库 **Settings → Secrets and variables → Actions**，添加两个 Secrets：
   - `VITE_SUPABASE_URL`：Supabase Project URL
   - `VITE_SUPABASE_ANON_KEY`：anon 公钥
3. 仓库 **Settings → Pages**，Source 选择 **GitHub Actions**。
4. 推送 `main` 分支（或手动运行 Actions 里的 `Deploy to GitHub Pages`）即自动构建并部署。页面地址为 `https://<你的用户名>.github.io/<仓库名>/`。

## 常用命令

| 命令 | 说明 |
| --- | --- |
| `pnpm dev` | 本地开发 |
| `pnpm build` | 类型检查 + 构建到 `dist/` |
| `pnpm preview` | 预览构建产物 |

## 周期规则说明

- **每日**：当天打卡次数达标即完成
- **每周**：本周一 00:00 至周日 24:00 累计达标（周一为一周第一天）
- **每月**：本月 1 日起累计达标
- 「今日已完成」= 当天完成（每日达标、或周 / 月习惯当天首次达到周期目标）的习惯数量
- 连续打卡 = 从今天（或昨天）往前，每天至少完成 1 个习惯的连续天数
