import { Injectable, OnInit } from '@angular/core'
import { CloudAppEventsService, InitData } from '@exlibris/exl-cloudapp-angular-lib'
import { COLUMNS_DEFINITIONS } from './column-definitions'
import { ColumnOption } from './column-options'
import { ConfigService } from './config/config.service'
import { LastUsedOptionsService } from './slip-report'



const FALLBACK_DEFAULT_CIRC_DESK_CODE = 'DEFAULT_CIRC_DESK'


@Injectable({
  providedIn: 'root',
})
export class AppService implements OnInit {

  private _initData?: InitData
  private _libraryCode?: string
  private _circDeskCode?: string
  columnOptions: ColumnOption[] = []


  constructor(
    private configService: ConfigService,
    private eventsService: CloudAppEventsService,
    private lastUsedOptionsService: LastUsedOptionsService,
  ) { }


  async ngOnInit() {
    this._initData = await this.eventsService.getInitData().toPromise()
  }


  get circDeskCode(): string {
    return this._circDeskCode ?? FALLBACK_DEFAULT_CIRC_DESK_CODE
  }


  set circDeskCode(c) {
    this._circDeskCode = c.trim()
  }


  get defaultCircDeskCode(): string {
    let libConfig = this.configService.config?.libraryConfigs?.filter(x => x.libraryCode == this.libraryCode)
    return libConfig?.[0]?.defaultCircDeskCode ?? FALLBACK_DEFAULT_CIRC_DESK_CODE
  }


  get includedColumnOptions() {
    return this.columnOptions.filter(c => c.include)
  }


  get libraryCode(): string {
    return this._libraryCode
  }


  set libraryCode(c) {
    this._libraryCode = c.trim()
  }


  async reset() {
    await this.configService.load()

    this.libraryCode = this._initData?.user?.currentlyAtLibCode ?? ''
    this.circDeskCode = this.defaultCircDeskCode

    let missingColumnDefinitions = new Map(COLUMNS_DEFINITIONS)   // Copy because we are going to mutate it
    this.columnOptions = [
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
  }


  async loadLastUsed() {
    await this.lastUsedOptionsService.load()
    if (!this.lastUsedOptionsService.hasOptions) {
      // If there are no options to load, reset them
      return this.reset()
    }

    await this.configService.load()
    let options = this.lastUsedOptionsService.options

    this.libraryCode = (
      this._initData?.user?.currentlyAtLibCode
      ? this._initData.user.currentlyAtLibCode
      : options?.libraryCode ?? ''
    )

    this.circDeskCode = options?.circDeskCode ?? this.defaultCircDeskCode

    let missingColumnDefinitions = new Map(COLUMNS_DEFINITIONS)   // Copy because we are going to mutate it
    this.columnOptions = [
      // Start with the columns in the order they are from the last used options,
      ...(
        (options?.columnOptions ?? [])
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
  }


  async saveLastUsed() {
    this.lastUsedOptionsService.options = {
      libraryCode: this.libraryCode,
      circDeskCode: this.circDeskCode,
      columnOptions: this.columnOptions.map(c => ({
        code: c.code, include: c.include, limit: c.limit, hiddenInApp: c.hiddenInApp
      })),
    }
    await this.lastUsedOptionsService.save()
  }

}
