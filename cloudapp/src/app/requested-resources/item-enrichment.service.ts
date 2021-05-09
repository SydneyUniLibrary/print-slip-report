import { Injectable } from '@angular/core'
import { CloudAppRestService, HttpMethod } from '@exlibris/exl-cloudapp-angular-lib'
import { ItemEnrichedRequestedResource, RequestedResource } from './requested-resources'



@Injectable({
  providedIn: 'root'
})
export class ItemEnrichmentService {

  constructor(
    private restService: CloudAppRestService,
  ) { }


  enrich(requestedResource: RequestedResource): Promise<void>[] | undefined {
    let enrichedRequestedResource = (requestedResource as ItemEnrichedRequestedResource)
    return (
      requestedResource?.location?.copy?.map(async (c, i) => {
        let enrichedCopy = (c as ItemEnrichedRequestedResource['location']['copy'][number])
        let item = c.link ? await this._fetchItem(c.link) : undefined
        if (item) {
          if (i == 0) {
            enrichedRequestedResource.resource_metadata.complete_edition = item?.bib_data?.complete_edition
          }
          enrichedCopy.description = item?.item_data?.description
          enrichedCopy.physical_material_type = item?.item_data?.physical_material_type
        }
      })
    )
  }


  private _fetchItem(itemUrl: string): Promise<any> {
    return this.restService.call({ url: itemUrl, method: HttpMethod.GET }).toPromise()
  }

}
