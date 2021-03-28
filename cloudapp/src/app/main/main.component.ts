import { Component, NgZone, OnInit } from '@angular/core'
import { FormBuilder, FormControl } from '@angular/forms'
import { AlertService, CloudAppEventsService, InitData, RestErrorResponse } from '@exlibris/exl-cloudapp-angular-lib'
import { COLUMNS_DEFINITIONS } from '../column-definitions'
import { ColumnOption } from '../column-options'
import { ConfigService } from '../config/config.service'
import { InvalidParameterError, PrintSlipReportCompleteEvent, PrintSlipReportService } from '../print-slip-report'
import { PrintSlipReportErrorEvent } from '../print-slip-report/print-slip-report.service'
import { LastUsedOptionsService } from './last-used-options.service'



@Component({
  selector: 'app-main',
  templateUrl: './main.component.html',
  styleUrls: [ './main.component.scss' ],
  providers: [ PrintSlipReportService ],
})
export class MainComponent implements OnInit {

  form = this.fb.group({
    libraryCode: '',
    circDeskCode: '',
    columnOptionsList: [ [] ],
  })
  initData: InitData
  libraryCodeIsFromInitData: boolean = false
  loading = false
  ready = false


  constructor(
    private alert: AlertService,
    private configService: ConfigService,
    private eventsService: CloudAppEventsService,
    private fb: FormBuilder,
    private lastUsedOptionsService: LastUsedOptionsService,
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
      await this.restoreOptions()
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


  onLibraryCodeChange() {
    if (!this.circDeskCodeControl.value) {
      this.resetCircDeskCode(this.libraryCodeControl.value.trim())
    }
  }


  onPrint() {
    this.alert.clear()

    let libraryCode = this.form.value.libraryCode.trim()
    this.printSlipReportService.libraryCode = libraryCode
    let circDeskCode = this.form.value.circDeskCode.trim()
    this.printSlipReportService.circDeskCode = circDeskCode
    this.printSlipReportService.includedColumnOptions = this.form.value.columnOptionsList.filter(c => c.include)

    this.form.patchValue({ libraryCode, circDeskCode })

    // This print slip report has to generate inside the popup window.
    // See https://github.com/SydneyUniLibrary/print-slip-report/issues/28
    if (!this.printSlipReportService.open()) {
      console.warn('Your browser prevented the popup that has the report from appearing')
      this.alert.error('Your browser prevented the popup that has the report from appearing')
    }
  }


  private async  onPrintSlipReportComplete(event: PrintSlipReportCompleteEvent) {
    await this.saveOptions()
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
        // Unuathorised
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


  resetCircDeskCode(libraryCode: string) {
    libraryCode = libraryCode ?? this.libraryCodeControl.value.trim()
    let libConfig = this.configService.config?.libraryConfigs?.filter(x => x.libraryCode == libraryCode)
    let desk = libConfig ? libConfig[0]?.defaultCircDeskCode ?? 'DEFAULT_CIRC_DESK' : 'DEFAULT_CIRC_DESK'
    this.circDeskCodeControl.setValue(desk)
  }


  async resetOptions() {
    await this.configService.load()

    let lib = this.initData?.user?.currentlyAtLibCode ?? ''
    this.libraryCodeIsFromInitData = !!lib
    this.libraryCodeControl.setValue(lib)

    this.resetCircDeskCode(lib)

    let missingColumnDefinitions = new Map(COLUMNS_DEFINITIONS)   // Copy because we are going to mutate it
    let columnOptions: ColumnOption[] = [
      // Start with the columns in the order they are from the app configuration,
      ...(
        (this.configService.config?.columnDefaults ?? [])
        // ... minus any that aren't defined anymore
        .filter(c => missingColumnDefinitions.has(c.code))
        .map(c => {
          let name = missingColumnDefinitions.get(c.code).name
          missingColumnDefinitions.delete(c.code)
          return { ...c, name }
        })
      ),
      // Add any columns not in the app configuration, in the order they appear in the column definitions
      ...(
        Array.from(missingColumnDefinitions.values())
        .map(c => ({ code: c.code, name: c.name, include: false }))
      )
    ]
    this.columnOptionsListControl.setValue(columnOptions)
  }


  async restoreOptions() {
    await this.lastUsedOptionsService.load()
    if (!this.lastUsedOptionsService.hasOptions) {
      // If there are no options to restore, reset them
      return this.resetOptions()
    }

    await Promise.all([ this.configService.load(), this.getInitData() ])
    let options = this.lastUsedOptionsService.options

    let lib = options?.libraryCode ?? ''
    if (this.initData?.user?.currentlyAtLibCode) {
      this.libraryCodeIsFromInitData = true
      lib = this.initData.user.currentlyAtLibCode
    }
    this.libraryCodeControl.setValue(lib)

    let desk = options?.circDeskCode ?? ''
    if (lib && !desk) {
      this.resetCircDeskCode(lib)
    } else {
      this.circDeskCodeControl.setValue(desk)
    }

    let missingColumnDefinitions = new Map(COLUMNS_DEFINITIONS)   // Copy because we are going to mutate it
    let columnOptions: ColumnOption[] = [
      // Start with the columns in the order they are from the last used options,
      ...(
        (options?.columnOptions ?? [])
        // ... minus any that aren't defined anymore
        .filter(c => missingColumnDefinitions.has(c.code))
        .map(c => {
          let name = missingColumnDefinitions.get(c.code).name
          missingColumnDefinitions.delete(c.code)
          return { ...c, name }
        })
      ),
      // Add any columns not in the app configuration, in the order they appear in the column definitions
      ...(
        Array.from(missingColumnDefinitions.values())
        .map(c => ({ code: c.code, name: c.name, include: false }))
      )
    ]
    this.columnOptionsListControl.setValue(columnOptions)
  }


  async saveOptions() {
    this.lastUsedOptionsService.options = {
      libraryCode: this.libraryCodeControl.value,
      circDeskCode: this.circDeskCodeControl.value,
      columnOptions: this.columnOptionsListControl.value.map(c => ({ code: c.code, include: c.include })),
    }
    await this.lastUsedOptionsService.save()
  }

}
