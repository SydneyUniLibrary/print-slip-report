export class ColumnDefinition {

  constructor(
    public code: string,
    public name: string,
    public mapFn: (requestedResource: any) => string
  ) {}

}


export const COLUMNS_DEFINITIONS = [
  new ColumnDefinition('title', 'Title', x => x?.resource_metadata?.title),
  new ColumnDefinition('location','Location', x => x?.location?.shelving_location),
  new ColumnDefinition('call-number', 'Call Number', x => x?.location?.call_number),
  new ColumnDefinition('author', 'Author', x => x?.resource_metadata?.author),
  new ColumnDefinition('isbn', 'ISBN', x => x?.resource_metadata?.isbn),
  new ColumnDefinition('issn', 'ISSN', x => x?.resource_metadata?.issn),
  new ColumnDefinition('publisher', 'Publisher', x => x?.resource_metadata?.publisher),
  new ColumnDefinition('publication-date', 'Publication Date', x => x?.resource_metadata?.publication_year),
  new ColumnDefinition('request-type', 'Request Type', x => x?.request?.[0]?.request_sub_type?.desc),
  new ColumnDefinition('requested-for', 'Requested For', x => x?.request?.[0]?.requester?.desc),
  new ColumnDefinition('request-id', 'Request ID', x => x?.request?.[0]?.id),
  new ColumnDefinition('barcode', 'Barcode', x => x?.location?.copy?.[0]?.barcode),
  new ColumnDefinition('pickup-location', 'Pickup Location', x => x?.request?.[0]?.destination?.desc),
  new ColumnDefinition('item-call-number', 'Item Call Number', x => x?.location?.copy?.[0]?.alternative_call_number),
  new ColumnDefinition('request-note', 'Request Note', x => x?.request?.[0]?.comment),
  new ColumnDefinition('storage-location-id', 'Storage Location ID', x => x?.location?.copy?.[0]?.storage_location_id),
]
