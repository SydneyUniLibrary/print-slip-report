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


  constructor(
    private configService: CloudAppConfigService,
  ) { }


  set columnDefaults(v) {
    this.config = { ...this.config, columnDefaults: v }
  }


  async save() {
    if (this.config) {
      await this.configService.set(serialize(this.config)).toPromise()
    } else {
      await this.configService.remove().toPromise()
    }
  }

}


function serialize(config: PrintSlipReportConfig): string {
  return JSON.stringify(config)
}
