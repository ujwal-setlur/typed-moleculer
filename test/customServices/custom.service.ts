import { CustomService } from './CustomServiceFactory';
import { Action, Service } from '../../src/decorators';

@Service()
export default class CustomTest extends CustomService {
  @Action()
  public async testAction() {
    return this.foo();
  }

  private created(): void {
    this.logger.info('Successfully created!');
  }
}
