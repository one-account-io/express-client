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
      full_name: userInfo.fullName,
      profile_picture: userInfo.profilePicture,
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
  }
);
```

If you want to check additional scopes, you can just pass them as `requiredScopes`.

```js
import { oneAccountAuth } from './path/to/oneAccountClient.js';

app.get('/protected', oneAccountAuth({ requiredScopes: ['protected.view'] }), (req, res) => {
    res.status(200).json({
      isSuccess: true,
    });
  }
);
```
