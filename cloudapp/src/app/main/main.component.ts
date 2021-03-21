import { Observable } from 'rxjs';
import { finalize, tap } from 'rxjs/operators';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CloudAppRestService, CloudAppEventsService, Request, HttpMethod,
  Entity, RestErrorResponse, AlertService, CloudAppStoreService } from '@exlibris/exl-cloudapp-angular-lib';
import { MatRadioChange } from '@angular/material/radio';
import { FormArray, FormBuilder, FormControl, ValidationErrors, Validators } from '@angular/forms'
import { escape } from 'html-escaper'
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
  ) { }

  async ngOnInit() {
    await this.restoreOptions()
  }

  ngOnDestroy(): void {
  }

  async print() {
    this.loading = true
    // Open the popup window early to prevent it being blocked.
    // See https://github.com/SydneyUniLibrary/print-slip-report/issues/28
    let popupWindow = window.open('', 'PrintSlipReport', 'status=0')
    if (popupWindow) {
      popupWindow.document.write('<!HTML>')
      popupWindow.document.write('<body>')
      popupWindow.document.write('<h1 id="please-wait">Please wait...</h1>')
    } else {
      console.warn('Your browser prevented the popup that has the report from appearing')
      this.alert.error('Your browser prevented the popup that has the report from appearing')
      this.loading = false
      return
    }
    const libraryCode = this.form.get('libraryCode').value
    const circDeskCode = this.form.get('circDeskCode').value
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
        this.alert.info('There are no requested resources to print.')
      }
      this.loading = false
    } catch (err) {
      console.error("REST API Error", err)
      const invalidParameterError = parseInvalidParameterError(err)
      if (invalidParameterError) {
        this.onInvalidParameterError(invalidParameterError)
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
    popupWindow.document.write('<script>window.print()</script>')
    popupWindow.document.close()
    this.alert.success('The report popped up in a new window')
  }

  resetOptions() {
    // TODO: Restore the options from the app's configuration
    let checkboxValues = this.columnDefinitions.map(() => false)
    this.form.setValue({ libraryCode: '', circDeskCode: '', columns: checkboxValues })
  }

  async restoreOptions() {
    await this.lastUsedOptionsStorage.load()
    let options = this.lastUsedOptionsStorage.options
    // TODO: If options is null, restore the options from the app's configuration
    let lib = options?.libraryCode ?? ""
    let desk = options?.circDeskCode ?? ""
    // TODO: Reset this.columnDefinitions to align with what's in options.columnOptions
    let includeMap = new Map(
      options?.columnOptions?.map(x => [ x.code, x.include ])
      ?? this.columnDefinitions.map(c => [ c.code, false ])
    )
    let checkboxValues = this.columnDefinitions.map(c => includeMap.get(c.code) ?? false)
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
    const match = error[0].errorMessage?.match(/The parameter (\w+) is invalid\..*Valid options are: \[([^\]]*)]/)
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
    return flatten([
      '<table border="1">',
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


function flatten(a: any): string[] {
  // TypeScript doesn't have Array.prototype.flat declared for it so it hack get around it
  return a.flat(2)
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
      try {
        let blob = await this.storeService.get(this.storageKey).toPromise()
        this.options = this.deserialise(blob)
      } catch (err) {
        console.error('Failed to load last used options from storage', err)
        this.options = null
      }
    }
  }

  async save() {
    if (this.options) {
      await this.storeService.set(this.storageKey, this.serialize(this.options)).toPromise()
      // this.storeService.set(this.storageKey, this.serialize(options)).subscribe({
      //   next: () => console.debug('Saved last used options into storage'),
      //   error: err => console.error('Failed to save last used options into storage', err, options),
      // })
    } else {
      await this.storeService.remove(this.storageKey).toPromise()
      // this.storeService.remove(this.storageKey).subscribe({
      //   next: () => console.debug('Removed last used options from storage'),
      //   error: err => console.error('Failed to remove last used options from storage', err),
      // })
    }
  }

  protected deserialise(blob: string | null): PrintSlipReportOptions | null {
    if (blob) {
      try {
        return JSON.parse(blob) as PrintSlipReportOptions
      } catch (e) {
        console.error('Failed to restore last used options from storage', e, blob)
      }
    }
    return null
  }

  protected serialize(options: PrintSlipReportOptions): string {
    return JSON.stringify(options)
  }

}
