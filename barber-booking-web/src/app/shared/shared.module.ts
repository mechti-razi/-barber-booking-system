import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BottomNavComponent } from './components/bottom-nav/bottom-nav.component';
import { TranslatePipe } from './pipes/translate.pipe';

@NgModule({
  declarations: [
    BottomNavComponent,
    TranslatePipe
  ],
  imports: [
    CommonModule
  ],
  exports: [
    BottomNavComponent,
    TranslatePipe
  ]
})
export class SharedModule { }
