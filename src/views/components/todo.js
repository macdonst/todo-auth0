module.exports = function Todo ({content, completed, id, created_at}) {
    return `
    <li>
        ${completed ? `<del>${content}</del>` : content}
        <form action="/todos/${id}" method="post" style="display: inline;">
            <input type="hidden" name="content" value="${content}" />
            <input type="hidden" name="created_at" value="${created_at}" />
            <input type="hidden" name="completed" value="${!completed}" />
            <input type="submit" value="${completed ? 'Undo' : 'Complete'}" />
            <!-- input type="checkbox" name="completed" onChange="this.form.submit()" ${completed ? 'checked' : ''}/ -->
        </form>
    </li>
`
}
