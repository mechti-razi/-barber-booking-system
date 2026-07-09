import { Component, OnInit } from '@angular/core';
import { ThemeService } from './core/services/theme.service';
import { TranslateService } from './core/services/translate.service';
import { AuthService } from './core/services/auth.service';
import { PushNotificationService } from './core/services/push-notification.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  title = 'Barber Booking System';

  constructor(
    private themeService: ThemeService,
    private translateService: TranslateService,
    private authService: AuthService,
    private pushNotification: PushNotificationService
  ) {
    this.themeService.init();
    this.translateService.init().subscribe();
  }

  ngOnInit(): void {
    // Initialize push notifications whenever a user is logged in.
    // This covers both page reloads (user already stored) and fresh logins.
    this.authService.currentUser$.subscribe((user) => {
      if (user && this.pushNotification.isSupported) {
        // Only init if permission hasn't been denied
        if (this.pushNotification.permissionStatus !== 'denied') {
          this.pushNotification.init().catch(console.error);
        }
      }
    });
  }
}
