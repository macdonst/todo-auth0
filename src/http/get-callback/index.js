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
