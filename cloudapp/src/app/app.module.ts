import { NgModule } from '@angular/core';
import { HttpClientModule } from '@angular/common/http';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MAT_FORM_FIELD_DEFAULT_OPTIONS } from '@angular/material/form-field';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MaterialModule, getTranslateModule, AlertModule } from '@exlibris/exl-cloudapp-angular-lib';

import { AppComponent } from './app.component';
import { AppRoutingModule } from './app-routing.module';
import { CircDeskCodeDefaultsComponent } from './config/circ-desk-code-defaults.component'
import { ColumnOptionComponent } from './column-options/column-option.component';
import { ColumnOptionsListComponent } from './column-options/column-options-list.component';
import { ConfigComponent } from './config/config.component';
import { DownloadExcelSlipReportComponent } from './download-excel-slip-report/download-excel-slip-report.component'
import { MainComponent } from './main/main.component';
import { PrintSlipReportComponent } from './print-slip-report/print-slip-report.component';
import { SlipReportProgressComponent } from './slip-report/progress.component';



@NgModule({
  declarations: [
    AppComponent,
    CircDeskCodeDefaultsComponent,
    ColumnOptionComponent,
    ColumnOptionsListComponent,
    ConfigComponent,
    DownloadExcelSlipReportComponent,
    MainComponent,
    PrintSlipReportComponent,
    SlipReportProgressComponent,
  ],
  imports: [
    MaterialModule,
    BrowserModule,
    BrowserAnimationsModule,
    AppRoutingModule,
    HttpClientModule,
    AlertModule,
    FormsModule,
    ReactiveFormsModule,
    getTranslateModule(),
  ],
  providers: [
    { provide: MAT_FORM_FIELD_DEFAULT_OPTIONS, useValue: { appearance: 'standard' } },
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
