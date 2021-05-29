import { Service } from 'moleculer';

export class CustomService extends Service {
  foo() {
    return 'bar';
  }
}
