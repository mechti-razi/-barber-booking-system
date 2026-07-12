import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { BarberDashboardComponent } from './barber-dashboard/barber-dashboard.component';
import { BarberRevenueComponent } from './barber-revenue/barber-revenue.component';
import { BarberReservationsComponent } from './barber-reservations/barber-reservations.component';
import { BarberScheduleComponent } from './barber-schedule/barber-schedule.component';
import { BarberStaffComponent } from './barber-staff/barber-staff.component';
import { BarberServicesComponent } from './barber-services/barber-services.component';
import { BarberProfileComponent } from './barber-profile/barber-profile.component';
import { ShopStatisticsComponent } from './shop-statistics/shop-statistics.component';
import { OwnerGuard } from '../../core/guards/owner.guard';

const routes: Routes = [
  {
    path: '',
    component: BarberDashboardComponent,
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: BarberRevenueComponent },
      { path: 'reservations', component: BarberReservationsComponent },
      { path: 'schedule', component: BarberScheduleComponent },
      { path: 'staff', component: BarberStaffComponent, canActivate: [OwnerGuard] },
      { path: 'services', component: BarberServicesComponent, canActivate: [OwnerGuard] },
      { path: 'shop-stats', component: ShopStatisticsComponent, canActivate: [OwnerGuard] },
      { path: 'profile', component: BarberProfileComponent }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class BarberRoutingModule { }
