import { Component, Input, OnDestroy, OnInit } from '@angular/core'
import {
  AbstractControl, ControlValueAccessor, FormArray, FormBuilder, FormControl, NG_VALIDATORS, NG_VALUE_ACCESSOR,
  RequiredValidator,
  ValidationErrors,
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
export class ColumnOptionsListComponent extends RequiredValidator implements ControlValueAccessor, OnDestroy, OnInit {

  @Input() alwaysShowChips = false
  @Input() alwaysShowHidden = false
  changeSubs: Subscription[] = []
  form = this.fb.group({
    list: this.fb.array([])
  })
  hadHidden = false
  highlightShowHiddenButton = false
  showingHidden = false
  usedShowHiddenButton = false


  constructor(
    private fb: FormBuilder
  ) {
    super()
  }


  ngOnInit() {
    this.registerOnChange(() => {
      if (this.showingHidden && !this.hasHidden) {
        this.showingHidden = false
      } else if (!this.showingHidden && !this.hadHidden && this.hasHidden) {
        this.highlightShowHiddenButton = true
      }
    })
  }


  ngOnDestroy(): void {
    this.changeSubs.forEach(s => s.unsubscribe())
  }


  get allIncluded(): boolean {
    return this.value.every(c => c.include)
  }


  get disabled(): boolean {
    return this.form.disabled
  }


  get hasHidden(): boolean {
    return this.value.some(c => c.hidden)
  }


  includeAll() {
    this.writeValue(
      this.value.map(c => ({ ...c, include: true }))
    )
  }


  includeNone() {
    this.writeValue(
      this.value.map(c => ({ ...c, include: false }))
    )
  }


  get listControl(): FormArray {
    return this.form.get('list') as FormArray
  }


  get noneIncluded(): boolean {
    return !this.value.some(c => c.include)
  }


  onDropDropListDropped(event) {
    let v = [ ...this.value ]
    let col = v[event.previousIndex]
    v.splice(event.previousIndex, 1)
    v.splice(event.currentIndex, 0, col)
    this.form.setControl('list', this.fb.array(v))
  }


  onTouched: Function = () => {}  // Replaced by registerOnChange


  onValidatorChange: Function = () => {}  // Replaced by registerOnTouched


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


  trackByFn(index: number, item) {
    return item.value.code
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


  get visibleControls(): FormControl[] {
    return (
      this.alwaysShowHidden || this.showingHidden
      ? this.listControl.controls
      : this.listControl.controls.filter(c => !c.value.hidden)
    ) as FormControl[]
  }


  writeValue(value: ColumnOption[]): void {
    if (value) {
      this.form.setControl('list', this.fb.array(value))
      this.hadHidden = this.hasHidden
      if (this.hadHidden) {
        this.highlightShowHiddenButton = false
      }
    }
  }

}
