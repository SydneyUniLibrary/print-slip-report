import { Location as LocationService } from '@angular/common'
import { EventEmitter, Injectable } from '@angular/core'
import { Router } from '@angular/router'
import { v4 as uuid4 } from 'uuid'
import { AppModuleServicesService } from '../app-module-services.service'
import { MainComponent } from '../main/main.component'
import { SlipReportErrorEvent } from '../slip-report'



export class PrintSlipReportCompleteEvent {
  constructor(
    public numRequestedResources: number
  ) { }
}



@Injectable({
  providedIn: 'root'
})
export class PrintSlipReportWindowService {

  complete = new EventEmitter<PrintSlipReportCompleteEvent>(true)
  error = new EventEmitter<SlipReportErrorEvent>(true)
  mainComponent?: MainComponent
  popupWindow?: Window
  readonly target = uuid4()
  readonly url: string


  constructor(
    location: LocationService,
    router: Router,
  ) {
    // This has only been tested with the hash location strategy
    let routeUrl = (
      location.prepareExternalUrl(
        router.serializeUrl(
          router.createUrlTree([ 'print-slip-report' ])
        )
      )
    )
    this.url = new URL(routeUrl, window.location.href).toString()
  }


  close() {
    if (this.popupWindow) {
      this.popupWindow.close()
      this.popupWindow = undefined
    }
  }


  open(appModuleServicesService: AppModuleServicesService): boolean {
    this.popupWindow = window.open(this.url, this.target, 'status=0')
    if (this.popupWindow) {
      appModuleServicesService.setInWindow(this.popupWindow)
    }
    return !!this.popupWindow
  }

}
