import { Component, Input } from '@angular/core'



type SlipReportProgressOrientation = 'horizontal' | 'vertical'

@Component({
  selector: 'slip-report-progress',
  templateUrl: './progress.component.html',
  styleUrls: [ './progress.component.scss' ],
})
export class SlipReportProgressComponent {

  @Input() circDeskCode: string
  @Input() libraryCode: string
  @Input() orientation: SlipReportProgressOrientation
  @Input() progress: number | undefined

}
