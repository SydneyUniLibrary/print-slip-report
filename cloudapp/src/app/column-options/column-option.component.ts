import { Component, OnDestroy } from '@angular/core'
import { ControlValueAccessor, FormBuilder, NG_VALUE_ACCESSOR } from '@angular/forms'
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


  constructor(
    private fb: FormBuilder
  ) { }


  ngOnDestroy(): void {
    this.changeSubs.forEach(s => s.unsubscribe())
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
