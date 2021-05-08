import { NgModule } from '@angular/core'
import { RouterModule, Routes } from '@angular/router'
import { DownloadExcelSlipReportComponent } from './download-excel-slip-report.component'



const routes: Routes = [
  { path: '', component: DownloadExcelSlipReportComponent },
]


@NgModule({
  imports: [ RouterModule.forChild(routes) ],
  exports: [ RouterModule ]
})
export class DownloadExcelSlipReportRoutingModule { }
