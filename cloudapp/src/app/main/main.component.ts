import { Component, NgZone, OnInit } from '@angular/core'
import { FormBuilder, FormControl } from '@angular/forms'
import { AlertService, CloudAppEventsService, InitData } from '@exlibris/exl-cloudapp-angular-lib'
import { AppModuleServicesService } from '../app-module-services.service'
import { AppService } from '../app.service'
import { DownloadExcelSlipReportService } from '../download-excel-slip-report'
import { PrintSlipReportCompleteEvent, PrintSlipReportErrorEvent, PrintSlipReportService } from '../print-slip-report'



@Component({
  selector: 'app-main',
  templateUrl: './main.component.html',
  styleUrls: [ './main.component.scss' ],
})
export class MainComponent implements OnInit {

  form = this.fb.group({
    libraryCode: '',
    circDeskCode: '',
    columnOptionsList: [ [ ] ],
  })
  initData: InitData
  loading = false
  ready = false


  constructor(
    private alert: AlertService,
    private appModuleServicesService: AppModuleServicesService,
    private appService: AppService,
    private eventsService: CloudAppEventsService,
    private downloadExcelSlipReportService: DownloadExcelSlipReportService,
    private fb: FormBuilder,
    private printSlipReportService: PrintSlipReportService,
    private zone: NgZone,
  ) {
    this.printSlipReportService.mainComponent = this
    this.printSlipReportService.complete.subscribe(evt => this.onPrintSlipReportComplete(evt))
    this.printSlipReportService.error.subscribe(evt => this.onPrintSlipReportError(evt))
  }


  async ngOnInit() {
    // Show the spinner if the component does not become ready quickly
    let timeoutId = setTimeout(() => { this.loading = !this.ready }, 1000)
    try {
      await this.getInitData()
      this.printSlipReportService.initData = this.initData
      await this.appService.loadLastUsed()
      await this.syncFromAppService()
    } finally {
      clearTimeout(timeoutId)
      this.ready = true
      this.loading = false
    }
  }


  get circDeskCodeControl(): FormControl {
    return this.form.get('circDeskCode') as FormControl
  }


  get circDeskCodeError(): string | null {
    let errors = this.circDeskCodeControl.errors
    if (errors?.required) {
      return 'You need to enter a circulation desk code'
    } else if (errors?.invalidCode) {
      return 'This is not a valid circulation desk code'
    } else {
      return null
    }
  }


  get columnOptionsListControl(): FormControl {
    return this.form.get('columnOptionsList') as FormControl
  }


  set columnOptionsListControl(v: FormControl) {
    this.form.setControl('columnOptionsList', v)
  }


  get columnOptionsListError(): string | null {
    let errors = this.columnOptionsListControl.errors
    if ('required' in errors) {
      return 'Select at least 1 column to include in the print'
    } else {
      return null
    }
  }


  async getInitData() {
    if (!this.initData) {
      this.initData = await this.eventsService.getInitData().toPromise()
    }
  }


  get libraryCodeControl(): FormControl {
    return this.form.get('libraryCode') as FormControl
  }


  get libraryCodeError(): string | null {
    let errors = this.libraryCodeControl.errors
    if (errors?.required) {
      return 'You need to enter a library code'
    } else if (errors?.invalidCode) {
      return 'This is not a valid library code'
    } else {
      return null
    }
  }


  beforeDownload() {
    this.alert.clear()
    this.syncToAppService()
    this.syncFromAppService()  // To update the UI with any normalisation
  }


  onLibraryCodeChange() {
    if (!this.circDeskCodeControl.value) {
      this.appService.libraryCode = this.libraryCodeControl.value
      this.circDeskCodeControl.setValue(this.appService.defaultCircDeskCode)
    }
  }


  onPrint() {
    this.alert.clear()
    this.syncToAppService()
    this.syncFromAppService()  // To update the UI with any normalisation
    // This print slip report has to generate inside the popup window.
    // See https://github.com/SydneyUniLibrary/print-slip-report/issues/28
    if (!this.printSlipReportService.open()) {
      console.warn('Your browser prevented the popup that has the report from appearing')
      this.alert.error('Your browser prevented the popup that has the report from appearing')
    }
  }


  private async onPrintSlipReportComplete(event: PrintSlipReportCompleteEvent) {
    await this.appService.saveLastUsed()
    if (event.numRequestedResources == 0) {
      // This code is run in the popup window's zone.
      // Need to get back into main component's zone so the main component's UI updates.
      this.zone.run(() => {
        this.alert.info('There are no requested resources to print', { autoClose: false })
      })
      this.printSlipReportService.close()
    }
  }


  private onPrintSlipReportError(event: PrintSlipReportErrorEvent) {
    let err = event.error
    console.error('Print slip report error', err)
    // This code is run in the popup window's zone.
    // Need to get back into main component's zone so the main component's UI updates.
    this.zone.run(() => {
      if (PrintSlipReportErrorEvent.isInvalidParameterError(err)) {
        switch (err.parameter) {
          case 'library':
            this.libraryCodeControl.setErrors({ 'invalidCode': true })
            this.alert.info(
              `Valid library codes are ${ err.validOptions.join(', ') }`,
              { autoClose: false },
            )
            break
          case 'circ_desk':
            this.circDeskCodeControl.setErrors({ 'invalidCode': true })
            this.alert.info(
              `Valid circulation desk codes are ${ err.validOptions.join(', ') }`,
              { autoClose: false },
            )
            break
          default:
            this.alert.error(`The API parameter ${ err.parameter } was invalid`)
        }
      } else if (PrintSlipReportErrorEvent.isRestErrorResponse(err) && err?.status == 401) {
        // Unauthorised
        this.alert.error(
          'You are not authorised. Your Alma user needs a Circulation Desk Operator role'
          + ` for the library ${ this.form.value.libraryCode } `
          + ` and the circulation desk ${ this.form.value.circDeskCode }.`,
        )
      } else {
        let msg = err.message || "See the console in your browser's developer tools for more information."
        this.alert.error(`Something went wrong trying to find the requests. ${ msg }`)
      }
    })
    this.printSlipReportService.close()
  }


  async onReset() {
    await this.appService.reset()
    this.syncFromAppService()
  }


  syncFromAppService() {
    this.libraryCodeControl.setValue(this.appService.libraryCode)
    this.circDeskCodeControl.setValue(this.appService.defaultCircDeskCode)
    this.columnOptionsListControl.setValue(this.appService.columnOptions)
  }


  syncToAppService() {
    this.appService.libraryCode = this.form.value.libraryCode
    this.appService.circDeskCode = this.form.value.circDeskCode
    this.appService.columnOptions = this.form.value.columnOptionsList
  }

}
