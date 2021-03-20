import { Observable  } from 'rxjs';
import { finalize, tap } from 'rxjs/operators';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CloudAppRestService, CloudAppEventsService, Request, HttpMethod,
  Entity, RestErrorResponse, AlertService, RestResponse } from '@exlibris/exl-cloudapp-angular-lib';
import { MatRadioChange } from '@angular/material/radio';
import { FormArray, FormBuilder, FormControl, ValidationErrors, Validators } from '@angular/forms'
import { escape } from 'html-escaper'


class ColumnDefinition {

  constructor(
    public code: string,
    public name: string,
    public mapFn: (requestedResource: any) => string
  ) {}

}


const COLUMNS_DEFINITIONS = [
  new ColumnDefinition('title', 'Title', x => x?.resource_metadata?.title),
  new ColumnDefinition('location','Location', x => x?.location?.shelving_location),
  new ColumnDefinition('call-number', 'Call Number', x => x?.location?.call_number),
  new ColumnDefinition('author', 'Author', x => x?.resource_metadata?.author),
  new ColumnDefinition('isbn', 'ISBN', x => x?.resource_metadata?.isbn),
  new ColumnDefinition('issn', 'ISSN', x => x?.resource_metadata?.issn),
  new ColumnDefinition('publisher', 'Publisher', x => x?.resource_metadata?.publisher),
  new ColumnDefinition('publication-date', 'Publication Date', x => x?.resource_metadata?.publication_year),
  new ColumnDefinition('request-type', 'Request Type', x => x?.request?.[0]?.request_sub_type?.desc),
  new ColumnDefinition('requested-for', 'Requested For', x => x?.request?.[0]?.requester?.desc),
  new ColumnDefinition('request-id', 'Request ID', x => x?.request?.[0]?.id),
  new ColumnDefinition('barcode', 'Barcode', x => x?.location?.copy?.[0]?.barcode),
  new ColumnDefinition('pickup-location', 'Pickup Location', x => x?.request?.[0]?.destination?.desc),
  new ColumnDefinition('item-call-number', 'Item Call Number', x => x?.location?.copy?.[0]?.alternative_call_number),
  new ColumnDefinition('request-note', 'Request Note', x => x?.request?.[0]?.comment),
  new ColumnDefinition('storage-location-id', 'Storage Location ID', x => x?.location?.copy?.[0]?.storage_location_id),
]


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
  lastUsedOptionsStorage = new LastUsedOptionsStorage()

  form = this.formBuilder.group({
    libraryCode: [ '', Validators.required ],
    circDeskCode: [ '', Validators.required ],
    columns: this.formBuilder.array(
      this.columnDefinitions.map(_ => this.formBuilder.control(false)),
      atLeastOneIsSelected,
    ),
  })

  entities$: Observable<Entity[]> = this.eventsService.entities$
  .pipe(tap(() => this.clear()))

  constructor(
    private restService: CloudAppRestService,
    private eventsService: CloudAppEventsService,
    private alert: AlertService,
    private formBuilder: FormBuilder,
  ) { }

  ngOnInit() {
    if (!this.lastUsedOptionsStorage.isAvailable) {
      this.alert.warn(
        "Your browser is preventing your options below from being saved.",
        { autoClose: true }
      )
    }
  }

  ngOnDestroy(): void {
  }

  print() {
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
    this.restService.call({
      url: '/task-lists/requested-resources',
      method: HttpMethod.GET,
      queryParams: {
        library: libraryCode,
        circ_desk: circDeskCode,
        limit: 100, // TODO: Handle more than 100 requested resources
      },
    }).subscribe({
      next: resp => {
        this.saveOptions()
        if (resp?.requested_resource) {
          this.generatePrint(resp.requested_resource, popupWindow)
        } else {
          this.alert.info('There are no requested resources to print.')
        }
        this.loading = false
      },
      error: (err: RestErrorResponse) => {
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
    })
  }

  private onInvalidParameterError(invalidParameterError: InvalidParameterError): void {
    let msg: string
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

  saveOptions(): void {
    let checkboxValues = this.columns.value
    this.lastUsedOptionsStorage.lastUsed = {
      libraryCode: this.libraryCode.value,
      circDeskCode: this.circDeskCode.value,
      columnOptions: this.columnDefinitions.map(
        (c, i) => ({ code: c.code, include: checkboxValues[i] })
      )
    }
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

  isAvailable = LastUsedOptionsStorage.isLocalStorageAvailable()

  static isLocalStorageAvailable(): boolean {
    // Copied from https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API/Using_the_Web_Storage_API
    let storage
    try {
      storage = window['localStorage']
      let x = '__storage_test__'
      storage.setItem(x, x)
      storage.removeItem(x)
      return true
    } catch (e) {
      return (
        e instanceof DOMException
        && (
          e.code === 22 // everything except Firefox
          || e.code === 1014 // Firefox
          || e.name === 'QuotaExceededError' // test name field too, because code might not be present in everything except Firefox
          || e.name === 'NS_ERROR_DOM_QUOTA_REACHED' // Firefox
        )
        && (storage && storage.length !== 0) // acknowledge QuotaExceededError only if there's something already stored
      )
    }
  }

  constructor(
    public storage_key: string = 'au.edu.sydney.library.print-slip-report.last-used-options'
  ) { }

  set lastUsed(options: PrintSlipReportOptions) {
    try {
      window.localStorage.setItem(this.storage_key, this.serialize(options))
    } catch (e) {
      console.error('Failed to save last used options into storage', e, options)
}
  }

  protected serialize(options: PrintSlipReportOptions): string {
    return JSON.stringify(options)
  }

}
