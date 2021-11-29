## Architect

The fastest way to create a Architect application is to run the following npm command:

```bash
npm init @architect todo-auth0
```

Replace the contents of `src/http/get-index/index.js` with:

```javascript
// src/http/get-index/index.js
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
get /logout
```

Then quit the development server and run the following command to generate the `callback` and `logout` routes:

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
// src/http/get-index/index.js
const arc = require('@architect/functions')

exports.handler = arc.http.async(http)

async function http (req) {
  const {
    AUTH0_BASE_URL: baseUrl,
    AUTH0_ISSUER_BASE_URL: issuerBaseUrl,
    AUTH0_CLIENT_ID: clientId
  } = process.env

  const loginUrl=`${issuerBaseUrl}/authorize?response_type=code&client_id=${clientId}&redirect_uri=${baseUrl}/callback&scope=openid%20profile`

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
  <style>
     * { margin: 0; padding: 0; box-sizing: border-box; } body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; } .max-width-320 { max-width: 20rem; } .margin-left-8 { margin-left: 0.5rem; } .margin-bottom-16 { margin-bottom: 1rem; } .margin-bottom-8 { margin-bottom: 0.5rem; } .padding-32 { padding: 2rem; } .color-grey { color: #333; } .color-black-link:hover { color: black; }
  </style>
</head>
<body class="padding-32">
  <h1 class="margin-bottom-16">
    Architect Todo Auth0
  </h1>
  <div class="margin-bottom-16">
  ${session.name ? `Welcome ${session.name}!` : ''} ${!session.token ?  `<a href="${loginUrl}">Login</a>` : `<a href="/logout">Logout</a>`}
  </div>
</body>
</html>
`
  }
}
`
  }
}
```

Clicking the login link will redirect you to the Auth0 login page where you will be asked to grant access to your application. Once you grant access, Auth0 will re-direct you to the applicatons `/callback` route where the authorization code will be included as a URL query parameter.

Once we have the authorization code we will need to exchange it for an access token and store the access token in the session. Consequently, we now need to update the `src/http/get-callback/index.js` file to handle the `/callback` route:

```javascript
// src/http/get-callback/index.js
const arc = require('@architect/functions')
const fetch = require('node-fetch')
const jwt_decode = require('jwt-decode')

exports.handler = arc.http.async(http)

async function http (req) {
  const {
    AUTH0_BASE_URL: baseUrl,
    AUTH0_ISSUER_BASE_URL: issuerBaseUrl,
    AUTH0_CLIENT_ID: clientId,
    AUTH0_CLIENT_SECRET: clientSecret
  } = process.env

  const params = new URLSearchParams()
  params.append('grant_type', 'authorization_code')
  params.append('code', req.query.code)
  params.append('client_id', clientId)
  params.append('client_secret', clientSecret)
  params.append('redirect_uri', `${baseUrl}/callback`)

  const response = await fetch(`${issuerBaseUrl}/oauth/token`, {
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

After successfully exchanging the authorization code for an access token, we will redirect the user to the home page. We will also store the user's name in the session as we will use this value to display the user's name in the home page and use the account ID as a key when interacting with our DB.

When the user clicks the logout link, we will need to remove the access token from the session. To do this, we will need to update the `src/http/get-logout/index.js` file:

```javascript
// src/http/get-logout/index.js
const arc = require('@architect/functions')
const fetch = require('node-fetch')

exports.handler = arc.http.async(http)

async function http (req) {
  const {
    AUTH0_BASE_URL: baseUrl,
    AUTH0_ISSUER_BASE_URL: issuerBaseUrl,
    AUTH0_CLIENT_ID: clientId
  } = process.env

  const logoutUrl=`${issuerBaseUrl}/v2/logout?client_id=${clientId}&returnTo=${baseUrl}`
  await fetch(logoutUrl);

  return {
    session: {},
    location: '/'
  }
}
```

Great, now we have a way to authorize and authenticate users but we need a way to store the user's todo list but before we forget, let's install the two new dependencies we introduced `node-fetch` and `jwt-decode`:


```bash
npm i node-fetch jwt-decode
```

> You will need to quit the development server and re-run the npm start command anytime new npm packages are added to the project.

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

That's it, that's the tweet.

You have now provisioned a new table in DynamoDB and you can start using it to store your todo list. No clicking around in various web consoles in order to setup your database.

In order to make dealing with DynamoDB easier, we will add the [@begin/data](https://docs.begin.com/en/data/begin-data) package to our project:

```bash
npm i @begin/data
```

When it comes to our data schema for our todo's we'll want it to look like this:

```yaml
data:
    key:
        type: string
    todos:
        type: array
        todo:
            type: object
            properties:
                id:
                    type: string
                content:
                    type: string
                completed:
                    type: boolean
                createdAt:
                    type: integer
                updatedAt:
                    type: integer
```

Where the `key` is the account ID and the `todos` is an array of todo items.

Now we can start using the `@begin/data` package to interact with our DynamoDB table. The `src/shared` folder is a special folder, Architect copies the contents of src/shared into all Lambdas at deploy time. Create a new file in the `src/shared` directory called `crud.js`.

```javascript
// src/shared/crud.js
const { customAlphabet } = require('nanoid')
const nanoid = customAlphabet('1234567890BCDFGHJKLMNPQRSTVWXZ', 8) // no vowels
const data = require('@begin/data')

module.exports = { read, upsert }

async function read(accountID) {
    let todos = []
    if (accountID) {
        const response = await data.get({
            table: 'todos',
            key: accountID
        })
        todos = response ? response.items : []
        todos.sort((a, b) => a.created_at - b.created_at)
    }
    return todos
}

async function upsert(accountID, {
        id = nanoid(),
        content,
        completed = false,
        created_at = Date.now(),
        updated_at = Date.now()
    }) {

    if (accountID) {
        const todos = (await read(accountID)).filter(todo => todo.id !== id)
        await data.set({
            table: 'todos',
            key: accountID,
            items: [...todos, {
                content,
                completed: completed === "true" ? true : false,
                id,
                created_at,
                updated_at
            }]
        })
    }
}
```

For the `read` function we fetch the todo list from DynamoDB and sort it by the `created_at` property. If the user hasn't created any todo's yet, we'll return an empty array.

The `upsert` function will create a new todo item and add it to the list if no `id` is provided. If an `id` is provided, we'll update the existing todo item.

Now that we can read and write to our database it's time to update our UI to display the todo list.

## Shared Views

We are going to create a couple of components, called `Todos` and `Todo`, that will be used by our Lambda functions to display our todo list. We'll create these files under `src/views/components` as the `src/views` folder is a special folder Architect copies the contents of src/views into all GET request Lambdas at deploy time.

The first component will be a list of todo items and we'll call it `src/views/components/todos.js`.

```javascript
// src/views/components/todos.js
const Todo = require('./todo')

module.exports = async function Todos ({items}) {
    return `
        <form action="/todos" method="post" class="margin-bottom-16">
            <input type="text" name="content" placeholder="Add a todo" />
            <input type="submit" value="Add" />
        </form>
        <ul class="margin-left-8 margin-bottom-16">
            ${items.length > 0 ? items.map(todo => Todo(todo)).join('') : `Great job, you've completed all your todos`}
        </ul>
    `
}
```

The `Todos` component will render a form and a list of todo items. The form will allow the user to add a new todo item. The rendering of each todo item will be handled by the `Todo` component.

```javascript
// src/views/components/todo.js
module.exports = function Todo ({content, completed, id, created_at}) {
    return `
    <li>
        ${completed ? `<del>${content}</del>` : content}
        <form action="/todos/${id}" method="post" style="display: inline;">
            <input type="hidden" name="content" value="${content}" />
            <input type="hidden" name="created_at" value="${created_at}" />
            <input type="hidden" name="completed" value="${!completed}" />
            <input type="submit" value="${completed ? 'Undo' : 'Complete'}" />
        </form>
    </li>
`
}
```

Once we have created these components we will need to update our `src/views/index.js` file to render the todos.

```javascript
// src/http/get-index/index.js
const arc = require('@architect/functions')
const { read } = require('@architect/shared/crud')
const Todos = require('@architect/views/components/todos')

exports.handler = arc.http.async(http)

async function http (req) {
  const {
    AUTH0_BASE_URL: baseUrl,
    AUTH0_ISSUER_BASE_URL: issuerBaseUrl,
    AUTH0_CLIENT_ID: clientId
  } = process.env

  const loginUrl=`${issuerBaseUrl}/authorize?response_type=code&client_id=${clientId}&redirect_uri=${baseUrl}/callback&scope=openid%20profile`

  let session = await arc.http.session.read(req)

  let items = await read(session.accountID)

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
  <style>
     * { margin: 0; padding: 0; box-sizing: border-box; } body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; } .max-width-320 { max-width: 20rem; } .margin-left-8 { margin-left: 0.5rem; } .margin-bottom-16 { margin-bottom: 1rem; } .margin-bottom-8 { margin-bottom: 0.5rem; } .padding-32 { padding: 2rem; } .color-grey { color: #333; } .color-black-link:hover { color: black; }
  </style>
</head>
<body class="padding-32">
  <h1 class="margin-bottom-16">
    Architect Todo Auth0
  </h1>
  <div class="margin-bottom-16">
  ${session.name ? `Welcome ${session.name}!` : ''} ${!session.token ?  `<a href="${loginUrl}">Login</a>` : `<a href="/logout">Logout</a>`}
  </div>
  ${session.token ? await Todos({items}) : ''}
</body>
</html>
`
  }
}
```

Great we can see the add todo form but trying to add a new todo item will fail. We'll need to add new routes to handle the submission and completion of todo items.

## Update Routes

Once again we open the `app.arc` file and add two new lines to the bottom of the `@http` section for the create `post /todos` and update `post /todos/:id` routes.

```arc
@app
todo-auth0

@http
get /
get /callback
get /logout
post /todos
post /todos/:id

@tables
data
  scopeID *String
  dataID **String
  ttl TTL
```

This will create `src/http/post-todos/index.js` and `src/http/post-todos-000id/index.js` files.

For `src/http/post-todos/index.js` replace the contents with the following to handle the submission of a new todo item:

```javascript
// src/http/post-todos/index.js
const arc = require('@architect/functions')
const { upsert } = require('@architect/shared/crud')

exports.handler = arc.http.async(http)

async function http (req) {
  await upsert(req.session.accountID, req.body)

  return {
    location: `/`
  }
}

```

For `src/http/post-todos-000id/index.js` replace the contents with the following to handle the updating of an existing todo item:

```javascript
// src/http/post-todos-000id/index.js
const arc = require('@architect/functions')
const { upsert } = require('@architect/shared/crud')

exports.handler = arc.http.async(http)

async function http (req) {
  await upsert(req.session.accountID, { ...req.body, id: req.params.id})

  return {
    location: `/`
  }
}
```

So we are now all setup to add new todo items and complete existing ones or are we?

## Protecting Routes

Whoops! We forgot to protect our routes. We are going to create a new file called `src/shared/auth.js` to handle the authentication of our routes.

```javascript
// src/shared/auth.js
const arc = require('@architect/functions')
const jwt_decode = require('jwt-decode')

module.exports = { auth }

async function auth(req) {
    const session = await arc.http.session.read(req)
    if (!session.token) {
        return {
            status: 401,
            json: { errors: [ 'authorization_token_missing' ] }
          }
    }

    try {
        const decoded = jwt_decode(session.token.id_token)
        if (decoded.aud !== process.env.AUTH0_CLIENT_ID) {
            return {
                status: 401,
                json: { errors: [ 'token_audience_invalid' ] }
            }
        }
    } catch (err) {
        return {
            status: 401,
            json: { errors: [ 'invalid_jwt' ] }
        }
    }
    return
}
```

The `auth` function will check to make sure there is a authorization token in the session and that it is valid. If there is no token or the token is invalid, the function will return a 401 response with the `errors` property set to an array containing the error message.

Then in both `src/http/post-todos/index.js` and `src/http/post-todos-000id/index.js` we will include the `auth` function and call it before handling the request.

```javascript
const { auth } = require('@architect/shared/auth')

exports.handler = arc.http.async(auth, http)
```

Congrats you now have a functional todo app! Go try it out.

Psst! Want me to blow your mind? Try disabling JavaScript on your browser ([Chrome](https://developer.chrome.com/docs/devtools/javascript/disable/#:~:text=Open%20Chrome%20DevTools.,to%20open%20the%20Command%20Menu.&text=Start%20typing%20javascript%20%2C%20select%20Disable,JavaScript%20is%20now%20disabled.), [Firefox](https://www.lifewire.com/disable-javascript-in-firefox-446039), [Safari](https://www.lifewire.com/disable-javascript-in-safari-4103708) and see what happens. The site still works because there is no client side JavaScript.

## Next Steps

Want to try it out for yourself:

1. Sign up for a free account on [Begin](https://begin.com).
2. Click the button below to deploy a this ToDo app to your account.

(deploy to begin button)


