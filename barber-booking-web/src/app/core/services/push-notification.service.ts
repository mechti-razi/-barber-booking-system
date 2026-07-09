import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, from, of } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class PushNotificationService {
  private apiUrl = environment.apiUrl;
  private swRegistration: ServiceWorkerRegistration | null = null;

  constructor(private http: HttpClient) {}

  /** True if the browser supports Web Push */
  get isSupported(): boolean {
    return (
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window
    );
  }

  /** Current permission status */
  get permissionStatus(): NotificationPermission {
    return 'Notification' in window ? Notification.permission : 'denied';
  }

  /**
   * Full flow:
   * 1. Register the service worker
   * 2. Ask for notification permission
   * 3. Subscribe to push via VAPID public key from the API
   * 4. Send the subscription to our backend
   */
  async init(): Promise<boolean> {
    if (!this.isSupported) {
      console.warn('[PushNotification] Web Push not supported in this browser.');
      return false;
    }

    try {
      // Register the push service worker (separate from any PWA SW)
      this.swRegistration = await navigator.serviceWorker.register('/push-sw.js', {
        scope: '/',
      });

      // Ask permission only if not already granted or denied
      if (this.permissionStatus === 'default') {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
          console.info('[PushNotification] Permission denied by user.');
          return false;
        }
      } else if (this.permissionStatus === 'denied') {
        return false;
      }

      // Subscribe
      await this.subscribe();
      return true;
    } catch (error) {
      console.error('[PushNotification] init error:', error);
      return false;
    }
  }

  /** Subscribe to push and save endpoint to the backend */
  async subscribe(): Promise<void> {
    if (!this.swRegistration) return;

    const vapidPublicKey = await this.fetchVapidPublicKey();
    if (!vapidPublicKey) return;

    const applicationServerKey = this.urlBase64ToUint8Array(vapidPublicKey);

    let subscription = await this.swRegistration.pushManager.getSubscription();

    if (!subscription) {
      subscription = await this.swRegistration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey,
      });
    }

    await this.saveSubscriptionToServer(subscription).toPromise();
  }

  /** Unsubscribe and notify the backend */
  async unsubscribe(): Promise<void> {
    if (!this.swRegistration) return;

    const subscription = await this.swRegistration.pushManager.getSubscription();
    if (!subscription) return;

    await this.removeSubscriptionFromServer(subscription).toPromise();
    await subscription.unsubscribe();
  }

  // ── Private helpers ─────────────────────────────────────────────────────────

  private async fetchVapidPublicKey(): Promise<string | null> {
    try {
      const res: any = await this.http
        .get(`${this.apiUrl}/push/vapid-public-key`)
        .toPromise();
      return res?.vapid_public_key ?? null;
    } catch (e) {
      console.error('[PushNotification] Failed to fetch VAPID key', e);
      return null;
    }
  }

  private saveSubscriptionToServer(sub: PushSubscription): Observable<any> {
    const keys = (sub as any).toJSON().keys || {};
    return this.http
      .post(`${this.apiUrl}/push/subscribe`, {
        endpoint: sub.endpoint,
        public_key: keys.p256dh || null,
        auth_token: keys.auth || null,
        content_encoding: 'aesgcm',
      })
      .pipe(catchError((err) => { console.error('[PushNotification] subscribe error', err); return of(null); }));
  }

  private removeSubscriptionFromServer(sub: PushSubscription): Observable<any> {
    return this.http
      .post(`${this.apiUrl}/push/unsubscribe`, { endpoint: sub.endpoint })
      .pipe(catchError((err) => { console.error('[PushNotification] unsubscribe error', err); return of(null); }));
  }

  /**
   * Converts a URL-safe base64 VAPID public key to the Uint8Array
   * format expected by PushManager.subscribe().
   */
  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = atob(base64);
    return new Uint8Array([...rawData].map((char) => char.charCodeAt(0)));
  }
}
