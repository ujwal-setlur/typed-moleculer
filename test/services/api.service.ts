import { IncomingMessage } from 'http';
import * as Moleculer from 'moleculer';
import { Method, Service } from '../../src/decorators';
import * as ApiGateway from 'moleculer-web';

export interface User {
  id: string;
}

const { Errors } = ApiGateway.default;

@Service({
  mixins: [ApiGateway],
  settings: {
    port: process.env.PORT || 9000,
    routes: [
      {
        aliases: {
          'GET getTest/getModel/:withUser': 'GetTest.getModel'
        },
        authentication: true,
        whitelist: ['**']
      }
    ]
  }
})
export default class Api extends Moleculer.Service {
  @Method
  public async authenticate(
    ctx: Moleculer.Context,
    route: string,
    req: IncomingMessage
  ) {
    const accessToken = req.headers.authorization;
    if (accessToken) {
      const user = await this._getUserFromRemoterService();
      if (user) {
        return Promise.resolve({ ...user.user, id: user.user.externalId });
      } else {
        return Promise.reject(
          new Errors.UnAuthorizedError(Errors.ERR_INVALID_TOKEN, {})
        );
      }
    } else {
      return Promise.reject(
        new Errors.UnAuthorizedError(Errors.ERR_NO_TOKEN, {})
      );
    }
  }

  @Method
  private _getUserFromRemoterService(): Promise<any> {
    return Promise.resolve({ user: {} });
  }
}
