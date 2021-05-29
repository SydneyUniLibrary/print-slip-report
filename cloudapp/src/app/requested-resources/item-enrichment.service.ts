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
          let d = item.item_data
          enrichedCopy.description = d.description
          enrichedCopy.physical_material_type = d.physical_material_type
          enrichedCopy.enumeration_a = d.enumeration_a
          enrichedCopy.enumeration_b = d.enumeration_b
          enrichedCopy.enumeration_c = d.enumeration_c
          enrichedCopy.enumeration_d = d.enumeration_d
          enrichedCopy.enumeration_e = d.enumeration_e
          enrichedCopy.enumeration_f = d.enumeration_f
          enrichedCopy.enumeration_g = d.enumeration_g
          enrichedCopy.enumeration_h = d.enumeration_h
          enrichedCopy.chronology_i = d.chronology_i
          enrichedCopy.chronology_j = d.chronology_j
          enrichedCopy.chronology_k = d.chronology_k
          enrichedCopy.chronology_l = d.chronology_l
          enrichedCopy.chronology_m = d.chronology_m
          let h = item.holding_data
          enrichedCopy.accession_number = h.accession_number
          enrichedCopy.in_temp_location = h.in_temp_location
          enrichedCopy.temp_location = h.temp_location
        }
      })
    )
  }


  private _fetchItem(itemUrl: string): Promise<any> {
    return this.restService.call({ url: itemUrl, method: HttpMethod.GET }).toPromise()
  }

}
