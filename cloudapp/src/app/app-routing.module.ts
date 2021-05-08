import { NgModule } from '@angular/core'
import { RouterModule, Routes } from '@angular/router'
import { ConfigComponent } from './config/config.component'
import { DownloadExcelSlipReportComponent } from './download-excel-slip-report/download-excel-slip-report.component'
import { MainComponent } from './main/main.component'



const routes: Routes = [
  { path: '', component: MainComponent },
  { path: 'config', component: ConfigComponent },
  { path: 'download-excel-slip-report', loadChildren: _loadDownloadExcelSlipReport },
  { path: 'print-slip-report', loadChildren: _loadPrintSlipReport },
]


@NgModule({
  imports: [ RouterModule.forRoot(routes, { useHash: true }) ],
  exports: [ RouterModule ],
})
export class AppRoutingModule { }


async function _loadDownloadExcelSlipReport() {
  let { DownloadExcelSlipReportModule } = await import('./download-excel-slip-report/download-excel-slip-report.module')
  return DownloadExcelSlipReportModule
}


async function _loadPrintSlipReport() {
  let { PrintSlipReportModule } = await import('./print-slip-report/print-slip-report.module')
  return PrintSlipReportModule
}
