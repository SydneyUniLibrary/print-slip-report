import {
  ItemAndRequestEnrichedRequestedResource, ItemEnrichedRequestedResource, LocationEnrichedRequestedResource,
  RequestedResource, RequestEnrichedRequestedResource, UserEnrichedRequestedResource,
} from './requested-resources'



export type ColumnMapFn<T extends RequestedResource> = (
  (
    requested_resource: {
      resource_metadata: T['resource_metadata'],
      location: T['location'],
      request: T['request'][number],
    },
  )
  => string | undefined
)


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
    public mapFn: ColumnMapFn<RequestedResource>
  ) {}

  get enrichmentOptions(): EnrichmentOptions {
    return {}
  }

}


export class ItemEnrichedColumnDefinition extends ColumnDefinition {

  constructor(
    public code: string,
    public name: string,
    public mapFn: ColumnMapFn<ItemEnrichedRequestedResource>
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
    public mapFn: ColumnMapFn<ItemAndRequestEnrichedRequestedResource>,
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
    public mapFn: ColumnMapFn<LocationEnrichedRequestedResource>,
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
    public mapFn: ColumnMapFn<RequestEnrichedRequestedResource>,
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
    public mapFn: ColumnMapFn<UserEnrichedRequestedResource>
  ) {
    super(code, name, mapFn)
  }

  get enrichmentOptions(): EnrichmentOptions {
    return { withUserEnrichment: true }
  }

}


export const COLUMNS_DEFINITIONS = toMap([
  new ColumnDefinition('title', 'Title', ({ resource_metadata }) => resource_metadata.title),
  new LocationEnrichedColumnDefinition('location','Location', locationMapFn),
  new ColumnDefinition('call-number', 'Call Number', ({ location }) => location.call_number),
  new ColumnDefinition('author', 'Author', ({ resource_metadata }) => resource_metadata.author),
  new ColumnDefinition('isbn', 'ISBN', ({ resource_metadata }) => resource_metadata.isbn),
  new ColumnDefinition('issn', 'ISSN', ({ resource_metadata }) => resource_metadata.issn),
  new ItemEnrichedColumnDefinition('edition', 'Edition', ({ resource_metadata }) => resource_metadata.complete_edition),
  new ColumnDefinition('imprint', 'Imprint', imprintMapFn),
  new ColumnDefinition('publisher', 'Publisher', ({ resource_metadata }) => resource_metadata.publisher),
  new ColumnDefinition('publication-date', 'Publication Date', ({ resource_metadata }) => resource_metadata.publication_year),
  new ColumnDefinition('request-type', 'Request Type', ({ request}) => request.request_sub_type?.desc),
  new ColumnDefinition('requested-for', 'Requested For', ({ request }) => request.requester?.desc),
  new ColumnDefinition('request-id', 'Request ID', ({ request }) => request.id),
  new ColumnDefinition('request-date', 'Request Date', ({ request }) => request.request_date),
  new ColumnDefinition('barcode', 'Barcode', ({ location }) => location.copy?.[0]?.barcode),  // TODO: Concat the barcodes of request.copies (issue 40)
  new ItemEnrichedColumnDefinition('description', 'Description', ({ location }) => location.copy?.[0]?.description),  // TODO: Dedup and concat the description of request.copies
  new ItemAndRequestEnrichedColumnDefinition('volume', 'Volume', volumeMapFn),
  new ItemAndRequestEnrichedColumnDefinition('issue', 'Issue', issueMapFn),
  new RequestEnrichedColumnDefinition('chapter-or-article', 'Chapter/Article', chapterOrArticleMapFn),
  new RequestEnrichedColumnDefinition('pages', 'Pages', pagesMapFn),
  new ColumnDefinition('pickup-location', 'Pickup Location', ({ request }) => request.destination?.desc),
  new ColumnDefinition('item-call-number', 'Item Call Number', ({ location }) => location.copy?.[0]?.alternative_call_number),  // TODO: Dedup and concat the alternative_call_number of request.copies
  new ItemEnrichedColumnDefinition('material-type', 'Material Type', ({ location }) => location.copy?.[0]?.physical_material_type.desc),
  new ColumnDefinition('request-note', 'Request Note', ({ request }) => request.comment),
  new ColumnDefinition('storage-location-id', 'Storage Location ID', ({ location }) => location.copy?.[0]?.storage_location_id),  // TODO: Dedup and concat the storage_location_id of request.copies
  new RequestEnrichedColumnDefinition('resource-sharing-request-id', 'Resource Sharing Request ID', ({ request }) => request.resource_sharing?.id),
  new RequestEnrichedColumnDefinition('resource-sharing-volume', 'Resource Sharing Volume', ({ request }) => request.resource_sharing?.volume),
  new UserEnrichedColumnDefinition('requester-user-group', 'Requester User Group', ({ request }) => request.requester?.user_group?.desc),
])


type MapFnParams<T extends new (...args: any) => any> = Parameters<ConstructorParameters<T>[2]>[0]


function chapterOrArticleMapFn({ request }: MapFnParams<typeof RequestEnrichedColumnDefinition>): string | undefined {
  return _filteredJoin([ request.chapter_or_article_title, request.chapter_or_article_author ], ' / ')
}


function imprintMapFn({ resource_metadata }: MapFnParams<typeof ColumnDefinition>): string | undefined {
  let publisher = resource_metadata.publisher
  let publication_place = resource_metadata.publication_place
  let publication_year = resource_metadata.publication_year
  return _filteredJoin([ publication_place, publisher, publication_year ], ' ')
}


function issueMapFn({ location, request }: MapFnParams<typeof ItemAndRequestEnrichedColumnDefinition>): string | undefined {
  let issue = request.issue
  if (!issue || !issue.length) {
    issue = location.copy?.[0]?.chronology_i  // TODO: Dedup and concat the chronology_i of request.copies
  }
  return issue
}


function locationMapFn({ location }: MapFnParams<typeof LocationEnrichedColumnDefinition>): string | undefined {
  let details = location?.shelving_location_details
  return (
    details?.name
    ? `${ details.name } (${ details.code })`
    : location?.shelving_location ?? ''
  )
}


function pagesMapFn({ request }: MapFnParams<typeof RequestEnrichedColumnDefinition>): string | undefined {
  return _filteredJoin(
    request.required_pages_range?.map(range => _filteredJoin([ range.from_page, range.to_page ], '-')),
    ', '
  )
}


function volumeMapFn({ location, request }: MapFnParams<typeof ItemAndRequestEnrichedColumnDefinition>): string | undefined {
  let volume = request.volume
  if (!volume || !volume.length) {
    volume = location.copy?.[0]?.enumeration_a  // TODO: Dedup and concat the enumeration_a of request.copies
  }
  return volume
}


function toMap(list: ColumnDefinition[]): Map<string, ColumnDefinition> {
  return new Map(list.map(x => [ x.code, x ]))
}


function _filteredJoin(arr: Array<string | undefined> | undefined, sep: string): string | undefined {
  return arr?.filter(x => x && x.length)?.join(sep)
}
