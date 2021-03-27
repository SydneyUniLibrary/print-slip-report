import { Component, Input } from '@angular/core'
import { ColumnOptionControl } from './column-option-control'



@Component({
  selector: 'app-column-option',
  templateUrl: './column-option.component.html',
  styleUrls: [ './column-option.component.scss' ],
})
export class ColumnOptionComponent {

  @Input() control: ColumnOptionControl


  constructor() { }


  get name(): string {
    return this?.control.value?.name ?? ''
  }

}
