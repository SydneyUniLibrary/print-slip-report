import { Platform } from '@angular/cdk/platform'
import { DOCUMENT } from '@angular/common'
import { Component, Inject, NgZone, OnDestroy, OnInit, Renderer2 } from '@angular/core'
import { AlertService } from '@exlibris/exl-cloudapp-angular-lib'
import * as _ from 'lodash'
import { Subscription } from 'rxjs'
import { AppService } from '../app.service'
import { ColumnOption } from '../column-options'
import { COLUMNS_DEFINITIONS, RequestedResource } from '../requested-resources'
import { PrintSlipReportService } from './print-slip-report.service'



@Component({
  selector: 'app-print-slip-report',
  templateUrl: './print-slip-report.component.html',
  styleUrls: [ './print-slip-report.component.scss' ],
})
export class PrintSlipReportComponent implements OnDestroy, OnInit {

  loading = true
  tables: Map<string, TableRow[]>
  printAlertTimoutId?: number
  progress?: number
  progressChangeSub?: Subscription


  constructor(
    private alert: AlertService,
    private appService: AppService,
    @Inject(DOCUMENT) private document: Document,
    private printSlipReportService: PrintSlipReportService,
    private renderer: Renderer2,
    private zone: NgZone,
  ) {
    window.addEventListener('beforeprint', () => this.onBeforePrint())
    window.addEventListener('afterprint', () => this.onAfterPrint())
    this.renderer.addClass(this.document.body, this.cloudAppThemeClass)
  }


  async ngOnInit(): Promise<void> {
    try {
      this.progressChangeSub = this.printSlipReportService.progressChange.subscribe(
        progress => {
          this.zone.run(() => {
            this.progress = progress || 0
          })
        }
      )
      let requestedResources = await this.printSlipReportService.findRequestedResources()
      // Delay slightly so that the user perceives the progress spinner showing 100%
      // but only if the mapping happens too quickly.
      let x = await Promise.all([
        (async () => this.mapRequestedResources(requestedResources))(),
        new Promise(resolve => setTimeout(resolve, 500)),
      ])
      this.tables = x[0] as Map<string, TableRow[]>
      if (requestedResources.length > 0) {
        this.print()
      }
      /*
      } catch (err) {
        MainComponent will take care of surfacing the error in the UI via PrintSlipReportService's error event.
      */
    } finally {
      this.loading = false
    }
  }


  ngOnDestroy() {
    if (this.progressChangeSub) {
      this.progressChangeSub.unsubscribe()
    }
  }


  get cloudAppThemeClass(): string {
    return `cloudapp-theme--${ this.appService.initData.color }`
  }


  get includedColumnOptions(): ColumnOption[] {
    return this.appService.includedColumnOptions
  }


  private mapRequestedResources(requestedResource: RequestedResource[]): Map<string, TableRow[]> {
    let tableRows = _.flatMap(
      requestedResource.map(requestedResource =>
        this.mapColumns(requestedResource)
      )
    )
    let groupedTables: Map<string, TableRow[]> = new Map()
    tableRows.forEach((row) => {
      if (!groupedTables.has(row.group)) {
        groupedTables.set(row.group, [])
      }
      groupedTables.get(row.group).push(row)
      return groupedTables;
    })
    if (this.appService.sortByFirstColumn) {
      groupedTables.forEach((tableRowGroup) => {
        tableRowGroup = tableRowGroup.sort((tableRow1, tableRow2) => {
          if (tableRow1.values.length < 1) {
            return 0
          }
          return ('' + tableRow1.values[0]).localeCompare(tableRow2.values[0])
        });
      })
    }
    return groupedTables
  }


  private mapColumns(requestedResource: RequestedResource): TableRow[] | undefined {
    let resource_metadata = requestedResource.resource_metadata
    let location = requestedResource.location
    return requestedResource.request.map(request => {
      let values = this.includedColumnOptions.map(col => {
        try {
          let v = COLUMNS_DEFINITIONS.get(col.code).mapFn({ resource_metadata, location, request })
          return (
            (col.limit && v.length > col.limit)
              ? `${v.substring(0, col.limit)}…`
              : v
          )
        } catch (err) {
          console.error(`Failed to mapped column ${ col.name } for `, requestedResource, err)
          return undefined
        }
      })
      let group = 'none'
      if (this.appService.groupByLocation) {
        group = location.shelving_location
      }
      return new TableRow(values, group)
    })
  }


  onAfterPrint(): void {
    // Firefox won't close the window if window.close() happens within this event handler.
    // So do it on the next tick instead.
    setTimeout(() => window.close())
  }


  onBeforePrint(): void {
    // We're printing, so don't show the print alert.
    clearTimeout(this.printAlertTimoutId)
    this.zone.run(() => {
      this.alert.clear()
    })
  }


  print(): void {
    // Chrome blocks on window.print, so do it on the next tick.
    setTimeout(() => {

      // Safari requires document.execCommand, window.print does not thing
      // Firefox returns false for document.execCommand and requires window.print
      // Chrome works with either.
      // For others document.execCommand might work and return true, might return false, or might throw an error.

      try {
        let printed = document.execCommand('print', true, undefined)
        if (!printed) {
          window.print()
        }
      } catch (err) {
        console.error(err)
        window.print()
      }

    })

    // So if we're not printing very soon, the browsers has blocked us from printing and so show an alert.
    // This is cancelled by onBeforePrint.
    this.printAlertTimoutId = setTimeout(
      () => {
        this.alert.info(`Press ${this.printKey} to print.`, { autoClose: false })
      },
      50
    ) as number
  }


  get printKey(): string {
    return navigator.platform.indexOf('Mac') > -1 ? '⌘P' : 'Ctrl+P'
  }

}


class TableRow {
  values: string[]
  group: string

  constructor(values: string[], group: string) {
    this.values = values
    this.group = group
  }
}
