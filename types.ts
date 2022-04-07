// req.oneAccount

export interface OneAccountRequestInfo {
  active: Boolean;
  scope: string | null;
  azp: string | null;
  sub: number | null;
  aud: string | null;
  token: string | null;
  error?: OneAccountAPIErrorResponse;
  options: OneAccountMiddlewareOptions | null;
}

// client config

export interface OneAccountConfig {
  clientId: string;
  clientSecret: string;
  global: OneAccountMiddlewareOptions;
  apiURL: string;
  internalUserLinking?: Function;
  handleErrors: Boolean;
}

// middleware options

export interface OneAccountMiddlewareOptions {
  requiredScopes?: string[];
}

// methods

export interface OneAccountGetTokenOptions {
  grantType?: string;
  code: string;
  redirectURI: string;
  codeVerifier: string;
}

export interface OneAccountGetTokenResult {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
  sub: number;
}

export interface OneAccountGetUserInfoOptions {
  token: string;
}

export interface OneAccountGetUserInfoResult {
  birthDate?: Date | string;
  countryCode?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  gender?: string;
  phoneNumer?: string | null;
  profilePicture?: string;
  username?: string | null;
}

export interface OneAccountGetExternalTokenOptions {
  token: string;
  clientId: string;
}

export interface OneAccountGetExternalTokenResult {
  accessToken: string;
  tokenType: string;
  expiresIn: number | null;
}

// errors

export interface OneAccountErrorOptions {
  message: string;
  code: string;
  responseMessage?: string;
  responseMetadata?: { [key: string]: unknown };
  statusCode?: number;
  info?: Partial<OneAccountRequestInfo>;
}

export class OneAccountError implements OneAccountErrorOptions {
  code;
  message;
  responseMessage;
  responseMetadata;
  statusCode;
  info;

  constructor({
    code,
    message,
    responseMessage = 'Something went wrong.',
    responseMetadata = {},
    statusCode = 401,
    info,
  }: OneAccountErrorOptions) {
    this.code = code;
    this.message = message;
    this.responseMessage = responseMessage;
    this.responseMetadata = responseMetadata;
    this.statusCode = statusCode;
    this.info = {
      active: false,
      scope: null,
      azp: null,
      sub: null,
      aud: null,
      token: null,
      options: null,
      ...info,
    };
  }
}

// One Account API types

export interface OneAccountAPIIntrospectResponse {
  active: Boolean;
  scope?: string;
  azp?: string;
  sub?: number;
  aud?: string;
}

export interface OneAccountAPIErrorResponse {
  code: string;
  message: string;
  metadata?: { [key: string]: unknown };
}

export interface OneAccountAPITokenRequestBody {
  grant_type: string;
  code: string;
  redirect_uri: string;
  code_verifier: string;
  client_id: string;
  client_secret: string;
}

export interface OneAccountAPITokenResponse {
  error?: string;
  error_description?: string;
  access_token?: string;
  token_type?: string;
  expires_in?: number;
  sub?: number;
}

export interface OneAccountAPIExternalTokenResponse {
  access_token: string;
  token_type: string;
  expires_in?: number | null;
}

export interface OneAccountAPIUserInfoResponse {
  birth_date?: Date | string;
  country_code?: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  gender?: string;
  phone_numer?: string | null;
  profile_picture?: string;
  username?: string | null;
}
