// Notification & Site Permissions Engine (notifications.ts)

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'security';
  timestamp: number;
  read?: boolean;
}

type NotificationListener = (notifications: AppNotification[]) => void;

let notificationQueue: AppNotification[] = [
  {
    id: 'init-1',
    title: 'Signal Room Vault Online',
    message: '1000x Hardened Anti-Screenshot & Linewize Bypass Engine is Active.',
    type: 'security',
    timestamp: Date.now(),
  },
];

const listeners: Set<NotificationListener> = new Set();

export function subscribeNotifications(listener: NotificationListener): () => void {
  listeners.add(listener);
  listener([...notificationQueue]);
  return () => listeners.delete(listener);
}

function notifyListeners() {
  const current = [...notificationQueue];
  listeners.forEach((fn) => fn(current));
}

export function addNotification(title: string, message: string, type: AppNotification['type'] = 'info') {
  const notif: AppNotification = {
    id: 'n_' + Math.random().toString(36).substring(2, 9),
    title,
    message,
    type,
    timestamp: Date.now(),
    read: false,
  };

  notificationQueue = [notif, ...notificationQueue.slice(0, 49)];
  notifyListeners();

  // Send system desktop Web Notification if permission granted
  if ('Notification' in window && Notification.permission === 'granted') {
    try {
      new Notification(title, {
        body: message,
        icon: '/vite.svg',
      });
    } catch (e) {
      console.warn('[System Notification Notice]', e);
    }
  }
}

export function clearNotifications() {
  notificationQueue = [];
  notifyListeners();
}

export async function requestBrowserNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    addNotification('Notifications Unsupported', 'Your browser environment does not support system notifications.', 'warning');
    return 'denied';
  }

  try {
    const res = await Notification.requestPermission();
    if (res === 'granted') {
      addNotification('Permissions Granted', 'Browser desktop notifications enabled for Signal Room Vault.', 'success');
    } else {
      addNotification('Permission Denied', 'Browser notifications were blocked.', 'warning');
    }
    return res;
  } catch (err) {
    console.warn('[Notification Permission Error]', err);
    return 'denied';
  }
}

export function notifyTeacherSurveillance(triggerSource: string = 'Active Tab Focus Shift') {
  const title = '⚠️ ChromeOS Monitor Alert: Teacher Viewing Detected!';
  const message = `Classroom proctor / teacher inspection flagged via ${triggerSource}. Blackout curtain and counter-measures deployed.`;
  addNotification(title, message, 'security');

  if ('Notification' in window && Notification.permission === 'granted') {
    try {
      new Notification(title, {
        body: message,
        icon: '/vite.svg',
        tag: 'teacher-surveillance-alert',
        requireInteraction: true,
      });
    } catch (e) {
      console.warn('[ChromeOS Alert Dispatch Error]', e);
    }
  }
}

export function triggerTestNotification() {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification('ChromeOS Stealth System Alert', {
      body: 'Verified: Native desktop notification channel is operational with zero-latency intercept.',
      icon: '/vite.svg',
    });
    addNotification('Test Alert Dispatched', 'Chrome desktop notification sent to operating system.', 'success');
  } else {
    requestBrowserNotificationPermission();
  }
}

export function checkSitePermissionsState() {
  return {
    notifications: 'Notification' in window ? Notification.permission : 'unsupported',
    microphone: 'mediaDevices' in navigator ? 'available' : 'unsupported',
    storage: 'indexedDB' in window ? 'available' : 'unsupported',
    serviceWorker: 'serviceWorker' in navigator ? 'available' : 'unsupported',
  };
}
