# One Account: Express Client

## 1. Register your app
You can do so at https://www.one-account.io/developers.

## 2. Install library

```
npm i @one-account/express-client
```

## 3. Create One Account Client

```js
import { OneAccountClient } from '@one-account/express-client';

const oneAccountClient = new OneAccountClient({
  clientId: 'YOUR_CLIENT_ID',
  clientSecret: 'YOUR_CLIENT_SECRET',
  handleErrors: true,
  internalUserLinking: (req, res, next) => {},
  global: {
    requiredScopes: ['fullaccess'],
  },
});

export default oneAccountClient;
```
If `handleErrors` is set to `true`, oneAccountAuth middleware will automatically respond, if an error occurs.
 
If `internalUserLinking` function is provided, oneAccountAuth middleware will call it when it verifies user, so you can get your internal user_id.

In property `global`, you can define `requiredScopes`, that are required for every endpoint, that uses oneAccountAuth middleware. This is used, if external services requests your API. Tokens, requested by this client, won't be checked.

## 4. Exchange authorization code for access token

You need to exchange authorization code for access token. There are many ways to do so, depending on how you serve you web app. 

Example with /token endpoint:

```js
import { getToken, getUserInfo } from './path/to/oneAccountClient.js';

app.post('/token', async (req, res) => {

  // exchange authorization code for access token
  const tokenData = await getToken({
    code: req.body.code,
    redirectURI: req.body.redirectURI,
  });

  // get user info (if needed)
  const userInfo = await getUserInfo({
    token: tokenData.accessToken,
  });

  res.status(200).json({
    code: 200,
    status: 'success',
    token: tokenData.accessToken,
    metadata: {
      full_name: userInfo.name,
      profile_picture: userInfo.picture,
    },
  });
});
```


## 5. Add oneAccountAuth middleware where you need it

```js
import { oneAccountAuth } from './path/to/oneAccountClient.js';

app.get('/some-endpoint', oneAccountAuth(), (req, res) => {
  res.status(200).json({
    isSuccess: true,
  });
});
```

If you want to check additional scopes, you can just pass them as `requiredScopes`.

```js
import { oneAccountAuth } from './path/to/oneAccountClient.js';

app.get('/protected', oneAccountAuth({ requiredScopes: ['protected.view'] }), (req, res) => {
  res.status(200).json({
    isSuccess: true,
  });
});
```


# ONE ACCOUNT INTEGRATION LEVELS

## Simplify your custom register experience
Let's say you just need some basic user info (name, email and profile picture) to simplify your custom register experience.
- user is redirected to 1A, where he or she grants access to profile scope
- user is redirected back to client to redirect_uri and receives authorization_code
- client requests token
- client gets token and id_token with sub (user id) and user info
- client validates id_token
- client can now use user info and save it to database

## Sign in with One Account
With this integration level, users with also be able to log in to your applications using One Account. This level is much more intuitive for users but stil allows you to implement custom login and register experiences and integrate with other social sign in or identity services. In unlikely event of One Account outage or security compromises, only users that used Sign in with One Account and have not set up another way to sign in to their account will be affected.
- user is redirected to 1A, where he or she grants access to profile scope
- user is redirected back to client to redirect_uri and receives authorization_code
- client requests token
- client gets token and id_token with sub (user id) and user info
- client validates id_token
- client checks if user already exists (searches its users table for sub from id_token)
- if user exists, client generates token/session and logs user in;
  if user does not exist, client saves user to database, generates token/session and logs user in

## One Account Token Services
In case you do not want to generate tokens to users and save them in database or use JWTs, you can ask One Account to generate and save tokens for you. In this scenario your app completely relies on One Account.
- user is redirected to 1A, where he or she grants access to profile scope
- user is redirected back to client to redirect_uri and receives authorization_code
- client requests token
- client gets token and id_token with sub (user id) and user info
- client validates id_token
- client checks if user already exists (searches its users table for sub from id_token)
- if user exists, client saves id_token to cookies
  if user does not exist, client saves user to database, and saves id_token to cookies

Authorization
- user requests a protected endpoint
- client validates id_token from cookies
- client searches its users table for sub from id_token database and retrieved its custom user id
- client returns protected data

## One Account Complete Authentication/Authorization Ecosystem
In case you want to open your endpoints for third-party developers and share data with them if user approves to do so, you can use One Account's Complete Authentication/Authorization Ecosystem. This integration level allows you to make one endpoints for both users requesting data from browser and third-party app that used backend server to access data. It is very similar to One Account Token Services, but here, you can specify required scopes for external apps.
