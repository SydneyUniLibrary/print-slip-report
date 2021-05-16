import { CommonModule } from '@angular/common'
import { NgModule } from '@angular/core'
import { MaterialModule } from '@exlibris/exl-cloudapp-angular-lib'
import { AppModuleServicesService } from '../app-module-services.service'
import { AppService } from '../app.service'
import { RequestedResourcesService } from '../requested-resources'
import { SlipReportModule } from '../slip-report'
import { PrintSlipReportComponent } from './print-slip-report.component'
import { PrintSlipReportService } from './print-slip-report.service'
import { PrintSlipReportRoutingModule } from './routing.module'
import { PrintSlipReportWindowService } from './window.service'



@NgModule({
  declarations: [
    PrintSlipReportComponent,
  ],
  imports: [
    CommonModule,
    MaterialModule,
    PrintSlipReportRoutingModule,
    SlipReportModule,
  ],
  providers: [
    {
      provide: AppModuleServicesService,
      useFactory: () => AppModuleServicesService.getFromWindow(window),
    },
    {
      provide: AppService,
      useFactory: (a: AppModuleServicesService) => a.appService,
      deps: [ AppModuleServicesService ],
    },
    {
      provide: PrintSlipReportWindowService,
      useFactory: (a: AppModuleServicesService) => a.printSlipReportWindowService,
      deps: [ AppModuleServicesService ],
    },
    {
      provide: RequestedResourcesService,
      useFactory: (a: AppModuleServicesService) => a.requestedResourcesService,
      deps: [ AppModuleServicesService ],
    },
    PrintSlipReportService,
  ],
})
export class PrintSlipReportModule { }
