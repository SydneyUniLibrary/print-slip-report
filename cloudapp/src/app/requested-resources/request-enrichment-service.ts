import { Injectable } from '@angular/core'
import { CloudAppRestService } from '@exlibris/exl-cloudapp-angular-lib'
import { LendingRequestsService } from './lending-requests-service'
import { RequestedResource, RequestedResourceRequest, RequestEnrichedRequestedResource } from './requested-resources'



@Injectable({
  providedIn: 'root'
})
export class RequestEnrichmentService {

  constructor(
    private lendingRequestsService: LendingRequestsService,
    private restService: CloudAppRestService,
  ) { }


  enrich(requestedResource: RequestedResource): Promise<void>[] | undefined {
    if (requestedResource.request.length == 1) {
      return this._enrichOneRequest(requestedResource)
    } else {
      return this._enrichManyRequests(requestedResource)
    }
  }


  private _enrichOneRequest(requestedResource: RequestedResource): Promise<void>[] | undefined {
    return (
      requestedResource.request.map(async req => {
        let almaRequest = req.link ? await this._fetchTitleRequest(req.link) : undefined
        if (almaRequest) {
          await this._enrichRequest(req, almaRequest)
        }
        req.copies = new Set(requestedResource.location.copy)
      })
    )
  }


  private _enrichManyRequests(requestedResource: RequestedResource): Promise<void>[] | undefined {
    let reqMap = new Map<string, RequestedResource['request'][number]>(
      requestedResource.request.map(r => [ r.id, r ])
    )
    return (
      requestedResource.location.copy.map(async copy => {
        for (let almaRequest of copy.link ? await this._fetchItemRequests(`${ copy.link }/requests`) : []) {
          let req = reqMap.get(almaRequest.request_id)
          if (req.copies?.size) {
            req.copies.add(copy)
          } else {
            await this._enrichRequest(req, almaRequest)
            req.copies = new Set([ copy ])
          }
        }
      })
    )
  }


  private async _enrichRequest(request: RequestedResourceRequest, almaRequest) {
    let enrichedRequest = (request as RequestEnrichedRequestedResource['request'][number])
    enrichedRequest.request_sub_type = almaRequest.request_sub_type
    enrichedRequest.volume = almaRequest.volume
    enrichedRequest.issue = almaRequest.issue
    enrichedRequest.chapter_or_article_title = almaRequest.chapter_or_article_title
    enrichedRequest.chapter_or_article_author = almaRequest.chapter_or_article_author
    enrichedRequest.pickup_location = almaRequest.pickup_location
    if (almaRequest.required_pages_range) {
      enrichedRequest.required_pages_range = almaRequest.required_pages_range
    }
    if (almaRequest.resource_sharing) {
      enrichedRequest.resource_sharing = almaRequest.resource_sharing
      if (almaRequest?.request_sub_type?.value?.startsWith('RESOURCE_SHARING')) {
        try {
          let lendingRequestsForLibrary = (
            await this.lendingRequestsService.lendingRequestsForLibraryWithStatus(
              almaRequest.pickup_location_library,
              enrichedRequest.resource_sharing.status.value,
            )
          )
          let lendingRequest = lendingRequestsForLibrary.find(
            r => r.request_id == enrichedRequest.resource_sharing.id,
          )
          enrichedRequest.resource_sharing.volume = lendingRequest.volume
        } catch (e) {
          console.error(e)
        }
      }
    }
  }


  private async _fetchItemRequests(url: string): Promise<any> {
    let resp = await this.restService.call({ url: url }).toPromise()
    return resp.user_request
  }


  private _fetchTitleRequest(url: string): Promise<any> {
    return this.restService.call({ url: url }).toPromise()
  }

}
