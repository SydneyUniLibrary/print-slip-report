import { Component, OnInit } from '@angular/core'
import { FormArray, FormGroup } from '@angular/forms'
import { AlertService } from '@exlibris/exl-cloudapp-angular-lib'
import { COLUMNS_DEFINITIONS } from '../column-definitions'
import { ColumnOption, ColumnOptionsListControl } from '../column-options'
import { CircDeskCodeDefault, CircDeskCodeDefaultsListControl } from './circ-desk-code-defaults-control'
import { ConfigService } from './config.service'
import { LibrariesService } from './libraries.service'



@Component({
  selector: 'app-config',
  templateUrl: './config.component.html',
  styleUrls: [ './config.component.scss' ],
})
export class ConfigComponent implements OnInit {


  form = new FormGroup({  // Initialised properly in restoreConfig()
    columnOptionsList: new ColumnOptionsListControl([]),
    circDeskCodeDefaults: new CircDeskCodeDefaultsListControl([]),
  })
  ready = false
  saving = false


  constructor(
    private alert: AlertService,
    private configService: ConfigService,
    private librariesService: LibrariesService,
  ) { }


  async ngOnInit() {
    try {
      await this.restoreConfig()
    } finally {
      this.ready = true
    }
  }


  get columnOptionsListControl(): ColumnOptionsListControl {
    return this.form.get('columnOptionsList') as ColumnOptionsListControl
  }


  set columnOptionsListControl(ctl: ColumnOptionsListControl) {
    this.form.setControl('columnOptionsList', ctl)
  }


  get circDeskCodeDefaultsControl(): CircDeskCodeDefaultsListControl {
    return this.form.get('circDeskCodeDefaults') as CircDeskCodeDefaultsListControl
  }


  set circDeskCodeDefaultsControl(ctl: CircDeskCodeDefaultsListControl) {
    this.form.setControl('circDeskCodeDefaults', ctl)
  }


  get firstLibraryCode(): string | undefined {
    let values = this.circDeskCodeDefaultsControl.value
    return (values.length > 0) ? values[0].libraryCode : undefined
  }


  copyCircDeskCodeDefaults() {
    let p = { defaultCircDeskCode: this.circDeskCodeDefaultsControl.value[0].defaultCircDeskCode }
    for (let ctl of this.circDeskCodeDefaultsControl.controls) {
      ctl.patchValue(p)
    }
  }


  async onSave() {
    try {
      this.saving = true
      await this.saveConfig()
    } catch (err) {
      console.error('Failed to save the configuration', err)
      let msg = err.message || "See the console in your browser's developer tools for more information."
      this.alert.error(`Failed to save the configuration. ${msg}`)
    } finally {
      this.saving = false
    }
  }


  async restoreConfig() {
    await Promise.all([ this.configService.load(), this.librariesService.load() ])
    this.restoreCircDeskCodeDefaults()
    this.restoreColumnOptionsList()
  }


  restoreCircDeskCodeDefaults() {
    let libraryConfigs = new Map(
      this.configService.libraryConfigs.map(c => [ c.libraryCode, c ])
    )
    let circDeskCodeDefaults: CircDeskCodeDefault[] = (
      this.librariesService.sortedCodes.map(libraryCode => ({
        libraryCode,
        defaultCircDeskCode: libraryConfigs.get(libraryCode)?.defaultCircDeskCode ?? ''
      }))
    )
    this.circDeskCodeDefaultsControl = new CircDeskCodeDefaultsListControl(circDeskCodeDefaults)
  }


  restoreColumnOptionsList() {
    let missingColumnDefinitions = new Map(COLUMNS_DEFINITIONS)   // Copy because we are going to mutate it
    let columnOptions: ColumnOption[] = [
      // Start with the columns in the order they are from the app configuration,
      ...(
        (this.configService.config?.columnDefaults ?? [])
        // ... minus any that aren't defined anymore
        .filter(c => missingColumnDefinitions.has(c.code))
        .map(c => {
          let name = missingColumnDefinitions.get(c.code).name
          missingColumnDefinitions.delete(c.code)
          return { ...c, name }
        })
      ),
      // Add any columns not in the app configuration, in the order they appear in the column definitions
      ...(
        Array.from(missingColumnDefinitions.values())
             .map(c => ({ code: c.code, name: c.name, include: false }))
      )
    ]
    this.columnOptionsListControl = new ColumnOptionsListControl(columnOptions)
  }


  async saveConfig() {
    this.saveCircDeskCodeDefaults()
    this.saveColumnOptionsList()
    await this.configService.save()
  }


  saveCircDeskCodeDefaults() {
    this.configService.libraryConfigs = (
      this.circDeskCodeDefaultsControl.value
      .map(v => ({ libraryCode: v.libraryCode, defaultCircDeskCode: v.defaultCircDeskCode.trim() }))
      .filter(v => v.defaultCircDeskCode)
    )
  }


  saveColumnOptionsList() {
    this.configService.columnDefaults = (
      this.columnOptionsListControl.value.map(c => ({ code: c.code, include: c.include }))
    )
  }

}
