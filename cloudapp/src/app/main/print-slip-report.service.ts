import { Injectable } from '@angular/core'
import { escape } from 'html-escaper'
import { COLUMNS_DEFINITIONS } from '../column-definitions'
import { ColumnOption } from '../column-options'



@Injectable({
  providedIn: 'root'
})
export class PrintSlipReportService {

  newReport(columnOptions: ColumnOption[], requestedResources: object[]): PrintSlipReport {
    return new PrintSlipReport(columnOptions, requestedResources)
  }


}



export class PrintSlipReport {

  private includedColumns: ColumnOption[]
  private mappedRequestedResources: string[][]

  constructor(
    columnOptions: ColumnOption[],
    requestedResources: object[]
  ) {
    this.includedColumns = columnOptions.filter(c => c.include)
    this.mappedRequestedResources = requestedResources.map(x => this.mapColumns(x))
  }

  get html(): string {
    let a: (string | string[] | string[][])[] = [
      '<table>',
      this.thead(),
      '<tbody>',
      this.mappedRequestedResources.map(r => this.tr(r)),
      '</table>',
    ]
    // This is a hack for Array.prototype.flat not being declared
    let b: string[] = (a as unknown as { flat: (depth?) => string[] }).flat(2)
    return b.join('\n')
  }


  protected thead(): string[] {
    let thList = this.includedColumns.map(c => `<th>${ this.text(c.name) }`)
    return [ '<thead>', '<tr>', ...thList ]
  }


  protected tr(row: string[]): string[] {
    let tdList = row.map(v => `<td>${ this.text(v) }`)
    return [ '<tr>', ...tdList ]
  }


  protected text(value: string): string {
    return value ? escape(value.toString()) : ''
  }


  protected mapColumns(requestedResource: object): string[] {
    return this.includedColumns.map(col => {
      try {
        return COLUMNS_DEFINITIONS.get(col.code).mapFn(requestedResource)
      } catch (err) {
        console.error(`Failed to mapped column ${ col.name } for `, requestedResource, err)
        return undefined
      }
    })
  }

}
