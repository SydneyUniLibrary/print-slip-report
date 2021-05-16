import {
  ItemEnrichedRequestedResource, LocationEnrichedRequestedResource, RequestedResource, RequestEnrichedRequestedResource,
  UserEnrichedRequestedResource,
} from './requested-resources'



export interface EnrichmentOptions {
  withItemEnrichment?: boolean
  withRequestEnrichment?: boolean
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


export const COLUMNS_DEFINITIONS = toMap([
  new ColumnDefinition('title', 'Title', x => x?.resource_metadata?.title),
  new ColumnDefinition('location','Location', x => x?.location?.shelving_location),
  new ColumnDefinition('call-number', 'Call Number', x => x?.location?.call_number),
  new ColumnDefinition('author', 'Author', x => x?.resource_metadata?.author),
  new ColumnDefinition('isbn', 'ISBN', x => x?.resource_metadata?.isbn),
  new ColumnDefinition('issn', 'ISSN', x => x?.resource_metadata?.issn),
  new ItemEnrichedColumnDefinition('edition', 'Edition', x => x?.resource_metadata?.complete_edition),
  new ColumnDefinition('publisher', 'Publisher', x => x?.resource_metadata?.publisher),
  new ColumnDefinition('publication-date', 'Publication Date', x => x?.resource_metadata?.publication_year),
  new ColumnDefinition('request-type', 'Request Type', x => x?.request?.[0]?.request_sub_type?.desc),
  new ColumnDefinition('requested-for', 'Requested For', x => x?.request?.[0]?.requester?.desc),
  new ColumnDefinition('request-id', 'Request ID', x => x?.request?.[0]?.id),
  new ColumnDefinition('request-date', 'Request Date', x => x?.request?.[0]?.request_date),
  new ColumnDefinition('barcode', 'Barcode', x => x?.location?.copy?.[0]?.barcode),
  new ItemEnrichedColumnDefinition('description', 'Description', x => x?.location?.copy?.[0]?.description),
  new RequestEnrichedColumnDefinition('volume', 'Volume', x => x?.request?.[0]?.volume),
  new RequestEnrichedColumnDefinition('issue', 'Issue', x => x?.request?.[0]?.issue),
  new RequestEnrichedColumnDefinition('chapter-or-article', 'Chapter/Article', chapterOrArticleMapFn),
  new RequestEnrichedColumnDefinition('pages', 'Pages', pagesMapFn),
  new ColumnDefinition('pickup-location', 'Pickup Location', x => x?.request?.[0]?.destination?.desc),
  new ColumnDefinition('item-call-number', 'Item Call Number', x => x?.location?.copy?.[0]?.alternative_call_number),
  new ItemEnrichedColumnDefinition('material-type', 'Material Type', x => x?.location?.copy?.[0]?.physical_material_type.desc),
  new ColumnDefinition('request-note', 'Request Note', x => x?.request?.[0]?.comment),
  new ColumnDefinition('storage-location-id', 'Storage Location ID', x => x?.location?.copy?.[0]?.storage_location_id),
])


function chapterOrArticleMapFn(requestedResource: RequestEnrichedRequestedResource): string {
  let req = requestedResource?.request?.[0]
  return _filteredJoin([ req?.chapter_or_article_title, req?.chapter_or_article_author ], ' / ')
}


function pagesMapFn(requestedResource: RequestEnrichedRequestedResource): string {
  return _filteredJoin(
    requestedResource?.request?.[0]?.required_pages_range?.map(range => _filteredJoin([ range.from_page, range.to_page ], '-')),
    ', '
  )
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
