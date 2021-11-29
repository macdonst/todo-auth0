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
