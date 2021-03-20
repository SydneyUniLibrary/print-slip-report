import { Observable  } from 'rxjs';
import { finalize, tap } from 'rxjs/operators';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CloudAppRestService, CloudAppEventsService, Request, HttpMethod,
  Entity, RestErrorResponse, AlertService } from '@exlibris/exl-cloudapp-angular-lib';
import { MatRadioChange } from '@angular/material/radio';
import { FormBuilder } from '@angular/forms'

@Component({
  selector: 'app-main',
  templateUrl: './main.component.html',
  styleUrls: ['./main.component.scss']
})
export class MainComponent implements OnInit, OnDestroy {

  loading = false;
  selectedEntity: Entity;
  apiResult: any;

  form = this.formBuilder.group({
    libraryCode: '',
    circDeskCode: '',
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
    console.dir(this.form.value)
    this.alert.warn('Print is not implemented yet', { autoClose: true })
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
