import { EventEmitter, Injectable } from '@angular/core'
import { AppService } from '../app.service'
import { RequestedResource, RequestedResourcesService } from '../requested-resources'
import {
  PrintSlipReportCompleteEvent, PrintSlipReportErrorEvent, PrintSlipReportWindowService,
} from './window.service'



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
      )
      this.printSlipReportWindowService.complete.emit(new PrintSlipReportCompleteEvent(resources.length))
      return resources
    } catch (err) {
      this.printSlipReportWindowService.error.emit(new PrintSlipReportErrorEvent(err))
    }
  }


  get includedColumnOptions() {
    return this.appService.includedColumnOptions
  }

}
