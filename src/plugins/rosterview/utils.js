import log from "@converse/headless/log";
import { _converse, api } from "@converse/headless/core";


export function highlightRosterItem (chatbox) {
    _converse.roster?.findWhere({'jid': chatbox.get('jid')})?.trigger('highlight');
}


export function insertRoster (view) {
    if (!view.model.get('connected') || api.settings.get("authentication") === _converse.ANONYMOUS) {
        return;
    }
    /* Place the rosterview inside the "Contacts" panel. */
    api.waitUntil('rosterViewInitialized')
        .then(() => view.controlbox_pane.el.insertAdjacentElement('beforeEnd', _converse.rosterview.el))
        .catch(e => log.fatal(e));
}

export function toggleGroup (ev, name) {
    ev?.preventDefault?.();
    const collapsed = _converse.roster.state.get('collapsed_groups');
    if (collapsed.includes(name)) {
        _converse.roster.state.save('collapsed_groups', collapsed.filter(n => n !== name));
    } else {
        _converse.roster.state.save('collapsed_groups', [...collapsed, name]);
    }
}
