import axios from 'axios';
import { Request, Response, NextFunction } from 'express';

import {
  OneAccountConfig,
  OneAccountMiddlewareOptions,
  OneAccountRequestInfo,
  OneAccountGetTokenOptions,
  OneAccountGetUserInfoOptions,
  OneAccountGetExternalTokenOptions,
  OneAccountError,
  OneAccountGetTokenResult,
  OneAccountGetUserInfoResult,
  OneAccountGetExternalTokenResult,
  OneAccountAPIIntrospectResponse,
  OneAccountAPITokenRequestBody,
  OneAccountAPITokenResponse,
  OneAccountAPIUserInfoResponse,
  OneAccountAPIExternalTokenResponse,
} from './types';

declare global {
  namespace Express {
    interface Request {
      oneAccount?: OneAccountRequestInfo | undefined;
    }
  }
}

const oneAccountClientDefaultConfig: OneAccountConfig = {
  clientId: '',
  clientSecret: '',
  apiURL: 'https://api.one-account.io/v1',
  handleErrors: true,
  global: {
    requiredScopes: [],
  },
};

export class OneAccountClient {
  config: OneAccountConfig;

  constructor(config: Partial<OneAccountConfig>) {
    this.config = { ...oneAccountClientDefaultConfig, ...config };
  }

  // express middleware
  oneAccountAuth =
    (options: OneAccountMiddlewareOptions = {}) =>
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        // get token from authorization header
        const authHeader = req.headers.authorization;

        // if token was not provided, throw error
        if (!authHeader) {
          throw new OneAccountError({
            code: 'TOKEN_NOT_PROVIDED',
            message: 'Token not provided.',
            responseMessage: 'Not authenticated.',
            info: { options },
          });
        }

        // add global middleware options to middleware options
        options.requiredScopes = [...(this.config.global?.requiredScopes || []), ...(options?.requiredScopes || [])];

        // verify token and get user's secret from One Account API
        const { data } = await axios.post<OneAccountAPIIntrospectResponse>(
          `${this.config.apiURL}/oauth/introspect`,
          {
            client_id: this.config.clientId,
          },
          {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              Authorization: authHeader || '',
            },
            validateStatus: () => true,
          }
        );

        // if One Account cannot authenticate user, throw error
        if (!data.active) {
          throw new OneAccountError({
            code: 'TOKEN_INVALID',
            message: 'Invalid token.',
            responseMessage: 'Not authenticated.',
            info: { options },
          });
        }

        if (data.client_id !== this.config.clientId) {
          // token was not issued to this client
          if (data.aud !== this.config.clientId) {
            // token was not issued for this client
            throw new OneAccountError({
              code: 'AUDIENCE_INVALID',
              message: 'Invalid audience.',
              responseMessage: 'Invalid audience.',
              info: { options },
            });
          }

          // check required scopes
          const grantedScopes = data.scope;
          const notGrantedScopes = (options?.requiredScopes || []).filter(
            (requiredScope) => !grantedScopes?.includes(`${this.config.clientId}.${requiredScope}`)
          );
          if (notGrantedScopes.length) {
            // one or more of required scopes not granted
            throw new OneAccountError({
              code: 'SCOPES_INSUFFICIENT',
              message: "One or more of required scopes haven't been granted.",
              responseMessage: "One or more of required scopes haven't been granted.",
              responseMetadata: {
                requiredScopes: options?.requiredScopes || [],
                notGrantedScopes,
              },
              statusCode: 403,
              info: { options },
            });
          }
        }

        const oneAccountRequestInfo: OneAccountRequestInfo = {
          active: data.active, // is token valid and are all required scopes granted
          scope: data.scope as string, // all granted scopes in this token (more scopes may be granted by user, but are not included in this token, so they are considered not granted)
          clientId: data.client_id as string, // who requrested token
          sub: data.sub as string, // user secret provided to you by One Account
          aud: data.aud as string, // for which client did the requester request the token - should always be your clientId
          token: authHeader.split(' ')[1], // access token used to call this endpoint
          options, // options you've provided (required scopes)
        };

        req.oneAccount = oneAccountRequestInfo;
      } catch (err: unknown) {
        if (err instanceof OneAccountError) {
          const info: OneAccountRequestInfo = {
            ...err.info,
            error: {
              code: err.code,
              message: err.message,
            },
          };
          req.oneAccount = info;

          if (this.config.handleErrors) {
            return res.status(err.statusCode).json({
              code: err.statusCode,
              status: 'failed',
              error: {
                message: err.responseMessage,
              },
            });
          }
        }
        throw err;
      }

      if (this.config.internalUserLinking) {
        this.config.internalUserLinking(req, res, next);
      }

      return next();
    };

  getToken = async (options: OneAccountGetTokenOptions) => {
    const body: OneAccountAPITokenRequestBody = {
      grant_type: options.grantType || 'authorization_code',
      code: options.code,
      redirect_uri: options.redirectURI,
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
    };

    let urlEncodedBody = '';
    for (let property in body) {
      urlEncodedBody += `&${encodeURIComponent(property)}=${encodeURIComponent(
        body[property as keyof OneAccountAPITokenRequestBody]
      )}`;
    }
    urlEncodedBody = urlEncodedBody.substring(1);

    try {
      const { data } = await axios.post<OneAccountAPITokenResponse>(
        `${this.config.apiURL}/oauth/token`,
        urlEncodedBody,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      const newToken: OneAccountGetTokenResult = {
        accessToken: data.access_token as string,
        tokenType: data.token_type as string,
        expiresIn: data.expires_in as number,
        sub: data.user_secret as string,
      };

      return newToken;
    } catch (err: unknown) {
      throw new OneAccountError({
        code: 'COULDNT_GET_TOKEN',
        message: "Couldn't get token.",
      });
    }
  };

  getUserInfo = async (options: OneAccountGetUserInfoOptions) => {
    const authHeader = options.token.includes('Bearer ') ? options.token : `Bearer ${options.token}`;
    try {
      const { data } = await axios.get<OneAccountAPIUserInfoResponse>(`${this.config.apiURL}/oauth/userinfo`, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
          Authorization: authHeader,
        },
      });

      const userInfo: OneAccountGetUserInfoResult = {
        birthDate: data.birth_date,
        countryCode: data.country_code,
        email: data.email,
        firstName: data.first_name,
        lastName: data.last_name,
        fullName: data.full_name,
        gender: data.gender,
        phoneNumer: data.phone_numer,
        profilePicture: data.profile_picture,
        username: data.username,
      };

      return userInfo;
    } catch (err: unknown) {
      throw new OneAccountError({
        code: 'COULDNT_GET_USERINFO',
        message: "Couldn't get user info.",
      });
    }
  };

  getExternalToken = async (options: OneAccountGetExternalTokenOptions) => {
    try {
      const { data } = await axios.post<OneAccountAPIExternalTokenResponse>(
        `${this.config.apiURL}/oauth/issue-external-token/${options.clientId}`,
        {},
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization: `Bearer ${options.token}`,
          },
        }
      );

      const externalToken: OneAccountGetExternalTokenResult = {
        accessToken: data.access_token,
        tokenType: data.token_type,
        expiresIn: data.expires_in || null,
      };

      return externalToken;
    } catch (err: unknown) {
      throw new OneAccountError({
        code: 'COULDNT_GET_EXTERNAL_TOKEN',
        message: "Couldn't get external token.",
      });
    }
  };
}

export {
  OneAccountConfig,
  OneAccountMiddlewareOptions,
  OneAccountRequestInfo,
  OneAccountGetTokenOptions,
  OneAccountGetTokenResult,
  OneAccountGetUserInfoOptions,
  OneAccountGetUserInfoResult,
  OneAccountGetExternalTokenOptions,
  OneAccountGetExternalTokenResult,
  OneAccountError,
} from './types';
