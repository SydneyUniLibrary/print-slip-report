import * as _ from 'lodash'
import {
  ItemAndLocationEnrichedRequestedResource, ItemAndRequestEnrichedRequestedResource, ItemEnrichedRequestedResource,
  LocationEnrichedRequestedResource, RequestedResource, RequestEnrichedRequestedResource, UserEnrichedRequestedResource,
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


export class ItemAndLocationEnrichedColumnDefinition extends ColumnDefinition {

  constructor(
    public code: string,
    public name: string,
    public mapFn: ColumnMapFn<ItemAndLocationEnrichedRequestedResource>,
  ) {
    super(code, name, mapFn)
  }

  get enrichmentOptions(): EnrichmentOptions {
    return { withItemEnrichment: true, withLocationEnrichment: true }
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
  new ItemAndLocationEnrichedColumnDefinition('location','Location', locationMapFn),
  new ColumnDefinition('call-number', 'Call Number', ({ location }) => location.call_number),
  new ItemAndRequestEnrichedColumnDefinition('accession-number', 'Accession Number', perCopy(copy => copy.accession_number)),
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
  new RequestEnrichedColumnDefinition('barcode', 'Barcode', perCopy(copy => copy.barcode)),
  new ItemAndRequestEnrichedColumnDefinition('description', 'Description', perCopy(copy => copy.description)),
  new ItemAndRequestEnrichedColumnDefinition('volume', 'Volume', volumeMapFn),
  new ItemAndRequestEnrichedColumnDefinition('issue', 'Issue', issueMapFn),
  new RequestEnrichedColumnDefinition('chapter-or-article', 'Chapter/Article', chapterOrArticleMapFn),
  new RequestEnrichedColumnDefinition('pages', 'Pages', pagesMapFn),
  new RequestEnrichedColumnDefinition('pickup-location', 'Pickup Location', ({ request }) => request.pickup_location),
  new RequestEnrichedColumnDefinition('item-call-number', 'Item Call Number', perCopy(copy => copy.alternative_call_number)),
  new ItemAndRequestEnrichedColumnDefinition('material-type', 'Material Type', perCopy(copy => copy.physical_material_type?.desc)),
  new ColumnDefinition('request-note', 'Request Note', ({ request }) => request.comment),
  new RequestEnrichedColumnDefinition('storage-location-id', 'Storage Location ID', perCopy(copy => copy.storage_location_id)),
  new RequestEnrichedColumnDefinition('resource-sharing-request-id', 'Resource Sharing Request ID', ({ request }) => request.resource_sharing?.id),
  new RequestEnrichedColumnDefinition('resource-sharing-volume', 'Resource Sharing Volume', ({ request }) => request.resource_sharing?.volume),
  new UserEnrichedColumnDefinition('requester-user-group', 'Requester User Group', ({ request }) => request.requester?.user_group?.desc),
])


type ItemEnrichmentCopy = ItemEnrichedRequestedResource['location']['copy'][number]

type MapFn<T extends new (...args: any) => any> = ConstructorParameters<T>[2]
type MapFnParams<T extends new (...args: any) => any> = Parameters<MapFn<T>>[0]


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
  if (!issue?.length) {
    issue = _filteredDedupedJoin(location.copy.map((c: ItemEnrichmentCopy) => c.chronology_i), ' ')
  }
  return issue
}


function locationMapFn({ location }: MapFnParams<typeof ItemAndLocationEnrichedColumnDefinition>): string | undefined {
  console.log('locationMapFn location', location)
  if (location.copy.some((c: ItemEnrichmentCopy) => c.in_temp_location)) {
    return _filteredDedupedJoin(
      location.copy.map((c: ItemEnrichmentCopy) =>
        c.temp_location?.desc
        ? `${ c.temp_location.desc } (${ c.temp_location.value })`
        : c.temp_location?.value
      ),
      ' ',
    )
  } else {
    let details = location?.shelving_location_details
    return (
      details?.name
        ? `${ details.name } (${ details.code })`
        : location?.shelving_location ?? ''
    )
  }
}


function pagesMapFn({ request }: MapFnParams<typeof RequestEnrichedColumnDefinition>): string | undefined {
  return _filteredJoin(
    request.required_pages_range?.map(range => _filteredJoin([ range.from_page, range.to_page ], '-')),
    ', '
  )
}


function volumeMapFn({ location, request }: MapFnParams<typeof ItemAndRequestEnrichedColumnDefinition>): string | undefined {
  let volume = request.volume
  if (!volume?.length) {
    volume = _filteredDedupedJoin(location.copy.map((c: ItemEnrichmentCopy) => c.enumeration_a), ' ')
  }
  return volume
}


type PerCopyMapFn = (copy: ItemEnrichedRequestedResource['location']['copy'][number]) => string | undefined

function perCopy(perCopyMapFn: PerCopyMapFn): MapFn<typeof RequestEnrichedColumnDefinition> {
  return ({ location }) => (
    _filteredDedupedJoin(location.copy.map((c: ItemEnrichmentCopy) => perCopyMapFn(c)), ' ')
  )
}


function toMap(list: ColumnDefinition[]): Map<string, ColumnDefinition> {
  return new Map(list.map(x => [ x.code, x ]))
}


function _filteredJoin(arr: Array<string | undefined> | undefined, sep: string): string | undefined {
  return arr?.filter(x => x?.length)?.join(sep)
}

function _filteredDedupedJoin(arr: Array<string | undefined> | undefined, sep: string): string | undefined {
  return _.uniq(arr?.filter(x => x?.length))?.join(sep)
}
