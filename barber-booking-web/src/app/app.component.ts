import { Component } from '@angular/core';
import { ThemeService } from './core/services/theme.service';
import { TranslateService } from './core/services/translate.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'Barber Booking System';

  constructor(
    private themeService: ThemeService,
    private translateService: TranslateService
  ) {
    this.themeService.init();
    this.translateService.init().subscribe();
  }
}
