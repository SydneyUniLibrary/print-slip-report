import { CommonModule } from '@angular/common'
import { NgModule } from '@angular/core'
import { FormsModule, ReactiveFormsModule } from '@angular/forms'
import { MaterialModule } from '@exlibris/exl-cloudapp-angular-lib'
import { ColumnOptionsModule } from '../column-options'
import { CircDeskCodeDefaultsComponent } from './circ-desk-code-defaults.component'
import { ConfigComponent } from './config.component'
import { PrintSlipReportConfigRoutingModule } from './routing.module'



@NgModule({
  declarations: [
    CircDeskCodeDefaultsComponent,
    ConfigComponent,
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MaterialModule,
    PrintSlipReportConfigRoutingModule,
    ColumnOptionsModule,
  ],
})
export class PrintSlipReportConfigModule { }
