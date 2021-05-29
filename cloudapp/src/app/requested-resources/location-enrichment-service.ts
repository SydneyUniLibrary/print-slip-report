import { Injectable } from '@angular/core'
import { AlmaConfigurationService } from '../alma-configuration/alma-configuration-service'
import { LocationEnrichedRequestedResource, RequestedResource } from './requested-resources'



@Injectable({
  providedIn: 'root'
})
export class LocationEnrichmentService {

  constructor(
    private almaConfigurationService: AlmaConfigurationService
  ) { }


  enrich(requestedResource: RequestedResource): Promise<void>[] | undefined {
    return [ this._enrichShelvingLocation(requestedResource) ]
  }


  private async _enrichShelvingLocation(requestedResource: RequestedResource) {
    let libraryCode = requestedResource.location.library.value
    let locationCode = requestedResource.location.shelving_location
    let location = await this.almaConfigurationService.location(libraryCode, locationCode)
    let locationName = location ? location.name : ''
    let enrichedLocation = requestedResource.location as LocationEnrichedRequestedResource['location']
    enrichedLocation.shelving_location_details = { code: locationCode, name: locationName }
  }

}
