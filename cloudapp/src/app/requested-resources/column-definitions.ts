import {
  ItemAndRequestEnrichedRequestedResource, ItemEnrichedRequestedResource, LocationEnrichedRequestedResource,
  RequestedResource, RequestEnrichedRequestedResource, UserEnrichedRequestedResource,
} from './requested-resources'



export interface EnrichmentOptions {
  withItemEnrichment?: boolean
  withLocationEnrichment?: boolean
  withRequestEnrichment?: boolean
  withUserEnrichment?: boolean
}


export class ColumnDefinition {

  static combinedEnrichmentOptions(columnDefinitions: ColumnDefinition[]): EnrichmentOptions {
    return columnDefinitions.reduce<EnrichmentOptions>(
      (acc, x) => ({ ...acc, ...x.enrichmentOptions }),
      {}
    )
  }

  constructor(
    public code: string,
    public name: string,
    public mapFn: (requestedResource: RequestedResource) => string
  ) {}

  get enrichmentOptions(): EnrichmentOptions {
    return {}
  }

}


export class ItemEnrichedColumnDefinition extends ColumnDefinition {

  constructor(
    public code: string,
    public name: string,
    public mapFn: (requestedResource: ItemEnrichedRequestedResource) => string
  ) {
    super(code, name, mapFn)
  }

  get enrichmentOptions(): EnrichmentOptions {
    return { withItemEnrichment: true }
  }

}


export class ItemAndRequestEnrichedColumnDefinition extends ColumnDefinition {

  constructor(
    public code: string,
    public name: string,
    public mapFn: (requestedResource: ItemAndRequestEnrichedRequestedResource) => string
  ) {
    super(code, name, mapFn)
  }

  get enrichmentOptions(): EnrichmentOptions {
    return { withItemEnrichment: true, withRequestEnrichment: true }
  }

}


export class LocationEnrichedColumnDefinition extends ColumnDefinition {

  constructor(
    public code: string,
    public name: string,
    public mapFn: (requestedResource: LocationEnrichedRequestedResource) => string
  ) {
    super(code, name, mapFn)
  }

  get enrichmentOptions(): EnrichmentOptions {
    return { withLocationEnrichment: true }
  }

}


export class RequestEnrichedColumnDefinition extends ColumnDefinition {

  constructor(
    public code: string,
    public name: string,
    public mapFn: (requestedResource: RequestEnrichedRequestedResource) => string
  ) {
    super(code, name, mapFn)
  }

  get enrichmentOptions(): EnrichmentOptions {
    return { withRequestEnrichment: true }
  }

}


export class UserEnrichedColumnDefinition extends ColumnDefinition {

  constructor(
    public code: string,
    public name: string,
    public mapFn: (requestedResource: UserEnrichedRequestedResource ) => string
  ) {
    super(code, name, mapFn)
  }

  get enrichmentOptions(): EnrichmentOptions {
    return { withUserEnrichment: true }
  }

}


export const COLUMNS_DEFINITIONS = toMap([
  new ColumnDefinition('title', 'Title', x => x?.resource_metadata?.title),
  new LocationEnrichedColumnDefinition('location','Location', locationMapFn),
  new ColumnDefinition('call-number', 'Call Number', x => x?.location?.call_number),
  new ColumnDefinition('author', 'Author', x => x?.resource_metadata?.author),
  new ColumnDefinition('isbn', 'ISBN', x => x?.resource_metadata?.isbn),
  new ColumnDefinition('issn', 'ISSN', x => x?.resource_metadata?.issn),
  new ItemEnrichedColumnDefinition('edition', 'Edition', x => x?.resource_metadata?.complete_edition),
  new ColumnDefinition('imprint', 'Imprint', imprintMapFn),
  new ColumnDefinition('publisher', 'Publisher', x => x?.resource_metadata?.publisher),
  new ColumnDefinition('publication-date', 'Publication Date', x => x?.resource_metadata?.publication_year),
  new ColumnDefinition('request-type', 'Request Type', x => x?.request?.[0]?.request_sub_type?.desc),
  new ColumnDefinition('requested-for', 'Requested For', x => x?.request?.[0]?.requester?.desc),
  new ColumnDefinition('request-id', 'Request ID', x => x?.request?.[0]?.id),
  new ColumnDefinition('request-date', 'Request Date', x => x?.request?.[0]?.request_date),
  new ColumnDefinition('barcode', 'Barcode', x => x?.location?.copy?.[0]?.barcode),
  new ItemEnrichedColumnDefinition('description', 'Description', x => x?.location?.copy?.[0]?.description),
  new ItemAndRequestEnrichedColumnDefinition('volume', 'Volume', volumeMapFn),
  new ItemAndRequestEnrichedColumnDefinition('issue', 'Issue', issueMapFn),
  new RequestEnrichedColumnDefinition('chapter-or-article', 'Chapter/Article', chapterOrArticleMapFn),
  new RequestEnrichedColumnDefinition('pages', 'Pages', pagesMapFn),
  new ColumnDefinition('pickup-location', 'Pickup Location', x => x?.request?.[0]?.destination?.desc),
  new ColumnDefinition('item-call-number', 'Item Call Number', x => x?.location?.copy?.[0]?.alternative_call_number),
  new ItemEnrichedColumnDefinition('material-type', 'Material Type', x => x?.location?.copy?.[0]?.physical_material_type.desc),
  new ColumnDefinition('request-note', 'Request Note', x => x?.request?.[0]?.comment),
  new ColumnDefinition('storage-location-id', 'Storage Location ID', x => x?.location?.copy?.[0]?.storage_location_id),
  new RequestEnrichedColumnDefinition('resource-sharing-request-id', 'Resource Sharing Request ID', x => x?.request?.[0]?.resource_sharing?.id),
  new RequestEnrichedColumnDefinition('resource-sharing-volume', 'Resource Sharing Volume', x => x?.request?.[0]?.resource_sharing?.volume),
  new UserEnrichedColumnDefinition('requester-user-group', 'Requester User Group', x => x?.request?.[0]?.requester?.user_group?.desc)
])


function chapterOrArticleMapFn(requestedResource: RequestEnrichedRequestedResource): string {
  let req = requestedResource?.request?.[0]
  return _filteredJoin([ req?.chapter_or_article_title, req?.chapter_or_article_author ], ' / ')
}


function imprintMapFn(requestedResource: RequestEnrichedRequestedResource): string {
  let publisher = requestedResource.resource_metadata?.publisher
  let publication_place = requestedResource.resource_metadata?.publication_place
  let publication_year = requestedResource.resource_metadata?.publication_year
  return _filteredJoin([ publication_place, publisher, publication_year ], ' ')
}


function issueMapFn(requestedResource: ItemAndRequestEnrichedRequestedResource): string {
  let issue = requestedResource.request?.[0]?.issue
  if (!issue || !issue.length) {
    issue = requestedResource.location?.copy?.[0]?.chronology_i
  }
  return issue
}


function locationMapFn(requestedResource: LocationEnrichedRequestedResource): string {
  let details = requestedResource?.location?.shelving_location_details
  return (
    details?.name
    ? `${ details.name } (${ details.code })`
    : requestedResource?.location?.shelving_location ?? ''
  )
}


function pagesMapFn(requestedResource: RequestEnrichedRequestedResource): string {
  return _filteredJoin(
    requestedResource?.request?.[0]?.required_pages_range?.map(range => _filteredJoin([ range.from_page, range.to_page ], '-')),
    ', '
  )
}


function volumeMapFn(requestedResource: ItemAndRequestEnrichedRequestedResource): string {
  let volume = requestedResource.request?.[0]?.volume
  if (!volume || !volume.length) {
    volume = requestedResource.location?.copy?.[0]?.enumeration_a
  }
  return volume
}


function toMap(list: ColumnDefinition[]): Map<string, ColumnDefinition> {
  return new Map(list.map(x => [ x.code, x ]))
}


function _filteredJoin(arr: Array<string | undefined> | undefined, sep: string): string {
  return (
    (arr && arr.length)
    ? arr.filter(x => x && x.length).join(sep)
    : ''
  )
}
