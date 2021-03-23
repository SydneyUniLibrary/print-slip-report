import { Observable } from 'rxjs';
import { finalize, tap } from 'rxjs/operators';
import { Component, OnInit, OnDestroy } from '@angular/core';
import {
  CloudAppRestService, CloudAppEventsService, Request, HttpMethod,
  Entity, RestErrorResponse, AlertService, CloudAppStoreService, InitData,
} from '@exlibris/exl-cloudapp-angular-lib'
import { MatRadioChange } from '@angular/material/radio';
import { FormArray, FormBuilder, FormControl, ValidationErrors, Validators } from '@angular/forms'
import { escape } from 'html-escaper'
import { ConfigService } from '../config/config.service'
import { ColumnDefinition, COLUMNS_DEFINITIONS } from '../column-definitions'


@Component({
  selector: 'app-main',
  templateUrl: './main.component.html',
  styleUrls: ['./main.component.scss']
})
export class MainComponent implements OnInit, OnDestroy {

  loading = false;
  selectedEntity: Entity;
  apiResult: any;
  columnDefinitions = COLUMNS_DEFINITIONS
  lastUsedOptionsStorage = new LastUsedOptionsStorage(this.storeService)
  ready = false
  initData: InitData
  libraryCodeIsFromInitData: boolean = false

  form = this.formBuilder.group({
    libraryCode: [ '', Validators.required ],
    circDeskCode: [ '', Validators.required ],
    columns: this.formBuilder.array(
      this.columnDefinitions.map(() => this.formBuilder.control(false)),
      atLeastOneIsSelected),
  })

  entities$: Observable<Entity[]> = this.eventsService.entities$
  .pipe(tap(() => this.clear()))

  constructor(
    private restService: CloudAppRestService,
    private eventsService: CloudAppEventsService,
    private alert: AlertService,
    private formBuilder: FormBuilder,
    private storeService: CloudAppStoreService,
    private configService: ConfigService,
  ) { }

  async ngOnInit() {
    await this.restoreOptions()
    this.ready = true
  }

  ngOnDestroy(): void {
  }

  async print() {
    this.alert.clear()
    this.loading = true
    // Open the popup window early to prevent it being blocked.
    // See https://github.com/SydneyUniLibrary/print-slip-report/issues/28
    let popupWindow = window.open('', 'PrintSlipReport', 'status=0')
    if (popupWindow) {
      popupWindow.document.write('<!HTML>')
      popupWindow.document.write('<head><style>@import url("https://fonts.googleapis.com/css2?family=Roboto:wght@300&display=swap"); table, th, td { border: 1px solid; border-collapse: collapse; } table { font: 14px "Roboto", sans-serif; } th, td { padding: 0.2rem; }</style></head>')
      popupWindow.document.write('<body onload="window.print()">')
      popupWindow.document.write('<h1 id="please-wait">Please wait...</h1>')
    } else {
      console.warn('Your browser prevented the popup that has the report from appearing')
      this.alert.error('Your browser prevented the popup that has the report from appearing')
      this.loading = false
      return
    }
    const libraryCode = this.libraryCode.value.trim()
    this.libraryCode.setValue(libraryCode)
    const circDeskCode = this.circDeskCode.value.trim()
    this.circDeskCode.setValue(circDeskCode)
    try {
      let resp = await (
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
      await this.saveOptions()
      if (resp?.requested_resource) {
        this.generatePrint(resp.requested_resource, popupWindow)
      } else {
        popupWindow.close()
        this.alert.info('There are no requested resources to print.')
      }
      this.loading = false
    } catch (err) {
      popupWindow.close()
      console.error("REST API Error", err)
      const invalidParameterError = parseInvalidParameterError(err)
      if (invalidParameterError) {
        this.onInvalidParameterError(invalidParameterError)
      } else if (err?.status == 401) {
        // Unuathorised
        this.alert.error(
          'You are not authorised. Your Alma user needs a Circulation Desk Operator role'
          + ` for the library ${libraryCode} and the circulation desk ${circDeskCode}.`
        )
      } else {
        let msg = err.message || "See the console in your browser's developer tools for more information."
        this.alert.error(`Something went wrong trying to get the requests from Alma. ${msg}`)
      }
      this.loading = false
    }
  }

  private onInvalidParameterError(invalidParameterError: InvalidParameterError): void {
    switch (invalidParameterError.parameter) {
      case 'library':
        this.libraryCode.setErrors({ 'invalidCode': true })
        this.alert.info(
          `Valid library codes are ${invalidParameterError.validOptions.join(', ')}`,
          { autoClose: false }
        )
        break
      case 'circ_desk':
        this.circDeskCode.setErrors({ 'invalidCode': true })
        this.alert.info(
          `Valid circulation desk codes are ${invalidParameterError.validOptions.join(', ')}`,
          { autoClose: false }
        )
        break
      default:
        this.alert.error(`The API parameter ${invalidParameterError.parameter} was invalid`)
    }
  }

  generatePrint(requestedResources: any[], popupWindow: Window): void {
    let checkboxValues = this.columns.value
    let selectedColumns = this.columnDefinitions.filter((_, i) => checkboxValues[i])
    let mappedRequestedResources = requestedResources.map(x => mapColumns(selectedColumns, x))
    let generatedReport = new ReportGenerator(selectedColumns.map(x => x.name), mappedRequestedResources).generate()
    popupWindow.document.write('<style>#please-wait { display: none }</style>')
    popupWindow.document.write(generatedReport)
    popupWindow.document.close()
    this.alert.success('The report popped up in a new window')
  }

  onLibraryCodeChange() {
    if (!this.circDeskCode.value) {
      this.resetCircDeskCode(this.libraryCode.value.trim())
    }
  }

  resetCircDeskCode(libraryCode: string) {
    libraryCode = libraryCode ?? this.libraryCode.value.trim()
    let libConfig = this.configService.config?.libraryConfigs?.filter(x => x.libraryCode == libraryCode)
    let desk = libConfig ? libConfig[0]?.defaultCircDeskCode ?? 'DEFAULT_CIRC_DESK' : 'DEFAULT_CIRC_DESK'
    this.circDeskCode.setValue(desk)
    return desk
  }

  async resetOptions() {
    await this.configService.load()
    let config = this.configService.config
    let includeMap = new Map(flatten1([
      this.columnDefinitions.map(c => [ c.code, false ]),
      config?.columnDefaults?.filter(x => x.include !== undefined).map(x => [ x.code, x.include ]) ?? [],
    ]))
    let checkboxValues = this.columnDefinitions.map(c => includeMap.get(c.code) ?? false)
    let lib = this.libraryCodeIsFromInitData ? this.libraryCode.value : '';
    this.resetCircDeskCode(lib)
    this.form.patchValue({ libraryCode: lib, columns: checkboxValues })
  }

  async restoreOptions() {
    await Promise.all([ this.lastUsedOptionsStorage.load(), this.configService.load(), this.getInitData() ])
    let options = this.lastUsedOptionsStorage.options
    let config = this.configService.config
    let lib = options?.libraryCode ?? ''
    let desk = options?.circDeskCode ?? ''
    if (this.initData?.user?.currentlyAtLibCode) {
      this.libraryCodeIsFromInitData = true
      lib = this.initData?.user?.currentlyAtLibCode
    }
    if (lib && !desk) {
      desk = this.resetCircDeskCode(lib)
    }
    // TODO: Reset this.columnDefinitions to align with what's in options.columnOptions
    let includeMap = new Map(flatten1([
      this.columnDefinitions.map(c => [ c.code, false ]),
      config?.columnDefaults?.filter(x => x.include !== undefined).map(x => [ x.code, x.include ]) ?? [],
      options?.columnOptions?.filter(x => x.include !== undefined).map(x => [ x.code, x.include ]) ?? [],
    ]))
    let checkboxValues = this.columnDefinitions.map(c => includeMap.get(c.code))
    this.form.setValue({ libraryCode: lib, circDeskCode: desk, columns: checkboxValues })
  }

  async saveOptions() {
    let checkboxValues = this.columns.value
    this.lastUsedOptionsStorage.options = {
      libraryCode: this.libraryCode.value,
      circDeskCode: this.circDeskCode.value,
      columnOptions: this.columnDefinitions.map(
        (c, i) => ({ code: c.code, include: checkboxValues[i] })
      )
    }
    await this.lastUsedOptionsStorage.save()
  }

  async getInitData() {
    this.initData = await this.eventsService.getInitData().toPromise()
  }

  get columns(): FormArray {
    return this.form.get('columns') as FormArray
  }

  get columnsError(): string | null {
    let errors = this.columns.errors
    if ('atLeastOneIsSelected' in errors) {
      return 'Select at least 1 column to include in the print'
    } else {
      return null
    }
  }

  get libraryCode(): FormControl {
    return this.form.get('libraryCode') as FormControl
  }

  get libraryCodeError(): string | null {
    let errors = this.libraryCode.errors
    if (errors?.required) {
      return 'You need to enter a library code'
    } else if (errors?.invalidCode) {
      return 'This is not a valid library code'
    } else {
      return null
    }
  }

  get circDeskCode(): FormControl {
    return this.form.get('circDeskCode') as FormControl
  }

  get circDeskCodeError(): string | null {
    let errors = this.circDeskCode.errors
    if (errors?.required) {
      return 'You need to enter a circulation desk code'
    } else if (errors?.invalidCode) {
      return 'This is not a valid circulation desk code'
    } else {
      return null
    }
  }

  entitySelected(event: MatRadioChange) {
    const value = event.value as Entity;
    this.loading = true;
    this.restService.call<any>(value.link)
    .pipe(finalize(()=>this.loading=false))
    .subscribe(
      result => this.apiResult = result,
      error => this.alert.error('Failed to retrieve entity: ' + error.message)
    );
  }

  clear() {
    this.apiResult = null;
    this.selectedEntity = null;
  }

  update(value: any) {
    const requestBody = this.tryParseJson(value)
    if (!requestBody) return this.alert.error('Failed to parse json');

    this.loading = true;
    let request: Request = {
      url: this.selectedEntity.link,
      method: HttpMethod.PUT,
      requestBody
    };
    this.restService.call(request)
    .pipe(finalize(()=>this.loading=false))
    .subscribe({
      next: result => {
        this.apiResult = result;
        this.eventsService.refreshPage().subscribe(
          ()=>this.alert.success('Success!')
        );
      },
      error: (e: RestErrorResponse) => {
        this.alert.error('Failed to update data: ' + e.message);
        console.error(e);
      }
    });
  }

  private tryParseJson(value: any) {
    try {
      return JSON.parse(value);
    } catch (e) {
      console.error(e);
    }
    return undefined;
  }

}


function atLeastOneIsSelected(formArray: FormArray): ValidationErrors | null {
  return (
    (!formArray.controls.some(c => c.value))
    ? { 'atLeastOneIsSelected': true }
    : null
  )
}


class InvalidParameterError {

  constructor(
    public parameter: string,
    public validOptions: string[],
  ) {}

}


function parseInvalidParameterError(restErrorResponse: RestErrorResponse): InvalidParameterError | null {
  const error = restErrorResponse?.error?.errorList?.error?.filter(e => e?.errorCode == "40166410")
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


function mapColumns(selectedColumns: ColumnDefinition[], requestedResource: any): string[] {
  return selectedColumns.map(col => {
    try {
      return col.mapFn(requestedResource)
    } catch (e) {
      console.error(`Failed to mapped column ${col.name} for `, requestedResource)
      return undefined
    }
  })
}


class ReportGenerator {

  constructor(
    private columnNames: string[],
    private values: string[][]
  ) { }

  generate(): string {
    return flatten2([
      '<table>',
      this.thead(),
      '<tbody>',
      this.values.map(r => this.tr(r)),
      '</table>'
    ]).join('\n')
  }

  private thead(): string[] {
    let thList = this.columnNames.map(x => `<th>${this.t(x)}`)
    return [ '<thead>', '<tr>', ...thList ]
  }

  private tr(row: string[]): string[] {
    let tdList = row.map(x => `<td>${this.t(x)}`)
    return [ '<tr>', ...tdList ]
  }

  private t(value: string): string {
    return value ? escape(value.toString()) : ''
  }

}


function flatten1<T>(a: (T | T[])[]): T[] {
  // TypeScript doesn't have Array.prototype.flat declared for it so it hack get around it
  return (a as any).flat(1)
}

function flatten2<T>(a: (T | T[] | T[][])[]): T[] {
  // TypeScript doesn't have Array.prototype.flat declared for it so it hack get around it
  return (a as any).flat(2)
}


type PrintSlipReportOptions = {
  libraryCode: string
  circDeskCode: string
  columnOptions: PrintSlipReportColumnOption[]
}

type PrintSlipReportColumnOption = {
  code: string
  include: boolean
}


class LastUsedOptionsStorage {

  options: PrintSlipReportOptions | null = null
  loaded = false

  constructor(
    private storeService: CloudAppStoreService,
    public storageKey: string = 'last-used-options'
  ) { }

  async load() {
    if (!this.loaded) {
      this.options = {
        libraryCode: '',
        circDeskCode: '',
        columnOptions: [],
      }
      try {
        let loadedOptions = await this.storeService.get(this.storageKey).toPromise()
        this.options = { ...this.options, ...loadedOptions }
      } catch (err) {
        console.warn('Failed to load last used options from storage', err)
      }
    }
  }

  async save() {
    if (this.options) {
      await this.storeService.set(this.storageKey, this.options).toPromise()
    } else {
      await this.storeService.remove(this.storageKey).toPromise()
    }
  }

}
