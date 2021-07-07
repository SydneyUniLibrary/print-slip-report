import { Injectable } from '@angular/core'
import { CloudAppEventsService, CloudAppStoreService, InitData } from '@exlibris/exl-cloudapp-angular-lib'
import { COLUMNS_DEFINITIONS } from './requested-resources/column-definitions'  // Direct to avoid circular dependency
import { ColumnOption } from './column-options'
import { ConfigService } from './config/config.service'
import { SlipReportError } from './slip-report'



const FALLBACK_DEFAULT_CIRC_DESK_CODE = 'DEFAULT_CIRC_DESK'
const STORAGE_KEY = 'last-used-options'


@Injectable({
  providedIn: 'root',
})
export class AppService {

  initData?: InitData
  private _libraryCode?: string
  private _circDeskCode?: string
  columnOptions: ColumnOption[] = []
  lastSlipReportError: SlipReportError | undefined = undefined


  constructor(
    private configService: ConfigService,
    private eventsService: CloudAppEventsService,
    private storeService: CloudAppStoreService,
  ) {
    this.eventsService.getInitData().subscribe(initData => { this.initData = initData })
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


  popLastSlipReportError(): SlipReportError | undefined {
    let e = this.lastSlipReportError
    this.lastSlipReportError = undefined
    return e
  }


  async reset() {
    await this.configService.load()

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
    let lastUsedOptions = await this.storeService.get(STORAGE_KEY).toPromise()
    if (!lastUsedOptions?.columnOptions?.length) {
      // If there are no last used options saved, reset them
      return this.reset()
    }

    await this.configService.load()

    this.libraryCode = (
      this.initData?.user?.currentlyAtLibCode
      ? this.initData.user.currentlyAtLibCode
      : (lastUsedOptions?.libraryCode ?? '')
    )

    this.circDeskCode = lastUsedOptions?.circDeskCode ?? this.defaultCircDeskCode

    let missingColumnDefinitions = new Map(COLUMNS_DEFINITIONS)   // Copy because we are going to mutate it
    this.columnOptions = [
      // Start with the columns in the order they are from the last used options,
      ...(
        (lastUsedOptions?.columnOptions ?? [])
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
    let lastUsedOptions =  {
      libraryCode: this.libraryCode,
      circDeskCode: this.circDeskCode,
      columnOptions: this.columnOptions.map(c => ({
        code: c.code, include: c.include, limit: c.limit, hiddenInApp: c.hiddenInApp
      })),
    }
    return this.storeService.set(STORAGE_KEY, lastUsedOptions).toPromise()
  }

}
