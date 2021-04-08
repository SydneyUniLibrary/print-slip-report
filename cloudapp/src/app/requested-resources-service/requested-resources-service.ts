
import { EventEmitter, Injectable } from '@angular/core'
import {
  CloudAppRestService,
  HttpMethod,
  Request as CloudAppRestServiceRequest,
  RestErrorResponse,
} from '@exlibris/exl-cloudapp-angular-lib'
import { PrintSlipReportError } from '../print-slip-report/print-slip-report.service'

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

export type CompleteFunction = (count: number) => void
export type ErrorFunction = (error: PrintSlipReportError) => void

@Injectable({
  providedIn: 'root'
})
export class RequestedResourcesService {

  constructor(
    private restService: CloudAppRestService,
  ) { }

  async findRequestedResources(
    circDeskCode: string,
    libraryCode: string,
    pageSize: number,
    progressChange: EventEmitter<number>,
    completeFn: CompleteFunction,
    errorFn: ErrorFunction,
  ): Promise<RequestedResource[]> {

    let pages: Page[] = [
      new Page(circDeskCode, libraryCode, 0, pageSize, this.restService)
    ]

    try {

      let totalRecordCount = await pages[0].fetchPage()
      if (progressChange) {
        progressChange.emit(0)   // Force the progress spinner animation to start at 0
      }
      if (totalRecordCount > 0) {
        pages = this.setupPages(circDeskCode, libraryCode, pageSize, pages[0], totalRecordCount)
        let pagesIterator: Iterator<Page> = pages.values()

        type PendingPromiseValue = PageFetchValue | void
        let pendingPromises: Promise<PendingPromiseValue>[] = []

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

        addToPendingPromises([pagesIterator.next().value.fetch()])

        while (pendingPromises.length > 0) {
          let progress = pages.reduce<number>((acc, page) => acc + page.progress, 0) / pages.length
          if (progressChange) {
            progressChange.emit(progress)
          }

          let ret = await Promise.race(pendingPromises)
          if (ret && 'additionalPendingPromises' in ret) {
            addToPendingPromises(ret.additionalPendingPromises)
            let n = pagesIterator.next()
            if (n.value) {
              addToPendingPromises([n.value.fetch()])
            }
          }
        }

      }

    } catch (err) {
      errorFn(err)
      throw err
    }

    let requestedResources = pages.reduce<RequestedResource[]>(
      (acc, v) => acc.concat(v.requests),
      []
    )
    if (progressChange) {
      progressChange.emit(100)   // Force the progress spinner animation to end at 100
    }
    completeFn(requestedResources.length)
    return requestedResources
  }

  private setupPages(circDeskCode: string, libraryCode: string, pageSize: number, page0: Page, totalRecordCount: number): Page[] {
    let numPages = Math.ceil(totalRecordCount / pageSize)
    let pages = new Array<Page>(numPages)
    pages[0] = page0
    for (let i = 1; i < numPages; i++) {
      pages[i] = new Page(circDeskCode, libraryCode, i, pageSize, this.restService)
    }
    return pages
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
    super(`The parameter ${parameter} is invalid`)
    Object.setPrototypeOf(this, InvalidParameterError.prototype) // https://github.com/Microsoft/TypeScript/wiki/Breaking-Changes#extending-built-ins-like-error-array-and-map-may-no-longer-work
  }
}