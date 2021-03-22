import { Injectable } from '@angular/core'
import { CloudAppRestService, HttpMethod } from '@exlibris/exl-cloudapp-angular-lib'


export interface Library {
  id: string
  code: string
  name: string
}


@Injectable({
  providedIn: 'root'
})
export class LibrariesService {

  libraries: Map<string, Library> | null
  loaded = false


  constructor(
    private restService: CloudAppRestService
  ) { }


  get sortedCodes(): string[] {
    if (this.libraries) {
      return Array.from(this.libraries.keys()).sort()
    } else {
      return []
    }
  }


  async load() {
    if (!this.loaded) {
      try {
        let resp = await (
          this.restService.call({
            url: '/conf/libraries',
            method: HttpMethod.GET,
          })
          .toPromise()
        )
        this.libraries = new Map(resp?.library?.map(l => [ l.code , l ]))
      } finally {
        this.loaded = true
      }
    }
  }

}
