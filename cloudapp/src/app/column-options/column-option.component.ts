import { Component, OnDestroy, ViewChild } from '@angular/core'
import { ControlValueAccessor, FormBuilder, NG_VALUE_ACCESSOR } from '@angular/forms'
import { MatListOption, MatSelectionListChange } from '@angular/material/list'
import { Subscription } from 'rxjs'
import { ColumnOption } from './column-option'



@Component({
  selector: 'app-column-option',
  templateUrl: './column-option.component.html',
  styleUrls: [ './column-option.component.scss' ],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      multi: true,
      useExisting: ColumnOptionComponent,
    },
  ],
})
export class ColumnOptionComponent implements ControlValueAccessor, OnDestroy {

  changeSubs: Subscription[] = []
  form = this.fb.group({
    code: '',
    name: '',
    include: '',
  })
  selectionChangeSubs: Subscription[] = []


  constructor(
    private fb: FormBuilder
  ) { }


  ngOnDestroy(): void {
    this.changeSubs.forEach(s => s.unsubscribe())
    this.selectionChangeSubs.forEach(s => s.unsubscribe())
  }


  get code(): string {
    return this.form.value.code
  }


  get disabled(): boolean {
    return this.form.disabled
  }


  get include(): boolean {
    return this.form.value.include
  }

  set include(v: boolean) {
    this.form.patchValue({ include: v })
  }


  @ViewChild('listOption')
  set listOption(matListOption: MatListOption) {
    // MatListOption doesn't have an output the tell us when it's checkbox changes.
    // Instead we have to list to selectionChange on the parent selection list
    // and then determine if it was this MatListOption which changed or another in the list.
    this.selectionChangeSubs.push(
      matListOption.selectionList.selectionChange.subscribe(
        (matSelectionListChange: MatSelectionListChange) => {
          if (Object.is(matSelectionListChange.option, matListOption)) {
            this.include = matListOption.selected
          }
        }
      )
    )
  }


  get name(): string {
    return this.form.value.name
  }


  onTouched: Function = () => {}


  registerOnChange(onChange: any): void {
    this.changeSubs.push(
      this.form.valueChanges.subscribe(onChange)
    )
  }


  registerOnTouched(fn: Function): void {
    this.onTouched = fn
  }


  setDisabledState(isDisabled: boolean): void {
    if (isDisabled) {
      this.form.disable()
    } else {
      this.form.enable()
    }
  }


  get value(): ColumnOption {
    return this.form.value
  }


  writeValue(value: ColumnOption): void {
    if (value) {
      this.form.setValue(value, { emitEvent: false })
    }
  }

}
