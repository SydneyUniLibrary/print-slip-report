import { Component, OnInit } from '@angular/core'
import { FormControl, FormGroup, Validators } from '@angular/forms'
import { AlertService, CloudAppEventsService, InitData } from '@exlibris/exl-cloudapp-angular-lib'
import { COLUMNS_DEFINITIONS } from '../column-definitions'
import { ColumnOption, ColumnOptionsListControl, ColumnOptionsListControlValidators } from '../column-options'
import { ConfigService } from '../config/config.service'
import { LastUsedOptionsService } from './last-used-options.service'
import { PrintSlipReport, PrintSlipReportService } from './print-slip-report.service'
import { InvalidParameterError, RequestedResource, RequestedResourcesService } from './requested-resources.service'



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
  popupWindow?: PopupWindow
  ready = false


  constructor(
    private alert: AlertService,
    private configService: ConfigService,
    private eventsService: CloudAppEventsService,
    private lastUsedOptionsService: LastUsedOptionsService,
    private printSlipReportService: PrintSlipReportService,
    private requestedResourcesService: RequestedResourcesService,
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


  onLibraryCodeChange() {
    if (!this.circDeskCodeControl.value) {
      this.resetCircDeskCode(this.libraryCodeControl.value.trim())
    }
  }


  async onPrint() {
    this.alert.clear()
    this.loading = true
    let generated = false
    try {

      const libraryCode = this.libraryCodeControl.value.trim()
      this.libraryCodeControl.setValue(libraryCode)
      const circDeskCode = this.circDeskCodeControl.value.trim()
      this.circDeskCodeControl.setValue(circDeskCode)

      // Open the popup window early to prevent it from being blocked.
      // See https://github.com/SydneyUniLibrary/print-slip-report/issues/28
      this.popupWindow = new PopupWindow()
      if (!this.popupWindow.isOpen) {
        console.warn('Your browser prevented the popup that has the report from appearing')
        this.alert.error('Your browser prevented the popup that has the report from appearing')
        return
      }

      let requestedResources: RequestedResource[]
      try {
        requestedResources = await this.requestedResourcesService.get(libraryCode, circDeskCode)
      } catch (err) {
        console.error('REST API Error', err)
        if (err?.parameter) {
          this.handleInvalidParameterError(err)
        } else if (err?.status == 401) {
          // Unuathorised
          this.alert.error(
            'You are not authorised. Your Alma user needs a Circulation Desk Operator role'
            + ` for the library ${ libraryCode } and the circulation desk ${ circDeskCode }.`,
          )
        } else {
          let msg = err.message || "See the console in your browser's developer tools for more information."
          this.alert.error(`Something went wrong trying to get the requests. ${ msg }`)
        }
        return
      }

      await this.saveOptions()

      if (requestedResources.length == 0) {
        this.alert.info('There are no requested resources to print.', { autoClose: false })
      } else {
        try {
          let printSlipReport = this.printSlipReportService.newReport(
            this.columnOptionsListControl.value, requestedResources
          )
          this.popupWindow.print(printSlipReport)
          this.alert.success('The report popped up in a new window')
          generated = true
        } catch (err) {
          console.error(err)
          this.alert.error(`Something went wrong. ${err}`)
        }
      }

    } finally {
      this.loading = false
      if (!generated) {
        this.popupWindow.close()
      }
      this.popupWindow = undefined
    }
  }


  private handleInvalidParameterError(invalidParameterError: InvalidParameterError): void {
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


class PopupWindow {

  isOpen: boolean
  private readonly wnd: Window

  constructor() {
    this.wnd = window.open('', '', 'status=0')
    this.isOpen = !!this.wnd
    if (this.isOpen) {
      this.wnd.document.write('<!HTML>')
      this.wnd.document.write('<head>')
      this.wnd.document.write(`
        <style>
          @import url("https://fonts.googleapis.com/css2?family=Roboto:wght@300&display=swap"); 
          table, th, td { border: 1px solid; border-collapse: collapse; } 
          table { font: 14px "Roboto", sans-serif; } 
          th, td { padding: 0.2rem; }
          h1 { font: 24pt "Roboto", sans-serif; font-weight: bolder; }
        </style>
      `)
      this.wnd.document.write('<body onload="window.print()">')
      this.wnd.document.write('<h1 id="please-wait">Please wait...</h1>')
    }
  }

  close() {
    if (this.isOpen) {
      this.wnd.close()
      this.isOpen = false
    }
  }

  print(printSlipReport: PrintSlipReport) {
    this.wnd.document.write('<style> #please-wait { display: none } </style>')
    this.wnd.document.write(printSlipReport.html)
    this.wnd.document.close()
  }

}
