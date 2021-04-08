import { EventEmitter, Injectable } from '@angular/core'

import { ColumnOption } from '../column-options'
import { ColumnDefinition, COLUMNS_DEFINITIONS } from '../column-definitions'

import * as XLSX from 'sheetjs-style'
import * as FileSaver from 'file-saver'
import { RequestedResource, RequestedResourcesService } from '../requested-resources-service/requested-resources-service'
import { PrintSlipReportError } from '../print-slip-report/print-slip-report.service'



@Injectable({
  providedIn: 'root',
})
export class ExcelExportService {
  private static readonly FILE_NAME: string = 'requested-resources'
  private static readonly EXCEL_TYPE: string = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8'
  private static readonly EXCEL_EXTENSION: string = '.xlsx'

  private static readonly PAGE_SIZE: number = 100

  constructor(
    private requestedResourcesService: RequestedResourcesService
  ) { }


  async generateExcel(circDeskCode: string, libraryCode: string, columnOptions: ColumnOption[]) {

    const columnDefinitions: ColumnDefinition[] = this.getColumnDefinitions(columnOptions)
    const resources: RequestedResource[] = await this.requestedResourcesService.findRequestedResources(
      circDeskCode,
      libraryCode,
      ExcelExportService.PAGE_SIZE,
      null,
      (count: number) => { console.debug('completed', count) },
      (err: PrintSlipReportError) => { console.debug('error', err) }
    )

    const data: string[][] = this.createOutputFormat(resources, columnDefinitions)
    const worksheet: XLSX.WorkSheet = XLSX.utils.aoa_to_sheet(data)
    this.setCellWith(worksheet, columnDefinitions)
    this.setCellStyles(worksheet)
    const workbook: XLSX.WorkBook = { Sheets: { 'data': worksheet }, SheetNames: ['data'] }
    const excelBuffer: any = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })
    this.saveAsExcelFile(excelBuffer)
  }


  private getColumnDefinitions(columnOptions: ColumnOption[]): ColumnDefinition[] {
    return columnOptions.map(option => COLUMNS_DEFINITIONS.get(option.code))
  }


  private createOutputFormat(resources: RequestedResource[], columnDefinitions: ColumnDefinition[]): string[][] {
    let data: string[][] = resources.map(resource => this.mapColumns(resource, columnDefinitions))
    data.unshift(this.createHeader(columnDefinitions))
    return data
  }


  private mapColumns(requestedResource: RequestedResource, columnDefinitions: ColumnDefinition[]): string[] {
    return columnDefinitions.map(col => {
      try {
        let value: string = COLUMNS_DEFINITIONS.get(col.code).mapFn(requestedResource)
        if (!value) {
          value = '-'
        }
        return value
      } catch (err) {
        console.error(`Failed to mapped column ${col.name} for `, requestedResource, err)
        return undefined
      }
    })
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


  private saveAsExcelFile(buffer: any) {
    const blob: Blob = new Blob([buffer], { type: ExcelExportService.EXCEL_TYPE })
    const filename = ExcelExportService.FILE_NAME + '_export_' + new Date().getTime() + ExcelExportService.EXCEL_EXTENSION
    FileSaver.saveAs(blob, filename)
  }
}
