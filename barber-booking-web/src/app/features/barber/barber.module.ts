import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { BarberRoutingModule } from './barber-routing.module';
import { BarberDashboardComponent } from './barber-dashboard/barber-dashboard.component';
import { BarberRevenueComponent } from './barber-revenue/barber-revenue.component';
import { BarberReservationsComponent } from './barber-reservations/barber-reservations.component';
import { BarberScheduleComponent } from './barber-schedule/barber-schedule.component';
import { BarberStaffComponent } from './barber-staff/barber-staff.component';
import { BarberServicesComponent } from './barber-services/barber-services.component';
import { BarberProfileComponent } from './barber-profile/barber-profile.component';
import { SharedModule } from '../../shared/shared.module';

@NgModule({
  declarations: [
    BarberDashboardComponent,
    BarberRevenueComponent,
    BarberReservationsComponent,
    BarberScheduleComponent,
    BarberStaffComponent,
    BarberServicesComponent,
    BarberProfileComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    HttpClientModule,
    BarberRoutingModule,
    SharedModule
  ]
})
export class BarberModule { }
