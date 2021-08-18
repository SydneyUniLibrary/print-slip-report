import { EventEmitter, Injectable } from '@angular/core'
import {
  CloudAppRestService, HttpMethod, Request as CloudAppRestServiceRequest, RestErrorResponse,
} from '@exlibris/exl-cloudapp-angular-lib'
import { AppService } from '../app.service'
import { EnrichmentOptions } from './column-definitions'
import { ItemEnrichmentService } from './item-enrichment.service'
import { LocationEnrichmentService } from './location-enrichment-service'
import { RequestedResource } from './requested-resources'
import { RequestEnrichmentService } from './request-enrichment-service'
import { UserEnrichmentService } from './user-enrichment-service'



@Injectable({
  providedIn: 'root'
})
export class RequestedResourcesService {

  constructor(
    private appService: AppService,
    private restService: CloudAppRestService,
    private itemEnrichmentService: ItemEnrichmentService,
    private locationEnrichmentService: LocationEnrichmentService,
    private requestEnrichmentService: RequestEnrichmentService,
    private userEnrichmentService: UserEnrichmentService,
  ) { }


  private constructPage(
    pageNumber: number,
    pageSize: number,
    enrichmentOptions: EnrichmentOptions
  ): Page {
    return new Page(
      pageNumber,
      pageSize,
      enrichmentOptions,
      this.appService,
      this.restService,
      this.itemEnrichmentService,
      this.locationEnrichmentService,
      this.requestEnrichmentService,
      this.userEnrichmentService,
    )
  }


  async findRequestedResources(
    pageSize: number,
    progressChange: EventEmitter<number>,
    enrichmentOptions: EnrichmentOptions,
  ): Promise<RequestedResource[]> {

    let pages: Page[] = [ this.constructPage(0, pageSize, enrichmentOptions) ]

    let totalRecordCount = await pages[0].fetchPage()
    if (progressChange) {
      progressChange.emit(0)   // Force the progress spinner animation to start at 0
    }
    if (totalRecordCount > 0) {

      pages = this.setupPages(pageSize, pages[0], totalRecordCount, enrichmentOptions)
      let pagesIterator: IterableIterator<Page> = pages.values()

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

      addToPendingPromises([ (pagesIterator.next().value as Page).fetch() ])

      while (pendingPromises.length > 0) {
        let progress = pages.reduce<number>((acc, page) => acc + page.progress, 0) / pages.length
        if (progressChange) {
          progressChange.emit(progress)
        }

        let ret = await Promise.race(pendingPromises)
        if (ret && ret?.additionalPendingPromises) {
          addToPendingPromises(ret.additionalPendingPromises)
          let n = pagesIterator.next()
          if (!n.done) {
            addToPendingPromises([ (n.value as Page).fetch() ])
          }
        }
      }

    }

    let requestedResources = pages.reduce<RequestedResource[]>(
      (acc, v) => acc.concat(v.requests),
      []
    )
    if (progressChange) {
      progressChange.emit(100)   // Force the progress spinner animation to end at 100
    }
    return requestedResources
  }


  private setupPages(
    pageSize: number,
    page0: Page,
    totalRecordCount: number,
    enrichmentOptions: EnrichmentOptions
  ): Page[] {
    let numPages = Math.ceil(totalRecordCount / pageSize)
    let pages = new Array<Page>(numPages)
    pages[0] = page0
    for (let i = 1; i < numPages; i++) {
      pages[i] = this.constructPage(i, pageSize, enrichmentOptions)
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

  private pendingPromises: PageFetchValue['additionalPendingPromises'] = []
  private totalPromises?: number
  readonly offset: number
  requests: RequestedResource[] = []


  constructor(
    public readonly pageNumber: number,
    public readonly pageSize: number,
    public readonly enrichmentOptions: EnrichmentOptions,
    private readonly appService: AppService,
    private readonly restService: CloudAppRestService,
    private readonly itemEnrichmentService: ItemEnrichmentService,
    private readonly locationEnrichmentService: LocationEnrichmentService,
    private readonly requestEnrichmentService: RequestEnrichmentService,
    private readonly userEnrichmentService: UserEnrichmentService,
  ) {
    this.offset = this.pageNumber * this.pageSize
  }


  private addToPendingPromises(additionalPendingPromises: Promise<void>[] | undefined) {
    if (additionalPendingPromises?.length) {
      this.pendingPromises = this.pendingPromises.concat(
        additionalPendingPromises.map(p => {
          // Remove the promise from pendingPromises when it resolves
          let p2 = p.then(x => {
            let i = this.pendingPromises.indexOf(p2)
            this.pendingPromises.splice(i, 1)
            return x
          })
          return p2
        })
      )
      this.totalPromises += additionalPendingPromises.length
    }
  }


  /**
   * @returns Additional promises for the enrichment tasks.
   *          They settle when the enrichment tasks completes and progress has been made.
   */
  async fetch(): Promise<PageFetchValue> {
    await this.fetchPage()
    this.totalPromises = 0
    if (this.enrichmentOptions?.withItemEnrichment) {
      for (let r of this.requests) {
        this.addToPendingPromises(this.itemEnrichmentService.enrich(r))
      }
    }
    if (this.enrichmentOptions?.withRequestEnrichment) {
      for (let r of this.requests) {
        this.addToPendingPromises(this.requestEnrichmentService.enrich(r))
      }
    }
    if (this.enrichmentOptions?.withLocationEnrichment) {
      for (let r of this.requests) {
        this.addToPendingPromises(this.locationEnrichmentService.enrich(r))
      }
    }
    if (this.enrichmentOptions?.withUserEnrichment) {
      for (let r of this.requests) {
        this.addToPendingPromises(this.userEnrichmentService.enrich(r))
      }
    }
    return { additionalPendingPromises: this.pendingPromises }
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


  get progress(): number {
    if (this?.totalPromises) {
      return (
        100
        * (this.totalPromises - this.pendingPromises.length + 1)
        / (this.totalPromises + 1)
      )
    } else {
      return 0
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
      library: this.appService.libraryCode,
      circ_desk: this.appService.circDeskCode,
      limit: this.pageSize,
      offset: this.offset,
      order_by: this.getOrderBy()
    }
  }

  
  private getOrderBy() {
    if (this.appService.groupByLocation) {
      return 'location'
    }
    return 'call_number'
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
