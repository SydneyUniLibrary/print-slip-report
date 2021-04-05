import { Location as LocationService } from '@angular/common'
import { EventEmitter, Injectable } from '@angular/core'
import { Router } from '@angular/router'
import {
  CloudAppRestService, HttpMethod, InitData, Request as CloudAppRestServiceRequest, RestErrorResponse,
} from '@exlibris/exl-cloudapp-angular-lib'
import { v4 as uuid4 } from 'uuid'
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
    return err instanceof InvalidParameterError
  }


  static isRestErrorResponse(err: PrintSlipReportError): err is RestErrorResponse {
    return 'status' in err
  }


  constructor(
    public error: PrintSlipReportError
  ) {}

}


export interface RequestedResource {
  resource_metadata: RequestedResourceResourceMetadata
  location: RequestedResourceLocation
  request: RequestedResourceRequest[]
}

export interface RequestedResourceCopy {
  link: string
  pid: string
  barcode: string
  base_status: { desc: string, value: string }
  alternative_call_number: string
  storage_location_id: string
}

export interface RequestedResourceLocation {
  holding_id: { link: string, value: string }
  library: { desc: string, value: string }
  call_number: string
  shelving_location: string
  copy: RequestedResourceCopy[]
}

export interface RequestedResourceRequest {
  link: string
  id: string
  request_type: string
  request_sub_type: { desc: string, value: string }
  destination: { desc: string, value: string }
  request_date: string
  request_time: string
  requester: { desc: string, value: string }
  comment: string
  printed: boolean
  reported: boolean
}

export interface RequestedResourceResourceMetadata {
  mms_id: { link: string, value: string }
  title: string
  author: string
  issn: string
  isbn: string
  publisher: string
  publication_place: string
  publication_year: string
}


@Injectable()
export class PrintSlipReportService {

  circDeskCode?: string
  complete = new EventEmitter<PrintSlipReportCompleteEvent>(true)
  error = new EventEmitter<PrintSlipReportErrorEvent>(true)
  includedColumnOptions?: ColumnOption[]
  initData?: InitData
  libraryCode?: string
  mainComponent?: MainComponent
  pageSize = 100
  popupWindow?: Window
  progressChange = new EventEmitter<number>(true)
  readonly target = uuid4()
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
    let pages: Page[] = [
      new Page(this.circDeskCode, this.libraryCode, 0, this.pageSize, this.restService)
    ]

    try {

      let totalRecordCount = await pages[0].fetchPage()
      this.progressChange.emit(0)   // Force the progress spinner animation to start at 0
      if (totalRecordCount > 0) {
        pages = this.setupPages(pages[0], totalRecordCount)
        let pagesIterator: Iterator<Page> = pages.values()

        type PendingPromiseValue = PageFetchValue | void
        let pendingPromises: Promise<PendingPromiseValue>[] = [ ]

        const addToPendingPromises = (additionalPendingPromises: Promise<PendingPromiseValue>[]) => {
          pendingPromises = pendingPromises.concat(
            additionalPendingPromises.map(p => {
              // Remove the promise from pendingPromises when it resolves
              let p2 = p.then(x => {
                let i = pendingPromises.indexOf(p2)
                pendingPromises.splice(i, 1)
                return x
              })
              return p2
            })
          )
        }

        addToPendingPromises([ pagesIterator.next().value.fetch() ])

        while (pendingPromises.length > 0) {
          let progress = pages.reduce<number>((acc, page) => acc + page.progress, 0) / pages.length
          this.progressChange.emit(progress)

          let ret = await Promise.race(pendingPromises)
          if (ret && 'additionalPendingPromises' in ret) {
            addToPendingPromises(ret.additionalPendingPromises)
            let n = pagesIterator.next()
            if (n.value) {
              addToPendingPromises([ n.value.fetch() ])
            }
          }
        }

      }

    } catch (err) {
      this.error.emit(new PrintSlipReportErrorEvent(err))
      throw err
    }

    let requestedResources = pages.reduce<RequestedResource[]>(
      (acc, v) => acc.concat(v.requests),
      []
    )
    this.progressChange.emit(100)   // Force the progress spinner animation to end at 100
    this.complete.emit(new PrintSlipReportCompleteEvent(requestedResources.length))
    return requestedResources
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


  private setupPages(page0: Page, totalRecordCount: number): Page[] {
    let numPages = Math.ceil(totalRecordCount / this.pageSize)
    let pages = new Array<Page>(numPages)
    pages[0] = page0
    for (let i = 1; i < numPages; i++) {
      pages[i] = new Page(this.circDeskCode, this.libraryCode, i, this.pageSize, this.restService)
    }
    return pages
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
    Object.setPrototypeOf(this, InvalidParameterError.prototype) // https://github.com/Microsoft/TypeScript/wiki/Breaking-Changes#extending-built-ins-like-error-array-and-map-may-no-longer-work
  }

}


interface RequestedResourcesResponse {
  requested_resource?: RequestedResource[]
  total_record_count?: number
}


type PageFetchValue = { additionalPendingPromises: Promise<void>[] }


class Page {

  readonly offset: number
  progress: number = 0  // Between 0 and 100 inclusive
  requests: RequestedResource[] = []

  constructor(
    private readonly circDeskCode: string,
    private readonly libraryCode: string,
    public readonly pageNumber: number,
    public readonly pageSize: number,
    private readonly restService: CloudAppRestService,
  ) {
    this.offset = this.pageNumber * this.pageSize
    console.log('Page constructor pageNumber', this)
  }


  /**
   * @returns Additional promises for the enrichment tasks.
   *          They settle when the enrichment tasks completes and progress has been made.
   */
  async fetch(): Promise<PageFetchValue> {
    await this.fetchPage()
    this.progress = 100
    return { additionalPendingPromises: [] }
  }


  /**
   * @returns The total number requests available across all the pages.
   */
  async fetchPage(): Promise<number> {
    // Skip this if the page was already pre-fetched.
    if (this.requests.length == 0) {
      try {
        let resp = await this.restService.call<RequestedResourcesResponse>(this.request).toPromise()
        this.requests = resp?.requested_resource ?? []
        return resp?.total_record_count ?? 0
      } catch (err) {
        throw InvalidParameterError.from(err) ?? err
      }
    }
  }


  get request(): CloudAppRestServiceRequest {
    return {
      url: '/task-lists/requested-resources',
      method: HttpMethod.GET,
      queryParams: this.queryParams,
    }
  }


  get queryParams(): { [param: string]: any } {
    return {
      library: this.libraryCode,
      circ_desk: this.circDeskCode,
      limit: this.pageSize,
      offset: this.offset
    }
  }

}
