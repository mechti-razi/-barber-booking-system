import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ShopListComponent } from './shop-list/shop-list.component';
import { ShopDetailComponent } from './shop-detail/shop-detail.component';
import { SharedModule } from '../../shared/shared.module';

@NgModule({
  declarations: [
    ShopListComponent,
    ShopDetailComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule.forChild([
      { path: '', component: ShopListComponent },
      { path: ':id', component: ShopDetailComponent }
    ]),
    SharedModule
  ]
})
export class ShopsModule { }
