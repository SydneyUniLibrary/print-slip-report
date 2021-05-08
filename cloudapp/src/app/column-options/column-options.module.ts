import { CommonModule } from '@angular/common'
import { NgModule } from '@angular/core'
import { FormsModule, ReactiveFormsModule } from '@angular/forms'
import { MaterialModule } from '@exlibris/exl-cloudapp-angular-lib'
import { ColumnOptionComponent } from './column-option.component'
import { ColumnOptionsListComponent } from './column-options-list.component'



@NgModule({
  declarations: [
    ColumnOptionComponent,
    ColumnOptionsListComponent,
  ],
  imports: [
    CommonModule,
    MaterialModule,
    FormsModule,
    ReactiveFormsModule,
  ],
  exports: [
    ColumnOptionComponent,
    ColumnOptionsListComponent,
  ]
})
export class ColumnOptionsModule { }
