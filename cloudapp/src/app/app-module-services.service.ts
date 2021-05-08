import { Injectable } from '@angular/core'
import { AppService } from './app.service'
import { PrintSlipReportWindowService } from './print-slip-report/window.service'
import { RequestedResourcesService } from './requested-resources'



export const WINDOW_KEY = 'appModuleServicesService'


@Injectable({
  providedIn: 'root'
})
export class AppModuleServicesService {

  static getFromWindow(wnd): AppModuleServicesService {
    let s = wnd[WINDOW_KEY]
    if (!s) {
      throw Error(`No ${ WINDOW_KEY } defined on window`)
    }
    return s
  }


  constructor(
    public readonly appService: AppService,
    public readonly printSlipReportWindowService: PrintSlipReportWindowService,
    public readonly requestedResourcesService: RequestedResourcesService,
  ) { }


  setInWindow(wnd) {
    Object.defineProperty(wnd, WINDOW_KEY, { enumerable: true, value: this })
  }

}
