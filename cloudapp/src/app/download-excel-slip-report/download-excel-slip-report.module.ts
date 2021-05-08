import { CommonModule } from '@angular/common'
import { NgModule } from '@angular/core'
import { MaterialModule } from '@exlibris/exl-cloudapp-angular-lib'
import { SlipReportModule } from '../slip-report'
import { DownloadExcelSlipReportComponent } from './download-excel-slip-report.component'
import { DownloadExcelSlipReportRoutingModule } from './routing.module'



@NgModule({
  declarations: [
    DownloadExcelSlipReportComponent,
  ],
  imports: [
    CommonModule,
    MaterialModule,
    SlipReportModule,
    DownloadExcelSlipReportRoutingModule,
  ]
})
export class DownloadExcelSlipReportModule { }
