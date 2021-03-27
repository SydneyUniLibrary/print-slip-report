import { FormArray, ValidationErrors } from '@angular/forms'



export class ColumnOptionsListControlValidators {

  static atLeastOneInclude(columnsControl: FormArray): ValidationErrors | null {
    return (
      (!columnsControl.value.some(x => x.include))
      ? { 'atLeastOneInclude': true }
      : null
    )
  }

}
