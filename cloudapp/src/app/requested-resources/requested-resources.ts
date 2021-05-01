export interface RequestedResource {
  resource_metadata: RequestedResourceResourceMetadata
  location: RequestedResourceLocation
  request: RequestedResourceRequest[]
}

export interface RequestedResourceCopy {
  link: string
  pid: string
  barcode: string
  base_status: { desc: string, value: string }
  alternative_call_number: string
  storage_location_id: string
}

export interface RequestedResourceLocation {
  holding_id: { link: string, value: string }
  library: { desc: string, value: string }
  call_number: string
  shelving_location: string
  copy: RequestedResourceCopy[]
}

export interface RequestedResourceRequest {
  link: string
  id: string
  request_type: string
  request_sub_type: { desc: string, value: string }
  destination: { desc: string, value: string }
  request_date: string
  request_time: string
  requester: { desc: string, value: string }
  comment: string
  printed: boolean
  reported: boolean
}

export interface RequestedResourceResourceMetadata {
  mms_id: { link: string, value: string }
  title: string
  author: string
  issn: string
  isbn: string
  publisher: string
  publication_place: string
  publication_year: string
}
