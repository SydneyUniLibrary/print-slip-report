import { Component, OnInit } from '@angular/core'
import { FormBuilder, FormControl } from '@angular/forms'
import { AlertService } from '@exlibris/exl-cloudapp-angular-lib'
import { COLUMNS_DEFINITIONS } from '../requested-resources'
import { ColumnOption } from '../column-options'
import { CircDeskCodeDefault } from './circ-desk-code-defaults.component'
import { ConfigService } from './config.service'
import { LibrariesService } from './libraries.service'



@Component({
  selector: 'app-config',
  templateUrl: './config.component.html',
  styleUrls: [ './config.component.scss' ],
})
export class ConfigComponent implements OnInit {


  form = this.fb.group({  // Initialised properly in restoreConfig()
    circDeskCodeDefaults: [ [] ],
    columnOptionsList: [ [] ],
    groupByLocation: [ [] ],
  })
  ready = false
  saving = false


  constructor(
    private alert: AlertService,
    private configService: ConfigService,
    private fb: FormBuilder,
    private librariesService: LibrariesService,
  ) { }


  async ngOnInit() {
    try {
      await this.restoreConfig()
    } finally {
      this.ready = true
    }
  }


  get columnOptionsListControl(): FormControl {
    return this.form.get('columnOptionsList') as FormControl
  }


  get circDeskCodeDefaultsControl(): FormControl {
    return this.form.get('circDeskCodeDefaults') as FormControl
  }


  get groupByLocation(): FormControl {
    return this.form.get('groupByLocation') as FormControl
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
    this.form.setValue({
      circDeskCodeDefaults: this.restoreCircDeskCodeDefaults(),
      columnOptionsList: this.restoreColumnOptionsList(),
      groupByLocation: this.restoreGroupByLocation(),
    })
  }


  private restoreCircDeskCodeDefaults() {
    let libraryConfigs = new Map(
      this.configService.libraryConfigs.map(c => [ c.libraryCode, c ])
    )
    let circDeskCodeDefaults: CircDeskCodeDefault[] = (
      this.librariesService.sortedCodes.map(libraryCode => ({
        libraryCode,
        defaultCircDeskCode: libraryConfigs.get(libraryCode)?.defaultCircDeskCode ?? ''
      }))
    )
    return circDeskCodeDefaults
  }


  private restoreColumnOptionsList() {
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
          return { include: false, limit: 0, hiddenInApp: false, ...c, name }
        })
      ),
      // Add any columns not in the app configuration, in the order they appear in the column definitions
      ...(
        Array.from(missingColumnDefinitions.values())
             .map(c => ({ code: c.code, name: c.name, include: false, limit: 0, hiddenInApp: false }))
      )
    ]
    return columnOptions
  }

  private restoreGroupByLocation(): boolean {
    return this.configService.groupByLocation || false;
  }


  async saveConfig() {
    this.saveCircDeskCodeDefaults()
    this.saveColumnOptionsList()
    this.saveGroupByLocation()
    await this.configService.save()
  }


  private saveCircDeskCodeDefaults() {
    this.configService.libraryConfigs = (
      this.form.value.circDeskCodeDefaults
      .map(v => ({ libraryCode: v.libraryCode, defaultCircDeskCode: v.defaultCircDeskCode.trim() }))
      .filter(v => v.defaultCircDeskCode)
    )
  }


  private saveColumnOptionsList() {
    this.configService.columnDefaults = (
      this.form.value.columnOptionsList.map(c => ({
        code: c.code, include: c.include, limit: c.limit, hiddenInApp: c.hiddenInApp,
      }))
    )
  }


  private saveGroupByLocation() {
    this.configService.groupByLocation = this.form.value.groupByLocation
  }

}
