import * as Moleculer from 'moleculer';
import { Action, Method, Service } from '../../src';
import { User } from './api.service';

export interface AuthMeta {
  user: User;
  $statusCode?: number;
}

export interface AuthContext<P = Moleculer.GenericObject>
  extends Moleculer.Context<P, AuthMeta> {
  meta: AuthMeta;
  params: P;
}

@Service()
export default class GetTest extends Moleculer.Service {
  @Action({
    params: {
      withUser: 'string'
    }
  })
  public async getModel() {
    return this._getModel();
  }

  @Method
  private _getModel(): Promise<User> {
    return Promise.resolve({ id: '5' });
  }

  private created(): void {
    this.logger.info('Successfully created!');
  }
}
