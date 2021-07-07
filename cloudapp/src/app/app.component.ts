import { Component } from '@angular/core'
import { InitService } from '@exlibris/exl-cloudapp-angular-lib'



@Component({
  selector: 'app-root',
  template: '<cloudapp-alert></cloudapp-alert><router-outlet></router-outlet>',
})
export class AppComponent {

  // noinspection JSUnusedLocalSymbols
  constructor(
    private initService: InitService
  ) { }

}
