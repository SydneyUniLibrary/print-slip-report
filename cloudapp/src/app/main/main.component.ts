import { AfterViewInit, Component, NgZone, OnInit } from '@angular/core'
import { FormBuilder, FormControl } from '@angular/forms'
import { AlertService } from '@exlibris/exl-cloudapp-angular-lib'
import { AppModuleServicesService } from '../app-module-services.service'
import { AppService } from '../app.service'
import { PrintSlipReportCompleteEvent, PrintSlipReportWindowService } from '../print-slip-report'
import { SlipReportError, SlipReportErrorEvent } from '../slip-report'



@Component({
  selector: 'app-main',
  templateUrl: './main.component.html',
  styleUrls: [ './main.component.scss' ],
})
export class MainComponent implements AfterViewInit, OnInit {

  form = this.fb.group({
    libraryCode: '',
    circDeskCode: '',
    columnOptionsList: [ [ ] ],
  })
  loading = false
  ready = false


  constructor(
    private alert: AlertService,
    private appModuleServicesService: AppModuleServicesService,
    private appService: AppService,
    private fb: FormBuilder,
    private printSlipReportWindowService: PrintSlipReportWindowService,
    private zone: NgZone,
  ) {
    this.printSlipReportWindowService.mainComponent = this
    this.printSlipReportWindowService.complete.subscribe(evt => this.onPrintSlipReportComplete(evt))
    this.printSlipReportWindowService.error.subscribe(evt => this.onPrintSlipReportError(evt))
  }


  async ngOnInit() {
    // Show the spinner if the component does not become ready quickly
    let timeoutId = setTimeout(() => { this.loading = !this.ready }, 1000)
    try {
      await this.appService.loadLastUsed()
      await this.syncFromAppService()
    } finally {
      clearTimeout(timeoutId)
      this.ready = true
      this.loading = false
    }
  }


  ngAfterViewInit() {
    let error = this.appService.popLastSlipReportError()
    if (error) {
      this.onSlipReportError(error)
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
    if (!this.printSlipReportWindowService.open(this.appModuleServicesService)) {
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
      this.printSlipReportWindowService.close()
    }
  }


  private onPrintSlipReportError(event: SlipReportErrorEvent) {
    // This code is run in the popup window's zone.
    // Need to get back into main component's zone so the main component's UI updates.
    this.zone.run(() => {
      this.onSlipReportError(event.error)
    })
    this.printSlipReportWindowService.close()
  }


  private onSlipReportError(error: SlipReportError) {
    if (SlipReportErrorEvent.isInvalidParameterError(error)) {
      switch (error.parameter) {
        case 'library':
          this.libraryCodeControl.setErrors({ 'invalidCode': true })
          this.alert.info(
            `Valid library codes are ${ error.validOptions.join(', ') }`,
            { autoClose: false },
          )
          break
        case 'circ_desk':
          this.circDeskCodeControl.setErrors({ 'invalidCode': true })
          this.alert.info(
            `Valid circulation desk codes are ${ error.validOptions.join(', ') }`,
            { autoClose: false },
          )
          break
        default:
          this.alert.error(`The API parameter ${ error.parameter } was invalid`)
      }
    } else if (SlipReportErrorEvent.isRestErrorResponse(error) && error?.status == 401) {
      // Unauthorised
      this.alert.error(
        'You are not authorised. Your Alma user needs a Circulation Desk Operator role'
        + ` for the library ${ this.form.value.libraryCode } `
        + ` and the circulation desk ${ this.form.value.circDeskCode }.`,
      )
    } else {
      let msg = error.message || "See the console in your browser's developer tools for more information."
      this.alert.error(`Something went wrong trying to find the requests. ${ msg }`)
    }
  }


  async onResetToDefaults() {
    await this.appService.resetColumnsToDefaults()
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
