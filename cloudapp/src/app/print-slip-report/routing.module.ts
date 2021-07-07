import { NgModule } from '@angular/core'
import { RouterModule, Routes } from '@angular/router'
import { PrintSlipReportComponent } from './print-slip-report.component'



const routes: Routes = [
  { path: '', component: PrintSlipReportComponent },
]


@NgModule({
  imports: [ RouterModule.forChild(routes) ],
  exports: [ RouterModule ]
})
export class PrintSlipReportRoutingModule { }
