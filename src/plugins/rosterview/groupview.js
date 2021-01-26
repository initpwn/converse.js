import './contactview.js';
import tpl_group from "./templates/group_header.js";
import { ElementView } from "@converse/skeletor/src/element";
import { _converse, api, converse } from "@converse/headless/core";
import { render } from 'lit-html';

const u = converse.env.utils;

/**
 * @class
 * @namespace _converse.RosterGroupView
 * @memberOf _converse
 */
class RosterGroupView extends ElementView {
    sortEvent = 'presenceChanged'

    initialize () {
        this.model = _converse.rostergroups.get(this.getAttribute('data-group'));
        this.listenTo(this.model.contacts, "change", this.render);
        this.render();
    }

    render () {
        render(tpl_group({
            'toggle': ev => this.toggle(ev),
            'contacts': this.model.contacts,
            'desc_group_toggle': this.model.get('description'),
            'label_group': this.model.get('name'),
            'toggle_state': this.model.get('state'),
        }), this);
    }

    show () {
        u.showElement(this);
        if (this.model.get('state') === _converse.OPENED) {
            Object.values(this.getAll())
                .filter(v => v.mayBeShown())
                .forEach(v => u.showElement(v.el));
        }
        return this;
    }

    /* Given a list of contacts, make sure they're filtered out
     * (aka hidden) and that all other contacts are visible.
     * If all contacts are hidden, then also hide the group title.
     * @private
     * @method _converse.RosterGroupView#filterOutContacts
     * @param { Array } contacts
     */
    filterOutContacts (contacts=[]) {
        let shown = 0;
        this.model.contacts.forEach(contact => {
            const contact_view = this.get(contact.get('id'));
            if (contacts.includes(contact)) {
                u.hideElement(contact_view.el);
            } else if (contact_view.mayBeShown()) {
                u.showElement(contact_view.el);
                shown += 1;
            }
        });
        if (shown) {
            u.showElement(this);
        } else {
            u.hideElement(this);
        }
    }

    /**
     * Given the filter query "q" and the filter type "type",
     * return a list of contacts that need to be filtered out.
     * @private
     * @method _converse.RosterGroupView#getFilterMatches
     * @param { String } q - The filter query
     * @param { String } type - The filter type
     */
    getFilterMatches (q, type) {
        if (q.length === 0) {
            return [];
        }
        q = q.toLowerCase();
        const contacts = this.model.contacts;
        if (type === 'state') {
            const sticky_groups = [_converse.HEADER_REQUESTING_CONTACTS, _converse.HEADER_UNREAD];
            if (sticky_groups.includes(this.model.get('name'))) {
                // When filtering by chat state, we still want to
                // show sticky groups, even though they don't
                // match the state in question.
                return [];
            } else if (q === 'unread_messages') {
                return contacts.filter({'num_unread': 0});
            } else if (q === 'online') {
                return contacts.filter(c => ["offline", "unavailable"].includes(c.presence.get('show')));
            } else {
                return contacts.filter(c => !c.presence.get('show').includes(q));
            }
        } else  {
            return contacts.filter(c => !c.getFilterCriteria().includes(q));
        }
    }

    /**
     * Filter the group's contacts based on the query "q".
     *
     * If all contacts are filtered out (i.e. hidden), then the
     * group must be filtered out as well.
     * @private
     * @method _converse.RosterGroupView#filter
     * @param { string } q - The query to filter against
     * @param { string } type
     */
    filter (q, type) {
        if (q === null || q === undefined) {
            type = type || _converse.rosterview.filter_view.model.get('filter_type');
            if (type === 'state') {
                q = _converse.rosterview.filter_view.model.get('chat_state');
            } else {
                q = _converse.rosterview.filter_view.model.get('filter_text');
            }
        }
        this.filterOutContacts(this.getFilterMatches(q, type));
    }
}

api.elements.define('converse-roster-group', RosterGroupView);
