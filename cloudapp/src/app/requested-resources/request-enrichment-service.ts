import { Injectable } from '@angular/core'
import { CloudAppRestService, HttpMethod } from '@exlibris/exl-cloudapp-angular-lib'
import { LendingRequestsService } from './lending-requests-service'
import { RequestedResource, RequestEnrichedRequestedResource } from './requested-resources'



@Injectable({
  providedIn: 'root'
})
export class RequestEnrichmentService {

  constructor(
    private lendingRequestsService: LendingRequestsService,
    private restService: CloudAppRestService,
  ) { }

  enrich(requestedResource: RequestedResource): Promise<void>[] | undefined {
    return (
      requestedResource?.request?.map(async r => {
        let enrichedRequest = (r as RequestEnrichedRequestedResource['request'][number])
        let almaRequest = r.link ? await this._fetchRequest(r.link) : undefined
        if (almaRequest) {
          enrichedRequest.request_sub_type = almaRequest.request_sub_type
          enrichedRequest.volume = almaRequest.volume
          enrichedRequest.issue = almaRequest.issue
          enrichedRequest.chapter_or_article_title = almaRequest.chapter_or_article_title
          enrichedRequest.chapter_or_article_author = almaRequest.chapter_or_article_author
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
                  r => r.request_id == enrichedRequest.resource_sharing.id
                )
                enrichedRequest.resource_sharing.volume = lendingRequest.volume
              } catch (e) {
                console.error(e)
              }
            }
          }
        }
      })
    )
  }

  private async _fetchRequest(requestUrl: string): Promise<any> {
    return this.restService.call({ url: requestUrl, method: HttpMethod.GET }).toPromise()
  }

}
