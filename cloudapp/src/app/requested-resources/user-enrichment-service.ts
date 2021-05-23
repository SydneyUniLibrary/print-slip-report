import { Injectable } from '@angular/core'
import { CloudAppRestService, HttpMethod } from '@exlibris/exl-cloudapp-angular-lib'
import LRU from 'lru-cache'
import { RequestedResource, UserEnrichedRequestedResource } from './requested-resources'



@Injectable({
  providedIn: 'root'
})
export class UserEnrichmentService {

  private _cache = new LRU<string, Promise<any>>({
    max: 100,
    maxAge: 60000,  /* 1 min */
  })


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
    // Stores the promise and not the result in the cache. This ensures we only make one request to get the user.
    // The first call creates a promise and sets up the request. Subsequent calls get the same promise.
    // When the request set up in the first call resolves, the promise resolves for all the callers.
    // Any subsequent requests returns the same promise, which is already resolved.
    let userPromise = this._cache.get(userUrl)
    if (!userPromise) {
      userPromise = this.restService.call({ url: userUrl, method: HttpMethod.GET }).toPromise()
      this._cache.set(userUrl, userPromise)
    }
    return userPromise
  }

}
