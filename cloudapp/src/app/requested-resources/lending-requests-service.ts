import { Injectable } from '@angular/core'
import { CloudAppRestService } from '@exlibris/exl-cloudapp-angular-lib'
import LRU from 'lru-cache'


export interface ResourceSharingRequest {
  request_id: string
  volume: string
}


/*

 ### A note on the caches in AlmaConfigurationService

 The caches store promises and not the results. This ensures we only make one request to the Alma API.
 The first call creates a promise and sets up the request. Subsequent calls get the same promise.
 When the request set up in the first call resolves, the promise resolves for all the callers.
 Any subsequent calls return the same promise, which is already resolved.

 */


@Injectable({
  providedIn: 'root'
})
export class LendingRequestsService {

  private _lendingRequestsForLibraryCache = new LRU<string, Promise<ResourceSharingRequest[]>>(2)


  constructor(
    private restService: CloudAppRestService
  ) { }


  lendingRequestsForLibraryWithStatus(library: string, status: string): Promise<ResourceSharingRequest[]> {
    let cacheKey = `${ library }‡${ status }`
    let promise = this._lendingRequestsForLibraryCache.get(cacheKey)
    if (!promise) {
      promise = (
        this.restService
        .call({
          url: '/almaws/v1/task-lists/rs/lending-requests',
          queryParams: { library, status }
        })
        .toPromise()
        .then(resp => resp.user_resource_sharing_request)
      )
      this._lendingRequestsForLibraryCache.set(cacheKey, promise)
    }
    return promise
  }

}
