import { getSupabase } from "./supabase";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function isPushSupported(): boolean {
  return "serviceWorker" in navigator && "PushManager" in window;
}

function swPath(): string {
  const base = import.meta.env.BASE_URL ?? "/";
  return `${base}sw.js`;
}

/** 当前设备是否已订阅推送 */
export async function getPushStatus(): Promise<"on" | "off" | "unsupported"> {
  if (!isPushSupported()) return "unsupported";
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    if (!reg) return "off";
    const sub = await reg.pushManager.getSubscription();
    return sub ? "on" : "off";
  } catch {
    return "off";
  }
}

/** 开启推送：注册 Service Worker -> 请求权限 -> 订阅 -> 保存到数据库 */
export async function enablePush(): Promise<void> {
  if (!isPushSupported()) {
    throw new Error("当前浏览器不支持推送通知");
  }
  const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;
  if (!vapidKey) {
    throw new Error("缺少 VAPID 公钥配置，请检查环境变量 VITE_VAPID_PUBLIC_KEY");
  }
  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    throw new Error("通知权限被拒绝，请在浏览器设置中允许通知后重试");
  }
  const reg = await navigator.serviceWorker.register(swPath());
  await navigator.serviceWorker.ready;
  let sub;
  try {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (/permission denied|not allowed/i.test(msg)) {
      throw new Error("无法开启推送：可能是无痕模式或浏览器限制，请用普通浏览器（安卓 Chrome / iPhone Safari）重试");
    }
    throw new Error("订阅失败：" + msg);
  }
  const p256dh = sub.getKey("p256dh");
  const auth = sub.getKey("auth");
  if (!p256dh || !auth) {
    throw new Error("订阅失败，请重试");
  }
  const toB64 = (buf: ArrayBuffer | null) => {
    const bytes = new Uint8Array(buf as ArrayBuffer);
    let bin = "";
    for (const b of bytes) bin += String.fromCharCode(b);
    return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  };
  const {
    data: { user },
  } = await getSupabase().auth.getUser();
  const { error } = await getSupabase()
    .from("push_subscriptions")
    .upsert(
      {
        user_id: user?.id,
        endpoint: sub.endpoint,
        p256dh: toB64(p256dh),
        auth: toB64(auth),
      },
      { onConflict: "endpoint" },
    );
  if (error) throw new Error("保存订阅失败：" + error.message);
}

/** 关闭推送：取消订阅并删除数据库记录 */
export async function disablePush(): Promise<void> {
  if (!isPushSupported()) return;
  const reg = await navigator.serviceWorker.getRegistration();
  if (!reg) return;
  const sub = await reg.pushManager.getSubscription();
  if (sub) {
    await getSupabase().from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
    await sub.unsubscribe();
  }
}
