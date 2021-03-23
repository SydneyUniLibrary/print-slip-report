import { AsyncValidatorFn, FormArray, FormControl, FormGroup, ValidatorFn } from '@angular/forms'


export interface CircDeskCodeDefault {
  libraryCode: string
  defaultCircDeskCode: string
}


export class CircDeskCodeDefaultControl extends FormGroup {

  constructor(
    circDeskCodeDefault: CircDeskCodeDefault,
    validator?: ValidatorFn,
    asyncValidator?: AsyncValidatorFn,
  ) {
    let controls = {
      libraryCode: new FormControl(circDeskCodeDefault.libraryCode),
      defaultCircDeskCode: new FormControl(circDeskCodeDefault.defaultCircDeskCode),
    }
    super(controls, validator, asyncValidator)
  }

}


export class CircDeskCodeDefaultsListControl extends FormArray {

  readonly controls: CircDeskCodeDefaultControl[]

  constructor(
    circDeskCodeDefaults: CircDeskCodeDefault[],
    validator?: ValidatorFn,
    asyncValidator?: AsyncValidatorFn,
  ) {
    let controls = circDeskCodeDefaults.map(d => new CircDeskCodeDefaultControl(d))
    super(controls, validator, asyncValidator)
  }

}
