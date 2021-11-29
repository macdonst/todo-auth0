## Architect

The fastest way to create a Architect application is to run the following npm command:

```bash
npm init @architect todo-auth0
```

Replace the contents of `src/http/get-index/index.js` with:

```javascript
exports.handler = async function http (req) {
  return {
    statusCode: 200,
    headers: {
      'cache-control': 'no-cache, no-store, must-revalidate, max-age=0, s-maxage=0',
      'content-type': 'text/html; charset=utf8'
    },
    body: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Architect</title>
  <style>
     * { margin: 0; padding: 0; box-sizing: border-box; } body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; } .max-width-320 { max-width: 20rem; } .margin-left-8 { margin-left: 0.5rem; } .margin-bottom-16 { margin-bottom: 1rem; } .margin-bottom-8 { margin-bottom: 0.5rem; } .padding-32 { padding: 2rem; } .color-grey { color: #333; } .color-black-link:hover { color: black; }
  </style>
</head>
<body class="padding-32">
  <h1 class="margin-bottom-16">
    Architect Todo Auth0
  </h1>
</body>
</html>
`
  }
}
```

Run the project in Development mode:

```bash
cd todo-auth0
npm start
```

And confirm it is working at http://localhost:3333.

## Authentication

Let's add a couple of routes to our application to handle authentication. Open the `app.arc` file and add two new lines to the bottom for our `callback` and `logout` routes.

```arc
@app
todo-auth0

@http
get /
get /callback
```

Then quit the development server and run the following command to generate the `callback` route:

```bash
arc init
```

You will notice this create a two new folders in the `src/http` directory, `get-callback` and `get-logout` which will be used to handle the `/callback` and `logout` routes.

Create a `.env` file in your root project folder and add:

```env
AUTH0_BASE_URL=http://localhost:3333
AUTH0_ISSUER_BASE_URL=https://<name-of-your-tenant>.<region-you-selected>.auth0.com
AUTH0_CLIENT_ID=get-from-auth0-dashboard
AUTH0_CLIENT_SECRET=get-from-auth0-dashboard
```

> AUTH0_CLIENT_ID and AUTH0_CLIENT_SECRET can be found at Applications > Settings > Basic Information in the Auth0 Dashboard.
>
> You will need to quit the development server and re-run the npm start command anytime new environment variables are added to the .env file

Let's update our `src/http/get-index/index.js` file to add the ability to log in and out:

```javascript
const arc = require('@architect/functions')

exports.handler = arc.http.async(http)

async function http (req) {
  const {AUTH0_ISSUER_BASE_URL: baseUrl, AUTH0_CLIENT_ID: clientId } = process.env

  const loginUrl=`${baseUrl}/authorize?response_type=code&client_id=${clientId}&redirect_uri=http://localhost:3333/callback&scope=openid%20profile`

  let session = await arc.http.session.read(req)

  return {
    statusCode: 200,
    headers: {
      'cache-control': 'no-cache, no-store, must-revalidate, max-age=0, s-maxage=0',
      'content-type': 'text/html; charset=utf8'
    },
    body: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Architect</title>
  <style>
     * { margin: 0; padding: 0; box-sizing: border-box; } body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; } .max-width-320 { max-width: 20rem; } .margin-left-8 { margin-left: 0.5rem; } .margin-bottom-16 { margin-bottom: 1rem; } .margin-bottom-8 { margin-bottom: 0.5rem; } .padding-32 { padding: 2rem; } .color-grey { color: #333; } .color-black-link:hover { color: black; }
  </style>
</head>
<body class="padding-32">
  <h1 class="margin-bottom-16">
    Architect Todo Auth0 ${session.jwt.name ? `${session.jwt.name}` : ''}
  </h1>
  <div>
  ${!session.token ?  `<a href="${loginUrl}" class="color-black-link">Login</a>` : `<a href="/logout" class="color-black-link">Logout</a>`}
  </div>
</body>
</html>
`
  }
}
```

Clicking the login link will redirect you to the Auth0 login page where you will be asked to grant access to your application. Once you grant access, Auth0 will re-direct you to your `/callback` route where the authorization code will be included in the URL query string.

Once we have the authorization code we will need to exchange it for an access token and store the access token in the session. Consequently, we now need to update the `src/http/get-callback/index.js` file to handle the `/callback` route:

```javascript
const arc = require('@architect/functions')
const fetch = require('node-fetch')
const jwt_decode = require('jwt-decode')

exports.handler = arc.http.async(http)

async function http (req) {
  const {
    AUTH0_ISSUER_BASE_URL: baseUrl,
    AUTH0_CLIENT_ID: clientId,
    AUTH0_CLIENT_SECRET: clientSecret
  } = process.env

  const params = new URLSearchParams()
  params.append('grant_type', 'authorization_code')
  params.append('code', req.query.code)
  params.append('client_id', clientId)
  params.append('client_secret', clientSecret)
  params.append('redirect_uri', 'http://localhost:3333/callback')

  const response = await fetch(`${baseUrl}/oauth/token`, {
    method: 'post',
    body: params,
    headers: {'Content-Type': 'application/x-www-form-urlencoded'}
  });
  const data = await response.json();
  const decoded = jwt_decode(data.id_token)

  return {
    session: {token: data, name: decoded.name, accountID: decoded.nickname},
    location: '/'
  }
}
```

When the user clicks the logout link, we will need to remove the access token from the session. To do this, we will need to update the `src/http/get-logout/index.js` file:

```javascript
const arc = require('@architect/functions')
const fetch = require('node-fetch')

exports.handler = arc.http.async(http)

async function http (req) {
  const {
    AUTH0_ISSUER_BASE_URL: baseUrl,
    AUTH0_CLIENT_ID: clientId
  } = process.env

  const logoutUrl=`${baseUrl}/v2/logout?client_id=${clientId}&returnTo=http://localhost:3333`
  await fetch(logoutUrl);

  return {
    session: {},
    location: '/'
  }
}
```

Great, now we have a way to authorize and authenticate users but we need a way to store the user's todo list.

## DynamoDB

DynamoDB is an incredibly powerful fully managed NoSQL database which we will use to store our todo list. Instead of jumping over to the AWS console and creating a new table, we will modify the `app.arc` file and run `arc init` to create a new table for us.

```arc
@app
todo-auth0

@http
get /
get /callback
get /logout

@tables
data
  scopeID *String
  dataID **String
  ttl TTL
```

In order to make dealing with DynamoDB easier, we will add the `@begin/data` package to our project:

```bash
npm i @begin/data
```
