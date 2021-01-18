
class ChatBoxViews {

    constructor () {
        this.views = {};
    }

    add (key, val) {
        this.views[key] = val;
    }

    get (key) {
        return this.views[key];
    }

    remove (key) {
        delete this.views[key];
    }

    map (f) {
        return Object.values(this.views).map(f);
    }

    forEach (f) {
        return Object.values(this.views).forEach(f);
    }

    filter (f) {
        return Object.values(this.views).filter(f);
    }

    closeAllChatBoxes () {
        return Promise.all(Object.values(this.views).map(v => v.close({ 'name': 'closeAllChatBoxes' })));
    }
}

export default ChatBoxViews;
