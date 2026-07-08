import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { AppointmentListComponent } from './appointment-list/appointment-list.component';
import { AppointmentCreateComponent } from './appointment-create/appointment-create.component';
import { SharedModule } from '../../shared/shared.module';

@NgModule({
  declarations: [
    AppointmentListComponent,
    AppointmentCreateComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule.forChild([
      { path: '', component: AppointmentListComponent },
      { path: 'new', component: AppointmentCreateComponent },
      { path: ':id', component: AppointmentListComponent }
    ]),
    SharedModule
  ]
})
export class AppointmentsModule { }
