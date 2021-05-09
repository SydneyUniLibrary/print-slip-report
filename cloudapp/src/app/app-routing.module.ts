import { NgModule } from '@angular/core'
import { RouterModule, Routes } from '@angular/router'
import { MainComponent } from './main/main.component'



const routes: Routes = [
  {
    path: '',
    component: MainComponent
  },
  {
    path: 'config',
    loadChildren: () => import('./config/config.module').then(m => m.PrintSlipReportConfigModule),
  },
  {
    path: 'download-excel-slip-report',
    loadChildren: () =>  import('./download-excel-slip-report/download-excel-slip-report.module').then(m => m.DownloadExcelSlipReportModule)
  },
  {
    path: 'print-slip-report',
    loadChildren: () => import('./print-slip-report/print-slip-report.module').then(m => m.PrintSlipReportModule)
  },
]


@NgModule({
  imports: [ RouterModule.forRoot(routes, { useHash: true }) ],
  exports: [ RouterModule ],
})
export class AppRoutingModule { }
