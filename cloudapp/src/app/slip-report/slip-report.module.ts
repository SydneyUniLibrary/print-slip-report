import { CommonModule } from '@angular/common'
import { NgModule } from '@angular/core'
import { MaterialModule } from '@exlibris/exl-cloudapp-angular-lib'
import { SlipReportProgressComponent } from './progress.component'



@NgModule({
  declarations: [
    SlipReportProgressComponent,
  ],
  imports: [
    CommonModule,
    MaterialModule,
  ],
  exports: [
    SlipReportProgressComponent,
  ]
})
export class SlipReportModule { }
