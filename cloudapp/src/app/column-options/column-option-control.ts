import { AsyncValidatorFn, FormControl, FormGroup, ValidatorFn } from '@angular/forms'
import { ColumnOption } from './column-option'



export class ColumnOptionControl extends FormGroup {

  constructor(
    columnOption: ColumnOption,
    validator?: ValidatorFn,
    asyncValidator?: AsyncValidatorFn,
  ) {
    let controls = {
      code: new FormControl(columnOption.code),
      name: new FormControl(columnOption.name),
      include: new FormControl(columnOption.include)
    }
    super(controls, validator, asyncValidator)
  }



}
