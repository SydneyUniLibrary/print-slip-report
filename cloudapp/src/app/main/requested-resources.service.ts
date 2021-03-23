import { Injectable } from '@angular/core'
import { CloudAppRestService, HttpMethod, RestErrorResponse } from '@exlibris/exl-cloudapp-angular-lib'


export interface RequestedResource { }


@Injectable({
  providedIn: 'root'
})
export class RequestedResourcesService {

  constructor(
    private restService: CloudAppRestService,
  ) { }


  async get(libraryCode: string, circDeskCode: string): Promise<RequestedResource[]> {
    let resp: { requested_resource?: any }
    try {
       resp = await (
        this.restService.call({
          url: '/task-lists/requested-resources',
          method: HttpMethod.GET,
          queryParams: {
            library: libraryCode,
            circ_desk: circDeskCode,
            limit: 100, // TODO: Handle more than 100 requested resources
          },
        }).toPromise()
      )
    } catch (err) {
      let invalidParameterError = InvalidParameterError.from(err)
      throw invalidParameterError ?? err
    }
    return resp?.requested_resource ?? []
  }

}


export class InvalidParameterError extends Error {

  static from(restErrorResponse: RestErrorResponse): InvalidParameterError | null {
    const error = restErrorResponse?.error?.errorList?.error?.filter(e => e?.errorCode == '40166410')
    if (error) {
      const match = error[0]?.errorMessage?.match(/The parameter (\w+) is invalid\..*Valid options are: \[([^\]]*)]/)
      if (match) {
        let parameter = match[1]
        let validOptions = match[2].split(',')
        return new InvalidParameterError(parameter, validOptions)
      }
    }
    return null
  }

  constructor(
    public parameter: string,
    public validOptions: string[],
  ) {
    super(`The parameter ${ parameter } is invalid`)
  }

}
