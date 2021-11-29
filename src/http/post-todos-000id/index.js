const arc = require('@architect/functions')
const { upsert } = require('@architect/shared/crud')
const { auth } = require('@architect/shared/auth')

exports.handler = arc.http.async(auth, http)

async function http (req) {
  await upsert(req.session.accountID, { ...req.body, id: req.params.id})

  return {
    location: `/`
  }
}
