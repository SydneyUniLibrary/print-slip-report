import { AfterViewInit, Component, NgZone, OnDestroy } from '@angular/core'
import { Router } from '@angular/router'
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
      await this.reportService.generateExcel()
      // Delay slightly so that the user perceives the progress spinner showing 100%
      await new Promise(resolve => setTimeout(resolve, 500))
      await this.appService.saveLastUsed()
      // TODO: Surface a success msg in the main component
    } catch (err) {
      console.error(err)
      // TODO: Surface the alert in the main component
      // let msg = err.message || "See the console in your browser's developer tools for more information."
      // this.alert.error(`Something went wrong trying to find the requests. ${ msg }`)
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
