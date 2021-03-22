import { Component, OnInit } from '@angular/core'
import { FormArray, FormBuilder } from '@angular/forms'
import { AlertService } from '@exlibris/exl-cloudapp-angular-lib'
import { COLUMNS_DEFINITIONS } from '../column-definitions'
import { ConfigService } from './config.service'
import { LibrariesService } from './libraries.service'



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
    columnDefaults: this.formBuilder.array([]),  // Initialised properly in restoreConfig()
  })


  constructor(
    private alertService: AlertService,
    private configService: ConfigService,
    private formBuilder: FormBuilder,
    private librariesService: LibrariesService,
  ) { }


  get columnDefaults(): FormArray {
    return this.form.get('columnDefaults') as FormArray
  }


  async ngOnInit() {
    try {
      await this.restoreConfig()
    } finally {
      this.ready = true
    }
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
  }


  async restoreConfig() {
    await Promise.all([ this.configService.load(), this.librariesService.load() ])
    this.restoreColumnDefaults()
  }


  restoreColumnDefaults() {
    let config = this.configService.columnDefaults
    let map = new Map(
      config?.map(x => [ x.code, x.include ])
      ?? this.columnDefinitions.map(c => [ c.code, false ])
    )
    let values = this.columnDefinitions.map(c => map.get(c.code) ?? false)
    this.columnDefaults.clear()
    for (let x of values) {
      this.columnDefaults.push(this.formBuilder.control(x))
    }
  }


  async saveConfig() {
    this.saveColumnDefaults()
    await this.configService.save()
  }


  saveColumnDefaults () {
    let columnDefaults = this.columnDefaults.value
    this.configService.columnDefaults = this.columnDefinitions.map(
      (c, i) => ({ code: c.code, include: columnDefaults[i] })
    )
  }

}


function flatten1<T>(a: (T | T[])[]): T[] {
  // TypeScript doesn't have Array.prototype.flat declared for it so it hack get around it
  return (a as any).flat(1)
}
