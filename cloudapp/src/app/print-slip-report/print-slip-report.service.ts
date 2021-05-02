import { Location as LocationService } from '@angular/common'
import { EventEmitter, Injectable } from '@angular/core'
import { Router } from '@angular/router'
import { InitData, RestErrorResponse } from '@exlibris/exl-cloudapp-angular-lib'
import { v4 as uuid4 } from 'uuid'
import { AppService } from '../app.service'
import { MainComponent } from '../main/main.component'
import { InvalidParameterError, RequestedResource, RequestedResourcesService } from '../requested-resources'



export class PrintSlipReportCompleteEvent {
  constructor(
    public numRequestedResources: number
  ) { }
}


export type PrintSlipReportError = Error | InvalidParameterError | RestErrorResponse

export class PrintSlipReportErrorEvent {

  static isInvalidParameterError(err: PrintSlipReportError): err is InvalidParameterError {
    return err instanceof InvalidParameterError
  }


  static isRestErrorResponse(err: PrintSlipReportError): err is RestErrorResponse {
    return 'status' in err
  }


  constructor(
    public error: PrintSlipReportError
  ) { }

}


@Injectable({
  providedIn: 'root'
})
export class PrintSlipReportService {

  complete = new EventEmitter<PrintSlipReportCompleteEvent>(true)
  error = new EventEmitter<PrintSlipReportErrorEvent>(true)
  initData?: InitData
  mainComponent?: MainComponent
  pageSize = 100
  popupWindow?: Window
  progressChange = new EventEmitter<number>(true)
  readonly target = uuid4()
  readonly url: string


  constructor(
    location: LocationService,
    private appService: AppService,
    private requestedResourcesService: RequestedResourcesService,
    router: Router,
  ) {
    // This has only been tested with the hash location strategy
    let routeUrl = (
      location.prepareExternalUrl(
        router.serializeUrl(
          router.createUrlTree([ 'print-slip-report' ])
        )
      )
    )
    this.url = new URL(routeUrl, window.location.href).toString()
  }


  close() {
    if (this.popupWindow) {
      this.popupWindow.close()
      this.popupWindow = undefined
    }
  }


  async findRequestedResources(): Promise<RequestedResource[]> {
    try {
      let resources = await this.requestedResourcesService.findRequestedResources(
        this.pageSize,
        this.progressChange,
      )
      this.complete.emit(new PrintSlipReportCompleteEvent(resources.length))
      return resources
    } catch (err) {
      this.error.emit(new PrintSlipReportErrorEvent(err))
    }
  }


  get includedColumnOptions() {
    return this.appService.includedColumnOptions
  }


  open(): boolean {
    this.popupWindow = window.open(this.url, this.target, 'status=0')
    if (this.popupWindow) {
      Object.defineProperties(this.popupWindow, {
        'printSlipReportService': { enumerable: true, value: this }
      })
    }
    return !!this.popupWindow
  }

}
