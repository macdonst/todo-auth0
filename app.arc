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

# @aws
# profile default
# region us-west-1
