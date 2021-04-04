import { Component, Input, OnDestroy, ViewChild } from '@angular/core'
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

  @Input() alwaysShowChips = false
  changeSubs: Subscription[] = []
  expanded = false
  form = this.fb.group({
    code: '',
    name: '',
    include: '',
    limit: 0,
    hiddenInApp: false,
  })
  selectionChangeSubs: Subscription[] = []


  constructor(
    private fb: FormBuilder
  ) { }


  ngOnDestroy(): void {
    this.changeSubs.forEach(s => s.unsubscribe())
    this.selectionChangeSubs.forEach(s => s.unsubscribe())
  }


  get chips(): string[] {
    let c: string[] = [ ]
    if (this.hiddenInApp) {
      c.push('hidden in app')
    }
    if ((this.alwaysShowChips || this.include) && this.limit) {
      c.push(`limit to ${this.limit}`)
    }
    return c
  }


  get code(): string {
    return this.value.code
  }


  get disabled(): boolean {
    return this.form.disabled
  }


  get hiddenInApp(): boolean {
    return this.value.hiddenInApp
  }

  set hiddenInApp(v: boolean) {
    this.form.patchValue({ 'hiddenInApp': v })
  }


  get include(): boolean {
    return this.value.include
  }

  set include(v: boolean) {
    this.form.patchValue({ include: v })
  }


  get limit(): number | undefined {
    let v = this.value.limit
    v = v || undefined          // Prefer undefined to 0 or NaN
    return v
  }

  set limit(v: number | undefined) {
    v = Math.abs(v) % 1000      // Keep the limit between 0 and 999
    v = v || 0                  // Prefer 0 to undefined or NaN
    this.form.patchValue({ limit: v })
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
            let selected = matListOption.selected
            this.include = selected
            this.hiddenInApp = selected ? false : this.hiddenInApp
          }
        }
      )
    )
  }


  get name(): string {
    return this.value.name
  }


  onBooleanOptionsChanged(value: string, selected: boolean) {
    this.form.patchValue({ [value]: selected })
    if (value == 'hiddenInApp' && selected) {
      this.include = false
    }
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
    this.form.patchValue(value, { emitEvent: false })
  }

}
