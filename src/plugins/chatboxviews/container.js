
class ChatBoxViews {

    constructor () {
        this.views = {};
    }

    add (key, val) {
        this.views[key] = val;
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
}

export default ChatBoxViews;
