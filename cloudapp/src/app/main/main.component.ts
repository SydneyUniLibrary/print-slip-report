import { Observable  } from 'rxjs';
import { finalize, tap } from 'rxjs/operators';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CloudAppRestService, CloudAppEventsService, Request, HttpMethod,
  Entity, RestErrorResponse, AlertService, RestResponse } from '@exlibris/exl-cloudapp-angular-lib';
import { MatRadioChange } from '@angular/material/radio';
import { FormArray, FormBuilder, FormControl, ValidationErrors, Validators } from '@angular/forms'

@Component({
  selector: 'app-main',
  templateUrl: './main.component.html',
  styleUrls: ['./main.component.scss']
})
export class MainComponent implements OnInit, OnDestroy {

  loading = false;
  selectedEntity: Entity;
  apiResult: any;
  columnNames = [
    'Title',
    'Location',
    'Call Number',
    'Author',
    'ISBN',
    'ISSN',
    'Publisher',
    'Publication Date',
    'Request Type',
    'Requested For',
    'Request ID',
    'Barcode',
    'Pickup Location',
    'Storage Location ID',
  ]

  form = this.formBuilder.group({
    libraryCode: [ 'LAW', Validators.required ],
    circDeskCode: [ 'DEFAULT_CIRC_DESK2', Validators.required ],
    columns: this.formBuilder.array(
      this.columnNames.map(n => this.formBuilder.control(true)),
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
  }

  ngOnDestroy(): void {
  }

  print() {
    this.loading = true
    const libraryCode = this.form.get('libraryCode').value
    const circDeskCode = this.form.get('circDeskCode').value
    this.restService.call({
      url: '/task-lists/requested-resources',
      method: HttpMethod.GET,
      queryParams: {
        library: libraryCode,
        circ_desk: circDeskCode,
      },
    }).subscribe({
      next: (resp: RestResponse) => {
        // TODO: Pop up and print the HTML report
        this.alert.warn('Print is not implemented yet', { autoClose: true })
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

  get columns(): FormArray {
    return this.form.get('columns') as FormArray
  }

  get columnsError(): String | null {
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

  get libraryCodeError(): String | null {
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

  get circDeskCodeError(): String | null {
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
    public parameter: String,
    public validOptions: String[],
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
