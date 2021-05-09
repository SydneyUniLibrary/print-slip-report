import { RestErrorResponse } from '@exlibris/exl-cloudapp-angular-lib'
import { InvalidParameterError } from '../requested-resources'



export type SlipReportError = Error | InvalidParameterError | RestErrorResponse


export class SlipReportErrorEvent {

  static isInvalidParameterError(err: SlipReportError): err is InvalidParameterError {
    return err instanceof InvalidParameterError
  }


  static isRestErrorResponse(err: SlipReportError): err is RestErrorResponse {
    return 'status' in err
  }


  constructor(
    public error: SlipReportError,
  ) { }

}
