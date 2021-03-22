import { Injectable } from '@angular/core'
import { CloudAppConfigService } from '@exlibris/exl-cloudapp-angular-lib'



export type PrintSlipReportConfig = {
  columnDefaults: PrintSlipReportColumnConfig[]
}

export type PrintSlipReportColumnConfig = {
  code: string
  include: boolean
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


  async load() {
    if (!this.loaded) {
      try {
        let blob = await this.configService.get().toPromise()
        this.config = deserialise(blob)
      } catch (err) {
        this.config = null
      }
      this.loaded = true
    }
  }


  async save() {
    if (this.config) {
      await this.configService.set(serialize(this.config)).toPromise()
    } else {
      await this.configService.remove().toPromise()
    }
  }

}


function deserialise(blob: string | null): PrintSlipReportConfig | null {
  if (blob && Object.keys(blob).length > 0) {
    try {
      return JSON.parse(blob) as PrintSlipReportConfig
    } catch (e) {
      console.error('Failed to restore the app configuration from storage', e, blob)
    }
  }
  return null
}


function serialize(config: PrintSlipReportConfig): string {
  return JSON.stringify(config)
}
