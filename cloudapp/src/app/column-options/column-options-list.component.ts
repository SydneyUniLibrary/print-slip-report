import { Component, Input } from '@angular/core'
import { ColumnOptionsListControl } from './column-options-list-control'



@Component({
  selector: 'app-column-options-list',
  templateUrl: './column-options-list.component.html',
  styleUrls: [ './column-options-list.component.scss' ],
})
export class ColumnOptionsListComponent {

  @Input() listControl: ColumnOptionsListControl


  constructor() { }

}
