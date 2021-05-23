import { Injectable } from '@angular/core'
import { CloudAppRestService, HttpMethod } from '@exlibris/exl-cloudapp-angular-lib'
import { RequestedResource, UserEnrichedRequestedResource } from './requested-resources'



@Injectable({
  providedIn: 'root'
})
export class UserEnrichmentService {

  constructor(
    private restService: CloudAppRestService
  ) { }


  enrich(requestedResource: RequestedResource): Promise<void>[] | undefined {
    return (
      requestedResource?.request.map(async (r, i) => {
        let enrichedRequester = (r as UserEnrichedRequestedResource['request'][number]).requester
        let user = enrichedRequester.link ? await this._fetchUser(enrichedRequester.link) : undefined
        enrichedRequester.user_group = user?.user_group
      })
    )
  }


  private _fetchUser(userUrl: string): Promise<any> {
    // TODO: Add LRU cache
    return this.restService.call({ url: userUrl, method: HttpMethod.GET }).toPromise()
  }

}
