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

async function upsert(accountID, {id = nanoid(), content, completed = false, created_at = Date.now(), updated_at = Date.now()}) {
    if (accountID) {
        const todos = (await read(accountID)).filter(todo => todo.id !== id)

        console.log(completed)
        console.log(typeof completed)
        await data.set({
            table: 'todos',
            key: accountID,
            items: [...todos, { content, completed: completed === "true" ? true : false, id, created_at, updated_at }]
        })
    }
}
