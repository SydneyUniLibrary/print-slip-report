import { Component, OnDestroy } from '@angular/core'
import { ControlValueAccessor, FormArray, FormBuilder, NG_VALUE_ACCESSOR } from '@angular/forms'
import { Subscription } from 'rxjs'
import { map } from 'rxjs/operators'



export interface CircDeskCodeDefault {
  libraryCode: string
  defaultCircDeskCode: string
}


@Component({
  selector: 'app-circ-desk-code-defaults',
  templateUrl: './circ-desk-code-defaults.component.html',
  styleUrls: [ './circ-desk-code-defaults.component.scss' ],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      multi: true,
      useExisting: CircDeskCodeDefaultsComponent,
    },
  ],
})
export class CircDeskCodeDefaultsComponent implements ControlValueAccessor, OnDestroy {

  changeSubs: Subscription[] = []
  form = this.fb.group({
    list: this.fb.array([])
  })


  constructor(
    private fb: FormBuilder
  ) {}


  ngOnDestroy(): void {
    this.changeSubs.forEach(s => s.unsubscribe())
  }


  copyCircDeskCodeDefaults() {
    let l = this.form.value.list
    let v = l[0].defaultCircDeskCode
    this.form.setValue({
      list: l.map(x => ({ ...x, defaultCircDeskCode: v }))
    })
  }


  get firstLibraryCode(): string | undefined {
    let values = this.form.value.list
    return (values.length > 0) ? values[0].libraryCode : undefined
  }


  get listControl(): FormArray {
    return this.form.get('list') as FormArray
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


  get value(): CircDeskCodeDefault[] {
    return this.form.value.list
  }


  writeValue(value: CircDeskCodeDefault[]): void {
    if (value) {
      let controls = value.map(x => this.fb.group(x))
      this.form.setControl('list', this.fb.array(controls))
    }
  }

}
