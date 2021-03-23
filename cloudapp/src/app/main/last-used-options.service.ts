import { Injectable } from '@angular/core'
import { CloudAppStoreService } from '@exlibris/exl-cloudapp-angular-lib'


export type LastUsedOptions = {
  libraryCode: string
  circDeskCode: string
  columnOptions: LastUsedColumnOption[]
}

export type LastUsedColumnOption = {
  code: string
  include: boolean
}



@Injectable({
  providedIn: 'root',
})
export class LastUsedOptionsService {

  loaded = false
  options: LastUsedOptions = {
    libraryCode: '',
    circDeskCode: '',
    columnOptions: [],
  }
  storageKey = 'last-used-options'


  constructor(
    private storeService: CloudAppStoreService,
  ) { }


  get hasOptions(): boolean {
    return (this.options?.columnOptions ?? []).length > 0
  }


  async load() {
    if (!this.loaded) {
      try {
        let loadedOptions = await this.storeService.get(this.storageKey).toPromise()
        this.options = { ...this.options, ...loadedOptions }
      } catch (err) {
        console.warn('Failed to load last used options from storage', err)
      }
    }
  }


  async remove() {
    return this.storeService.remove(this.storageKey).toPromise()
  }


  async save() {
    return this.storeService.set(this.storageKey, this.options).toPromise()
  }

}
