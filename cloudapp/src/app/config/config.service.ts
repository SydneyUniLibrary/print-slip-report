import { Injectable } from '@angular/core'
import { CloudAppConfigService } from '@exlibris/exl-cloudapp-angular-lib'
import * as _ from 'lodash'



export type PrintSlipReportConfig = {
  libraryConfigs: PrintSlipReportLibraryConfig[]
  columnDefaults: PrintSlipReportColumnConfig[]
}

export type PrintSlipReportLibraryConfig = {
  libraryCode: string
  defaultCircDeskCode: string
}

export type PrintSlipReportColumnConfig = {
  code: string
  include: boolean
  limit: number
  hidden: boolean
}


@Injectable({
  providedIn: 'root',
})
export class ConfigService {

  config: PrintSlipReportConfig | null
  loaded = false


  constructor(
    private configService: CloudAppConfigService,
  ) { }


  get columnDefaults() {
    return this.config?.columnDefaults
  }


  set columnDefaults(v) {
    this.config = { ...this.config, columnDefaults: v }
  }


  get libraryConfigs() {
    return this.config?.libraryConfigs
  }


  set libraryConfigs(v) {
    this.config = { ...this.config, libraryConfigs: v }
  }


  async load() {
    if (!this.loaded) {
      this.config = { columnDefaults: [], libraryConfigs: [] }
      try {
        let loadedConfig: PrintSlipReportConfig | { } = await this.configService.get().toPromise()
        _.defaultsDeep(loadedConfig, { columnDefaults: [ { include: false, limit: 0 } ] })
        this.config = { ...this.config, ...loadedConfig }
      } catch (err) {
        console.warn('Failed to load the app configuration', err)
      }
      this.loaded = true
    }
  }


  async save() {
    if (this.config) {
      await this.configService.set(this.config).toPromise()
    } else {
      await this.configService.remove().toPromise()
    }
  }

}
