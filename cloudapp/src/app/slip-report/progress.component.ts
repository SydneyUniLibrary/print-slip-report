import { Component, Input } from '@angular/core'
import { AppService } from '../app.service'



type SlipReportProgressOrientation = 'horizontal' | 'vertical'

@Component({
  selector: 'slip-report-progress',
  templateUrl: './progress.component.html',
  styleUrls: [ './progress.component.scss' ],
})
export class SlipReportProgressComponent {

  @Input() orientation: SlipReportProgressOrientation
  @Input() progress: number | undefined


  constructor(
    private appService: AppService
  ) { }


  get defaultCircDeskCode(): string {
    return this.appService.defaultCircDeskCode
  }


  get circDeskCode(): string {
    return this.appService.circDeskCode
  }


  get libraryCode(): string {
    return this.appService.libraryCode
  }

}
