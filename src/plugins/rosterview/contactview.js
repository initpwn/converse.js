import log from "@converse/headless/log";
import tpl_pending_contact from "./templates/pending_contact.js";
import tpl_requesting_contact from "./templates/requesting_contact.js";
import tpl_roster_item from "./templates/roster_item.js";
import { ElementViewWithAvatar } from 'shared/avatar.js';
import { __ } from 'i18n';
import { _converse, api, converse } from "@converse/headless/core";
import { render } from 'lit-html';

const u = converse.env.utils;


class RosterContactView extends ElementViewWithAvatar {

    events = {
        "click .accept-xmpp-request": "acceptRequest",
        "click .decline-xmpp-request": "declineRequest",
        "click .open-chat": "openChat",
        "click .remove-xmpp-contact": "removeContact"
    }

    async initialize () {
        this.model = _converse.roster.get(this.getAttribute('id'));
        await this.model.initialized;
        this.listenTo(this.model, "change", this.render);
        this.listenTo(this.model, "highlight", this.render);
        this.listenTo(this.model, 'vcard:change', this.render);
        this.listenTo(this.model.presence, "change:show", this.render);
        this.render();
    }

    render () {
        const ask = this.model.get('ask');
        const requesting  = this.model.get('requesting');
        const subscription = this.model.get('subscription');
        const jid = this.model.get('jid');

        if ((ask === 'subscribe') || (subscription === 'from')) {
            /* ask === 'subscribe'
             *      Means we have asked to subscribe to them.
             *
             * subscription === 'from'
             *      They are subscribed to use, but not vice versa.
             *      We assume that there is a pending subscription
             *      from us to them (otherwise we're in a state not
             *      supported by converse.js).
             *
             *  So in both cases the user is a "pending" contact.
             */
            const display_name = this.model.getDisplayName();
            render(tpl_pending_contact(Object.assign(this.model.toJSON(), { display_name })), this);

        } else if (requesting === true) {
            const display_name = this.model.getDisplayName();
            render(tpl_requesting_contact(
                Object.assign(this.model.toJSON(), {
                    display_name,
                    'desc_accept': __("Click to accept the contact request from %1$s", display_name),
                    'desc_decline': __("Click to decline the contact request from %1$s", display_name),
                    'allow_chat_pending_contacts': api.settings.get('allow_chat_pending_contacts')
                })
            ), this);
        } else if (subscription === 'both' || subscription === 'to' || u.isSameBareJID(jid, _converse.connection.jid)) {
            this.renderRosterItem(this.model);
        }
        return this;
    }

    renderRosterItem (item) {
        const STATUSES = {
            'dnd': __('This contact is busy'),
            'online': __('This contact is online'),
            'offline': __('This contact is offline'),
            'unavailable': __('This contact is unavailable'),
            'xa': __('This contact is away for an extended period'),
            'away': __('This contact is away')
        };

        const show = item.presence.get('show') || 'offline';
        let status_icon;
        if (show === 'online') {
            status_icon = 'fa fa-circle chat-status chat-status--online';
        } else if (show === 'away') {
            status_icon = 'fa fa-circle chat-status chat-status--away';
        } else if (show === 'xa') {
            status_icon = 'far fa-circle chat-status chat-status-xa';
        } else if (show === 'dnd') {
            status_icon = 'fa fa-minus-circle chat-status chat-status--busy';
        } else {
            status_icon = 'fa fa-times-circle chat-status chat-status--offline';
        }
        const display_name = item.getDisplayName();
        render(tpl_roster_item(
            Object.assign(item.toJSON(), {
                show,
                display_name,
                status_icon,
                'desc_status': STATUSES[show],
                'num_unread': item.get('num_unread') || 0,
                classes: ''
            })
        ), this);
        this.renderAvatar();
        return this;
    }

    openChat (ev) {
        ev?.preventDefault?.();
        this.model.openChat();
    }

    async removeContact (ev) {
        ev?.preventDefault?.();
        if (!api.settings.get('allow_contact_removal')) { return; }
        if (!confirm(__("Are you sure you want to remove this contact?"))) { return; }

        try {
            await this.model.removeFromRoster();
            if (this.model.collection) {
                // The model might have already been removed as
                // result of a roster push.
                this.model.destroy();
            }
        } catch (e) {
            log.error(e);
            api.alert('error', __('Error'),
                [__('Sorry, there was an error while trying to remove %1$s as a contact.', this.model.getDisplayName())]
            );
        }
    }

    async acceptRequest (ev) {
        ev?.preventDefault?.();

        await _converse.roster.sendContactAddIQ(
            this.model.get('jid'),
            this.model.getFullname(),
            []
        );
        this.model.authorize().subscribe();
    }

    declineRequest (ev) {
        if (ev && ev.preventDefault) { ev.preventDefault(); }
        const result = confirm(__("Are you sure you want to decline this contact request?"));
        if (result === true) {
            this.model.unauthorize().destroy();
        }
        return this;
    }
}

api.elements.define('converse-roster-contact', RosterContactView);
