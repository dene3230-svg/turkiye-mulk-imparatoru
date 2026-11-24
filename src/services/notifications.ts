import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';

let notificationCounter = 100;

export async function requestNotificationPermission(): Promise<'granted' | 'denied' | 'unsupported'> {
  try {
    if (Capacitor.isNativePlatform()) {
      const status = await LocalNotifications.checkPermissions();
      if (status.display === 'granted') {
        return 'granted';
      }
      const req = await LocalNotifications.requestPermissions();
      return req.display === 'granted' ? 'granted' : 'denied';
    }

    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'granted') return 'granted';
      if (Notification.permission === 'denied') return 'denied';
      // Avoid blocking headless browsers if requestPermission hangs
      const result = await Promise.race([
        Notification.requestPermission(),
        new Promise<NotificationPermission>((resolve) => setTimeout(() => resolve('default'), 1200)),
      ]);
      return result === 'granted' ? 'granted' : 'denied';
    }
  } catch {
    // Safe fallback when plugin or web Notification API is unavailable
  }

  return 'unsupported';
}

export async function sendDeviceNotification(
  title: string,
  body: string,
  enabled: boolean
): Promise<void> {
  if (!enabled) return;

  try {
    if (Capacitor.isNativePlatform()) {
      const perms = await LocalNotifications.checkPermissions();
      if (perms.display !== 'granted') return;
      notificationCounter += 1;
      await LocalNotifications.schedule({
        notifications: [
          {
            id: notificationCounter,
            title,
            body,
            schedule: { at: new Date(Date.now() + 250) },
            smallIcon: 'ic_stat_icon_config_sample',
          },
        ],
      });
      return;
    }

    if (
      typeof window !== 'undefined' &&
      'Notification' in window &&
      Notification.permission === 'granted'
    ) {
      new Notification(title, {
        body,
        icon: './icon.png',
      });
    }
  } catch {
    // Gracefully ignore notification errors in sandboxed iframes
  }
}
