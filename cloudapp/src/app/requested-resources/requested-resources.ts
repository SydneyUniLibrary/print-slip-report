export interface StringWithAttr {
  desc: string
  value: string
}


//---------------------------------------------------------------------------


export interface RequestedResource {
  resource_metadata: RequestedResourceResourceMetadata
  location: RequestedResourceLocation
  request: RequestedResourceRequest[]
}


export interface RequestedResourceCopy {
  link: string
  pid: string
  barcode: string
  base_status: StringWithAttr
  alternative_call_number: string
  storage_location_id: string
}


export interface RequestedResourceLocation {
  holding_id: { link: string, value: string }
  library: StringWithAttr
  call_number: string
  shelving_location: string
  copy: RequestedResourceCopy[]
}


export interface RequestedResourceRequest {
  link: string
  id: string
  request_type: string
  request_sub_type: StringWithAttr
  destination: StringWithAttr
  request_date: string
  request_time: string
  requester: StringWithAttr
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


//---------------------------------------------------------------------------


export type ItemEnrichedRequestedResource = RequestedResource & {
  resource_metadata: RequestedResource['resource_metadata'] & {
    complete_edition: string
  }
  location: RequestedResource['location'] & {
    copy: Array<RequestedResource['location']['copy'][number] & {
      description: string
      physical_material_type: StringWithAttr
      enumeration_a: string
      enumeration_b: string
      enumeration_c: string
      enumeration_d: string
      enumeration_e: string
      enumeration_f: string
      enumeration_g: string
      enumeration_h: string
      chronology_i: string
      chronology_j: string
      chronology_k: string
      chronology_l: string
      chronology_m: string
    }>
  }
}


export type LocationEnrichedRequestedResource = RequestedResource & {
  location: RequestedResource['location'] & {
    shelving_location: { code: string, name: string }
  }
}


export type RequestEnrichedRequestedResource = RequestedResource & {
  request: Array<RequestedResource['request'] & {
    volume: string
    issue: string
    chapter_or_article_title: string
    chapter_or_article_author: string
    required_pages_range?: Array<{
      from_page?: string,
      to_page?: string
    }>
    resource_sharing?: {
      id: string,
      status: StringWithAttr,
      link: string | null
    }
  }>
}


export type UserEnrichedRequestedResource = RequestedResource & {
  request: Array<RequestedResource['request'][number] & {
    requester: StringWithAttr & {
      user_group: string
    }
  }>
}
