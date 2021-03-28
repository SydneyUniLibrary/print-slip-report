import { Location as LocationService } from '@angular/common'
import { EventEmitter, Injectable } from '@angular/core'
import { Router } from '@angular/router'
import { CloudAppRestService, HttpMethod, InitData, RestErrorResponse } from '@exlibris/exl-cloudapp-angular-lib'
import { ColumnOption } from '../column-options'
import { MainComponent } from '../main/main.component'



export class PrintSlipReportCompleteEvent {
  constructor(
    public numRequestedResources: number
  ) {}
}


export type PrintSlipReportError = Error | InvalidParameterError | RestErrorResponse

export class PrintSlipReportErrorEvent {

  static isInvalidParameterError(err: PrintSlipReportError): err is InvalidParameterError {
    return 'parameter' in err
  }


  static isRestErrorResponse(err: PrintSlipReportError): err is RestErrorResponse {
    return 'status' in err
  }


  constructor(
    public error: PrintSlipReportError
  ) {}

}


export interface RequestedResource { }


@Injectable()
export class PrintSlipReportService {

  includedColumnOptions?: ColumnOption[]
  circDeskCode?: string
  initData?: InitData
  libraryCode?: string
  mainComponent?: MainComponent
  complete = new EventEmitter<PrintSlipReportCompleteEvent>(true)
  error = new EventEmitter<PrintSlipReportErrorEvent>(true)
  popupWindow?: Window
  readonly target = `print-slip-report-${nonce()}`
  readonly url: string


  constructor(
    private location: LocationService,
    private restService: CloudAppRestService,
    private router: Router,
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
    let resp: { requested_resource?: any }
    try {
      resp = await (
        this.restService.call({
          url: '/task-lists/requested-resources',
          method: HttpMethod.GET,
          queryParams: {
            library: this.libraryCode,
            circ_desk: this.circDeskCode,
            limit: 100, // TODO: Handle more than 100 requested resources
          },
        }).toPromise()
      )
    } catch (err) {
      let invalidParameterError = InvalidParameterError.from(err)
      throw invalidParameterError ?? err
    }
    return resp?.requested_resource ?? []
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


export class InvalidParameterError extends Error {

  static from(restErrorResponse: RestErrorResponse): InvalidParameterError | null {
    const error = restErrorResponse?.error?.errorList?.error?.filter(e => e?.errorCode == '40166410')
    if (error) {
      const match = error[0]?.errorMessage?.match(/The parameter (\w+) is invalid\..*Valid options are: \[([^\]]*)]/)
      if (match) {
        let parameter = match[1]
        let validOptions = match[2].split(',')
        return new InvalidParameterError(parameter, validOptions)
      }
    }
    return null
  }


  constructor(
    public parameter: string,
    public validOptions: string[],
  ) {
    super(`The parameter ${ parameter } is invalid`)
  }

}


function nonce() {
  let data = window.crypto.getRandomValues(new Uint8Array(16));
  return window.btoa(String.fromCharCode(...data))
}
