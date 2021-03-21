import { Component, OnInit } from '@angular/core'
import { FormArray, FormBuilder } from '@angular/forms'
import { AlertService } from '@exlibris/exl-cloudapp-angular-lib'
import { COLUMNS_DEFINITIONS } from '../column-definitions'
import { ConfigService } from './config.service'



@Component({
  selector: 'app-config',
  templateUrl: './config.component.html',
  styleUrls: [ './config.component.scss' ],
})
export class ConfigComponent implements OnInit {

  columnDefinitions = COLUMNS_DEFINITIONS
  ready = false
  saving = false

  form = this.formBuilder.group({
    columnDefaults: this.formBuilder.array(
      this.columnDefinitions.map(() => this.formBuilder.control(false)),
    ),
  })


  constructor(
    private alertService: AlertService,
    private formBuilder: FormBuilder,
  ) { }


  get columnDefaults(): FormArray {
    return this.form.get('columnDefaults') as FormArray
  }


  ngOnInit(): void {
  }


  async onSave() {
    try {
      this.saving = true
      await this.saveConfig()
    } catch (err) {
      console.error('Failed to save the configuration', err)
      let msg = err.message || "See the console in your browser's developer tools for more information."
      this.alertService.error(`Failed to save the configuration. ${msg}`)
    } finally {
      this.saving = false
  }


  async saveConfig() {
    let columnDefaults = this.columnDefaults.value
    this.configService.columnDefaults = this.columnDefinitions.map(
      (c, i) => ({ code: c.code, include: columnDefaults[i] })
    )
    await this.configService.save()
  }

}
