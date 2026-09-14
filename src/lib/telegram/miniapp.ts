// Клиентская обёртка над Telegram WebApp (telegram-web-app.js подключается на страницах Mini App)

type TgWebApp = {
  initData: string;
  initDataUnsafe?: { user?: { first_name?: string; last_name?: string } };
  ready: () => void;
  expand: () => void;
  close: () => void;
  setHeaderColor?: (color: string) => void;
  setBackgroundColor?: (color: string) => void;
  setBottomBarColor?: (color: string) => void;
  disableVerticalSwipes?: () => void;
  showConfirm?: (message: string, callback: (ok: boolean) => void) => void;
  showAlert?: (message: string) => void;
  HapticFeedback?: { notificationOccurred: (type: "error" | "success" | "warning") => void; selectionChanged: () => void };
};

export const tg = () =>
  typeof window !== "undefined" ? (window as unknown as { Telegram?: { WebApp?: TgWebApp } }).Telegram?.WebApp : undefined;

const inTelegram = () => !!tg()?.initData;

/** Открыто ли в Telegram; окно разворачивается и красится под тёмную тему сайта */
export function setupTelegramApp() {
  const app = tg();
  if (!app?.initData) return false;
  app.ready();
  app.expand();
  // методы новых версий Telegram: в старых клиентах их нет или они бросают исключение
  try {
    app.setHeaderColor?.("#0a0a0c");
    app.setBackgroundColor?.("#0a0a0c");
    app.setBottomBarColor?.("#111115");
    app.disableVerticalSwipes?.();
  } catch {}
  return true;
}

export function haptic(type: "success" | "error" | "selection") {
  try {
    const h = tg()?.HapticFeedback;
    if (type === "selection") h?.selectionChanged();
    else h?.notificationOccurred(type);
  } catch {}
}

/** Нативный диалог Telegram, вне Telegram — браузерный */
export const confirmTg = (message: string) =>
  new Promise<boolean>((resolve) => {
    try {
      if (inTelegram() && tg()?.showConfirm) return tg()!.showConfirm!(message, resolve);
    } catch {}
    resolve(window.confirm(message));
  });

export function alertTg(message: string) {
  try {
    if (inTelegram() && tg()?.showAlert) return tg()!.showAlert!(message);
  } catch {}
  window.alert(message);
}
