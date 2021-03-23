import { Component, OnInit } from '@angular/core'
import { FormControl, FormGroup, Validators } from '@angular/forms'
import {
  AlertService, CloudAppEventsService, CloudAppRestService, HttpMethod, InitData, RestErrorResponse,
} from '@exlibris/exl-cloudapp-angular-lib'
import { COLUMNS_DEFINITIONS } from '../column-definitions'
import { ColumnOption, ColumnOptionsListControl, ColumnOptionsListControlValidators } from '../column-options'
import { ConfigService } from '../config/config.service'
import { LastUsedOptionsService } from './last-used-options.service'
import { PrintSlipReportService } from './print-slip-report.service'



@Component({
  selector: 'app-main',
  templateUrl: './main.component.html',
  styleUrls: ['./main.component.scss'],
})
export class MainComponent implements OnInit {

  form = new FormGroup({
    libraryCode: new FormControl('', Validators.required),
    circDeskCode: new FormControl('', Validators.required),
    columnOptionsList: new ColumnOptionsListControl([], ColumnOptionsListControlValidators.atLeastOneInclude),
  })
  initData: InitData
  libraryCodeIsFromInitData: boolean = false
  loading = false
  ready = false


  constructor(
    private alert: AlertService,
    private configService: ConfigService,
    private eventsService: CloudAppEventsService,
    private lastUsedOptionsService: LastUsedOptionsService,
    private printSlipReportService: PrintSlipReportService,
    private restService: CloudAppRestService,
  ) { }


  async ngOnInit() {
    // Show the spinner if the component does not become ready quickly
    let timeoutId = setTimeout(() => { this.loading = !this.ready }, 1000)
    try {
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


  get columnOptionsListControl(): ColumnOptionsListControl {
    return this.form.get('columnOptionsList') as ColumnOptionsListControl
  }


  set columnOptionsListControl(v: ColumnOptionsListControl) {
    this.form.setControl('columnOptionsList', v)
  }


  get columnOptionsListError(): string | null {
    let errors = this.columnOptionsListControl.errors
    if ('atLeastOneInclude' in errors) {
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


  async onPrint() {
    this.alert.clear()
    this.loading = true
    // Open the popup window early to prevent it being blocked.
    // See https://github.com/SydneyUniLibrary/print-slip-report/issues/28
    let popupWindow = window.open('', 'PrintSlipReport', 'status=0')
    if (popupWindow) {
      popupWindow.document.write('<!HTML>')
      popupWindow.document.write('<head>')
      popupWindow.document.write(`
        <style>
          @import url("https://fonts.googleapis.com/css2?family=Roboto:wght@300&display=swap"); 
          table, th, td { border: 1px solid; border-collapse: collapse; } 
          table { font: 14px "Roboto", sans-serif; } 
          th, td { padding: 0.2rem; }
        </style>
      `)
      popupWindow.document.write('<body onload="window.print()">')
      popupWindow.document.write('<h1 id="please-wait">Please wait...</h1>')
    } else {
      console.warn('Your browser prevented the popup that has the report from appearing')
      this.alert.error('Your browser prevented the popup that has the report from appearing')
      this.loading = false
      return
    }
    const libraryCode = this.libraryCodeControl.value.trim()
    this.libraryCodeControl.setValue(libraryCode)
    const circDeskCode = this.circDeskCodeControl.value.trim()
    this.circDeskCodeControl.setValue(circDeskCode)
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
      popupWindow.close()
      console.error('REST API Error', err)
      const invalidParameterError = parseInvalidParameterError(err)
      if (invalidParameterError) {
        this.onInvalidParameterError(invalidParameterError)
      } else if (err?.status == 401) {
        // Unuathorised
        this.alert.error(
          'You are not authorised. Your Alma user needs a Circulation Desk Operator role'
          + ` for the library ${ libraryCode } and the circulation desk ${ circDeskCode }.`,
        )
      } else {
        let msg = err.message || 'See the console in your browser\'s developer tools for more information.'
        this.alert.error(`Something went wrong trying to get the requests from Alma. ${ msg }`)
      }
      this.loading = false
      return
    }
    await this.saveOptions()
    if (resp?.requested_resource) {
      try {
        this.generatePrint(resp.requested_resource, popupWindow)
      } catch (err) {
        console.error(err)
        popupWindow.close()
        this.alert.error(`Something went wrong. ${err}`)
      }
    } else {
      popupWindow.close()
      this.alert.info('There are no requested resources to print.')
    }
    this.loading = false
  }


  private onInvalidParameterError(invalidParameterError: InvalidParameterError): void {
    switch (invalidParameterError.parameter) {
      case 'library':
        this.libraryCodeControl.setErrors({ 'invalidCode': true })
        this.alert.info(
          `Valid library codes are ${ invalidParameterError.validOptions.join(', ') }`,
          { autoClose: false },
        )
        break
      case 'circ_desk':
        this.circDeskCodeControl.setErrors({ 'invalidCode': true })
        this.alert.info(
          `Valid circulation desk codes are ${ invalidParameterError.validOptions.join(', ') }`,
          { autoClose: false },
        )
        break
      default:
        this.alert.error(`The API parameter ${ invalidParameterError.parameter } was invalid`)
    }
  }


  onLibraryCodeChange() {
    if (!this.circDeskCodeControl.value) {
      this.resetCircDeskCode(this.libraryCodeControl.value.trim())
    }
  }


  generatePrint(requestedResources: any[], popupWindow: Window): void {
    let printSlipReport = this.printSlipReportService.newReport(this.columnOptionsListControl.value, requestedResources)
    popupWindow.document.write('<style> #please-wait { display: none } </style>')
    popupWindow.document.write(printSlipReport.html)
    popupWindow.document.close()
    this.alert.success('The report popped up in a new window')
  }


  async getInitData() {
    this.initData = await this.eventsService.getInitData().toPromise()
  }


  resetCircDeskCode(libraryCode: string) {
    libraryCode = libraryCode ?? this.libraryCodeControl.value.trim()
    let libConfig = this.configService.config?.libraryConfigs?.filter(x => x.libraryCode == libraryCode)
    let desk = libConfig ? libConfig[0]?.defaultCircDeskCode ?? 'DEFAULT_CIRC_DESK' : 'DEFAULT_CIRC_DESK'
    this.circDeskCodeControl.setValue(desk)
  }


  async resetOptions() {
    await Promise.all([ this.configService.load(), this.getInitData() ])

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
    this.columnOptionsListControl = new ColumnOptionsListControl(
      columnOptions, ColumnOptionsListControlValidators.atLeastOneInclude
    )
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
    this.columnOptionsListControl = new ColumnOptionsListControl(
      columnOptions, ColumnOptionsListControlValidators.atLeastOneInclude
    )
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


class InvalidParameterError {

  constructor(
    public parameter: string,
    public validOptions: string[],
  ) {}

}


function parseInvalidParameterError(restErrorResponse: RestErrorResponse): InvalidParameterError | null {
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
