import { AfterViewInit, Component, NgZone, OnDestroy } from '@angular/core'
import { Router } from '@angular/router'
import { AlertService } from '@exlibris/exl-cloudapp-angular-lib'
import { Subscription } from 'rxjs'
import { AppService } from '../app.service'
import { DownloadExcelSlipReportService } from './download-excel-slip-report.service'



@Component({
  selector: 'download-excel-slip-report',
  templateUrl: './download-excel-slip-report.component.html',
  styleUrls: [ './download-excel-slip-report.component.scss' ],
})
export class DownloadExcelSlipReportComponent implements AfterViewInit, OnDestroy {

  progress?: number
  progressChangeSub?: Subscription


  constructor(
    private alert: AlertService,
    private appService: AppService,
    private reportService: DownloadExcelSlipReportService,
    private router: Router,
    private zone: NgZone,
  ) { }


  async ngAfterViewInit(): Promise<void> {
    this.progressChangeSub = this.reportService.progressChange.subscribe(
      progress => {
        this.zone.run(() => {
          this.progress = progress || 0
        })
      }
    )
    try {
      let downloadFilename = await this.reportService.generateExcel()
      // Delay slightly so that the user perceives the progress spinner showing 100%
      await new Promise(resolve => setTimeout(resolve, 500))
      await this.appService.saveLastUsed()
      if (downloadFilename) {
        this.alert.success(
          `Downloaded the requested resources as ${ downloadFilename }`,
          { keepAfterRouteChange: true }
        )
      } else {
        this.alert.info(
          'There are no requested resources to download',
          { keepAfterRouteChange: true }
        )
      }
    } catch (error) {
      this.appService.lastSlipReportError = error
    } finally {
      await this.router.navigateByUrl('/')
    }
  }


  ngOnDestroy() {
    if (this.progressChangeSub) {
      this.progressChangeSub.unsubscribe()
    }
  }

}
