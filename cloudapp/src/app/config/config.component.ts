import { Component, OnInit } from '@angular/core'
import { FormArray, FormBuilder } from '@angular/forms'
import { COLUMNS_DEFINITIONS } from '../column-definitions'



@Component({
  selector: 'app-config',
  templateUrl: './config.component.html',
  styleUrls: [ './config.component.scss' ],
})
export class ConfigComponent implements OnInit {

  columnDefinitions = COLUMNS_DEFINITIONS
  saving = false

  form = this.formBuilder.group({
    columns: this.formBuilder.array(
      this.columnDefinitions.map(() => this.formBuilder.control(false)),
    ),
  })


  constructor(
    private formBuilder: FormBuilder,
  ) { }


  get columns(): FormArray {
    return this.form.get('columns') as FormArray
  }


  ngOnInit(): void {
  }

}
