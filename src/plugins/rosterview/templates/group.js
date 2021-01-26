import { __ } from 'i18n';
import { _converse, api, converse } from "@converse/headless/core";
import { contactsComparator } from '@converse/headless/plugins/roster/utils.js';
import { html } from "lit-html";
import { repeat } from 'lit-html/directives/repeat.js';
import { toggleGroup } from '../utils.js';

const { u } = converse.env;


/**
 * Returns a boolean indicating whether this contact should
 * generally be visible in the roster.
 * It doesn't check for the more specific case of whether
 * the group it's in is collapsed.
 */
function mayBeShown (contact) {
    const chatStatus = contact.presence.get('show');
    if (api.settings.get('hide_offline_users') && chatStatus === 'offline') {
        // If pending or requesting, show
        if ((contact.get('ask') === 'subscribe') ||
                (contact.get('subscription') === 'from') ||
                (contact.get('requesting') === true)) {
            return true;
        }
        return false;
    }
    return true;
}


function renderContact (contact) {
    const jid = contact.get('jid');
    const extra_classes = [];
    if (_converse.isUniView()) {
        const chatbox = _converse.chatboxes.get(jid);
        if (chatbox && !chatbox.get('hidden')) {
            extra_classes.push('open');
        }
    }
    const ask = contact.get('ask');
    const requesting  = contact.get('requesting');
    const subscription = contact.get('subscription');
    if ((ask === 'subscribe') || (subscription === 'from')) {
        /* ask === 'subscribe'
         *      Means we have asked to subscribe to them.
         *
         * subscription === 'from'
         *      They are subscribed to us, but not vice versa.
         *      We assume that there is a pending subscription
         *      from us to them (otherwise we're in a state not
         *      supported by converse.js).
         *
         *  So in both cases the user is a "pending" contact.
         */
        extra_classes.push('pending-xmpp-contact');
    } else if (requesting === true) {
        extra_classes.push('requesting-xmpp-contact');
    } else if (subscription === 'both' || subscription === 'to' || u.isSameBareJID(jid, _converse.connection.jid)) {
        extra_classes.push('current-xmpp-contact');
        extra_classes.push(subscription);
    }
    return html`
        <li class="list-item d-flex controlbox-padded ${extra_classes.join(' ')}">
            <converse-roster-contact
                class="${contact.presence.get('show')}"
                data-status="${contact.presence.get('show')}"
                id="${contact.get('id')}"></converse-roster-contact>
        </li>`;
}


export default  (o) => {
    const i18n_title = __('Click to hide these contacts');
    const collapsed = _converse.roster.state.get('collapsed_groups');
    const contacts = o.contacts.filter(mayBeShown);
    contacts.sort(contactsComparator);
    return html`
        <div class="roster-group">
            <a href="#" class="list-toggle group-toggle controlbox-padded" title="${i18n_title}" @click=${ev => toggleGroup(ev, o.name)}>
                <span class="fa ${ (collapsed.includes(o.name)) ? 'fa-caret-right' : 'fa-caret-down' }"></span> ${o.name}
            </a>
            <ul class="items-list roster-group-contacts ${ (collapsed.includes(o.name)) ? 'collapsed' : '' }" data-group="${o.name}">
                ${ repeat(contacts, renderContact) }
            </ul>
        </div>`;
}
