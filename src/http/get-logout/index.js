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
