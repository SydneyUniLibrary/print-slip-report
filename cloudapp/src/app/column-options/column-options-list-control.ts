import { AsyncValidatorFn, FormArray, ValidationErrors, ValidatorFn } from '@angular/forms'
import { ColumnOption } from './column-option'
import { ColumnOptionControl } from './column-option-control'



export class ColumnOptionsListControl extends FormArray {

  readonly controls: ColumnOptionControl[]


  constructor(
    columnOptions: ColumnOption[],
    validator?: ValidatorFn | ValidatorFn[],
    asyncValidator?: AsyncValidatorFn | AsyncValidatorFn[],
  ) {
    let controls = columnOptions.map(o => new ColumnOptionControl(o))
    super(controls, validator, asyncValidator)
  }

}


export class ColumnOptionsListControlValidators {

  static atLeastOneInclude(columnsControl: ColumnOptionsListControl): ValidationErrors | null {
    return (
      (!columnsControl.controls.some(c => c.get('include').value))
      ? { 'atLeastOneInclude': true }
      : null
    )
  }

}
