const arc = require('@architect/functions')
const { auth } = require('@architect/shared/auth')
const { upsert } = require('@architect/shared/crud')

exports.handler = arc.http.async(auth, http)

async function http (req) {
  await upsert(req.session.accountID, req.body)

  return {
    location: `/`
  }
}
