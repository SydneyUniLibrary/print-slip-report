import { EventEmitter, Injectable } from '@angular/core'
import * as FileSaver from 'file-saver'
import * as _ from 'lodash'
import * as XLSX from 'sheetjs-style'
import { AppService } from '../app.service'
import { ColumnDefinition, COLUMNS_DEFINITIONS } from '../requested-resources'
import { ColumnOption } from '../column-options'
import { RequestedResource, RequestedResourcesService } from '../requested-resources'



@Injectable({
  providedIn: 'root',
})
export class DownloadExcelSlipReportService {
  private static readonly FILE_NAME: string = 'requested-resources'
  private static readonly EXCEL_TYPE: string = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8'
  private static readonly EXCEL_EXTENSION: string = '.xlsx'

  private static readonly PAGE_SIZE: number = 100


  progressChange = new EventEmitter<number>()


  constructor(
    private appService: AppService,
    private requestedResourcesService: RequestedResourcesService,
  ) { }


  async generateExcel(): Promise<string | undefined> {
    const columnDefinitions: ColumnDefinition[] = this.getColumnDefinitions(this.appService.includedColumnOptions)
    const resources: RequestedResource[] = await this.requestedResourcesService.findRequestedResources(
      DownloadExcelSlipReportService.PAGE_SIZE,
      this.progressChange,
      ColumnDefinition.combinedEnrichmentOptions(columnDefinitions),
    )
    if (resources.length > 0) {
      const data: string[][] = this.createOutputFormat(resources, columnDefinitions)
      const worksheet: XLSX.WorkSheet = XLSX.utils.aoa_to_sheet(data)
      this.setCellWith(worksheet, columnDefinitions)
      this.setCellStyles(worksheet)
      const workbook: XLSX.WorkBook = { Sheets: { 'data': worksheet }, SheetNames: ['data'] }
      const excelBuffer: any = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })
      return this.saveAsExcelFile(excelBuffer)
    }
  }


  private getColumnDefinitions(columnOptions: ColumnOption[]): ColumnDefinition[] {
    return columnOptions.map(option => COLUMNS_DEFINITIONS.get(option.code))
  }


  private createOutputFormat(resources: RequestedResource[], columnDefinitions: ColumnDefinition[]): string[][] {
    let data: string[][] = _.flatMap(
      resources.map(requestedResource =>
        this.mapColumns(requestedResource, columnDefinitions)
      )
    )
    data.unshift(this.createHeader(columnDefinitions))
    return data
  }


  private mapColumns(requestedResource: RequestedResource, columnDefinitions: ColumnDefinition[]): Array<string[] | undefined> {
    let resource_metadata = requestedResource.resource_metadata
    let location = requestedResource.location
    return requestedResource.request.map(request =>
      columnDefinitions.map(col => {
        try {
          let value = COLUMNS_DEFINITIONS.get(col.code).mapFn({ resource_metadata, location, request })
          if (!value) {
            value = '-'
          }
          return value
        } catch (err) {
          console.error(`Failed to mapped column ${col.name} for `, requestedResource, err)
          return undefined
        }
      })
    )
  }


  private setCellWith(worksheet: XLSX.WorkSheet, columnDefinitions: ColumnDefinition[]) {
    const colsWiths: object[] = columnDefinitions.map(col => { return { wch: 25 } })
    worksheet['!cols'] = colsWiths
  }


  private setCellStyles(worksheet: XLSX.WorkSheet) {
    Object.keys(worksheet).forEach(key => {
      if (worksheet.hasOwnProperty(key)) {
        if (key.indexOf('!') < 0 && key.indexOf(':') < 0) {
          let cell = worksheet[key]
          cell['s'] = {
            font: {
              name: 'Arial',
              sz: 10,
              bold: this.isBold(key)
            },
            border: {
              bottom: {
                style: 'thin',
                color: {
                  rgb: '000000'
                }
              }
            },
            alignment: {
              wrapText: true
            }
          }
        }
      }
    })
  }


  private isBold(key: string): boolean {
    // is header (key ends with '1' liken A1, B1, ...)
    const isHeadRowKeyRegex = /^[A-Z]+1$/
    // is first row (key starts with 'A')
    const isFirstColKeyRegex = /^A+\d+$/
    return isHeadRowKeyRegex.test(key) || isFirstColKeyRegex.test(key)
  }


  private createHeader(columnDefinitions: ColumnDefinition[]): string[] {
    return columnDefinitions.map(col => col.name)
  }


  private saveAsExcelFile(buffer: any): string {
    const blob: Blob = new Blob([buffer], { type: DownloadExcelSlipReportService.EXCEL_TYPE })
    const filename = DownloadExcelSlipReportService.FILE_NAME + '_export_' + new Date().getTime() + DownloadExcelSlipReportService.EXCEL_EXTENSION
    FileSaver.saveAs(blob, filename)
    return filename
  }

}
