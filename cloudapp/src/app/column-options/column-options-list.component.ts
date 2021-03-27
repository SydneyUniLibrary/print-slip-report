import { Component, OnDestroy } from '@angular/core'
import {
  ControlValueAccessor, FormArray, FormBuilder, NG_VALIDATORS, NG_VALUE_ACCESSOR, RequiredValidator, ValidationErrors,
} from '@angular/forms'
import { Subscription } from 'rxjs'
import { map } from 'rxjs/operators'
import { ColumnOption } from './column-option'



@Component({
  selector: 'app-column-options-list',
  templateUrl: './column-options-list.component.html',
  styleUrls: [ './column-options-list.component.scss' ],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      multi: true,
      useExisting: ColumnOptionsListComponent,
    },
    {
      provide: NG_VALIDATORS,
      multi: true,
      useExisting: ColumnOptionsListComponent,
    },
  ],
})
export class ColumnOptionsListComponent extends RequiredValidator implements ControlValueAccessor, OnDestroy {

  changeSubs: Subscription[] = []
  form = this.fb.group({
    list: this.fb.array([])
  })


  constructor(
    private fb: FormBuilder
  ) {
    super()
  }


  ngOnDestroy(): void {
    this.changeSubs.forEach(s => s.unsubscribe())
  }


  get disabled(): boolean {
    return this.form.disabled
  }


  get listControl(): FormArray {
    return this.form.get('list') as FormArray
  }


  onDropDropListDropped(event) {
    let v = [ ...this.value ]
    let col = v[event.previousIndex]
    v.splice(event.previousIndex, 1)
    v.splice(event.currentIndex, 0, col)
    this.writeValue(v)
  }


  onTouched: Function = () => {}


  onValidatorChange: Function = () => {}


  registerOnChange(onChange: any): void {
    this.changeSubs.push(
      this.form.valueChanges.pipe(
        map(x => x?.list)
      ).subscribe(onChange)
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


  validate(control: { value: ColumnOption[] }): ValidationErrors | null {
    return (
      (this.required && !control.value.some(x => x.include))
      ? { 'required': true }
      : null
    )
  }


  get value(): ColumnOption[] {
    return this.form.value.list
  }


  writeValue(value: ColumnOption[]): void {
    if (value) {
      this.form.setControl('list', this.fb.array(value))
    }
  }

}
