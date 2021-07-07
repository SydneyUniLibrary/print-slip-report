import { EventEmitter, Injectable } from '@angular/core'
import { AppService } from '../app.service'
import {
  ColumnDefinition, COLUMNS_DEFINITIONS, RequestedResource, RequestedResourcesService,
} from '../requested-resources'
import { SlipReportErrorEvent } from '../slip-report'
import { PrintSlipReportCompleteEvent, PrintSlipReportWindowService } from './window.service'



@Injectable()
export class PrintSlipReportService {

  pageSize = 100
  progressChange = new EventEmitter<number>(true)


  constructor(
    private appService: AppService,
    private printSlipReportWindowService: PrintSlipReportWindowService,
    private requestedResourcesService: RequestedResourcesService,
  ) { }


  async findRequestedResources(): Promise<RequestedResource[]> {
    try {
      let resources = await this.requestedResourcesService.findRequestedResources(
        this.pageSize,
        this.progressChange,
        ColumnDefinition.combinedEnrichmentOptions(
          this.includedColumnOptions.map(opt => COLUMNS_DEFINITIONS.get(opt.code))
        ),
      )
      this.printSlipReportWindowService.complete.emit(new PrintSlipReportCompleteEvent(resources.length))
      return resources
    } catch (err) {
      this.printSlipReportWindowService.error.emit(new SlipReportErrorEvent(err))
    }
  }


  get includedColumnOptions() {
    return this.appService.includedColumnOptions
  }

}
