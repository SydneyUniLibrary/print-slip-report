import { Injectable } from '@angular/core'
import { CloudAppRestService } from '@exlibris/exl-cloudapp-angular-lib'
import LRU from 'lru-cache'


export interface Location {
  code: string
  name: string
}


/*

  ### A note on the caches in AlmaConfigurationService

  The caches store promises and not the results. This ensures we only make one request to the Alma API.
  The first call creates a promise and sets up the request. Subsequent calls get the same promise.
  When the request set up in the first call resolves, the promise resolves for all the callers.
  Any subsequent calls return the same promise, which is already resolved.

*/


@Injectable({
  providedIn: 'root',
})
export class AlmaConfigurationService {

  private _locationCache = new LRU<string, Promise<Location>>(100)
  private _locationsForLibraryCache = new LRU<string, Promise<Location[]>>(5)


  constructor(
    private restService: CloudAppRestService,
  ) { }


  location(libraryCode: string, locationCode: string): Promise<Location | undefined> {
    let cacheKey = `${ libraryCode }‡${ locationCode }`
    let locationPromise = this._locationCache.get(cacheKey)
    if (!locationPromise) {
      let locationsForLibraryPromise = this.locationsForLibrary(libraryCode)
      locationPromise = locationsForLibraryPromise.then(locations =>
        locations.find(l => l.code == locationCode)
      )
      this._locationCache.set(cacheKey, locationPromise)
    }
    return locationPromise
  }


  locationsForLibrary(libraryCode: string): Promise<Location[]> {
    let locationsForLibraryPromise = this._locationsForLibraryCache.get(libraryCode)
    if (!locationsForLibraryPromise) {
      let respPromise = this.restService.call(`/almaws/v1/conf/libraries/${libraryCode}/locations`).toPromise()
      locationsForLibraryPromise = respPromise.then(resp => resp.location)
      this._locationsForLibraryCache.set(libraryCode, locationsForLibraryPromise)
    }
    return locationsForLibraryPromise
  }

}
