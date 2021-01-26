import RosterGroup from './group.js';
import log from "@converse/headless/log";
import { Collection } from "@converse/skeletor/src/collection";
import { _converse, api, converse } from "@converse/headless/core";

const u = converse.env.utils;


/**
 * @class
 */
const RosterGroups = Collection.extend({
    model: RosterGroup,

    initialize () {
        _converse.roster.on("add", c => this.addRosterContact(c));
        _converse.roster.on('change', c => this.onContactChange(c));

        api.listen.on('rosterContactsFetched', () => {
            _converse.roster.each(c => this.addRosterContact(c, {'silent': true}));
        });
    },

    comparator (a, b) {
        const HEADER_WEIGHTS = {};
        HEADER_WEIGHTS[_converse.HEADER_UNREAD] = 0;
        HEADER_WEIGHTS[_converse.HEADER_REQUESTING_CONTACTS] = 1;
        HEADER_WEIGHTS[_converse.HEADER_CURRENT_CONTACTS]    = 2;
        HEADER_WEIGHTS[_converse.HEADER_UNGROUPED]           = 3;
        HEADER_WEIGHTS[_converse.HEADER_PENDING_CONTACTS]    = 4;

        a = a.get('name');
        b = b.get('name');
        const WEIGHTS =  HEADER_WEIGHTS;
        const special_groups = Object.keys(HEADER_WEIGHTS);
        const a_is_special = special_groups.includes(a);
        const b_is_special = special_groups.includes(b);
        if (!a_is_special && !b_is_special ) {
            return a.toLowerCase() < b.toLowerCase() ? -1 : (a.toLowerCase() > b.toLowerCase() ? 1 : 0);
        } else if (a_is_special && b_is_special) {
            return WEIGHTS[a] < WEIGHTS[b] ? -1 : (WEIGHTS[a] > WEIGHTS[b] ? 1 : 0);
        } else if (!a_is_special && b_is_special) {
            const a_header = _converse.HEADER_CURRENT_CONTACTS;
            return WEIGHTS[a_header] < WEIGHTS[b] ? -1 : (WEIGHTS[a_header] > WEIGHTS[b] ? 1 : 0);
        } else if (a_is_special && !b_is_special) {
            const b_header = _converse.HEADER_CURRENT_CONTACTS;
            return WEIGHTS[a] < WEIGHTS[b_header] ? -1 : (WEIGHTS[a] > WEIGHTS[b_header] ? 1 : 0);
        }
    },

    onContactChange (contact) {
        if (contact.changed?.subscription) {
            if (contact.changed.subscription === 'from') {
                this.addContactToGroup(contact, _converse.HEADER_PENDING_CONTACTS);
            } else if (['both', 'to'].includes(contact.get('subscription'))) {
                this.addExistingContact(contact);
            }
        }
        if (contact.changed?.num_unread && contact.get('num_unread')) {
            this.addContactToGroup(contact, _converse.HEADER_UNREAD);
        }
        if (contact.changed?.ask && contact.changed.ask === 'subscribe') {
            this.addContactToGroup(contact, _converse.HEADER_PENDING_CONTACTS);
        }
        if (contact.changed?.subscription && contact.changed.requesting === 'true') {
            this.addContactToGroup(contact, _converse.HEADER_REQUESTING_CONTACTS);
        }
    },

    isSelf (jid) { // eslint-disable-line class-methods-use-this
        return u.isSameBareJID(jid, _converse.connection.jid);
    },

    addRosterContact (contact, options) {
        const jid = contact.get('jid');
        if (contact.get('subscription') === 'both' || contact.get('subscription') === 'to' || this.isSelf(jid)) {
            this.addExistingContact(contact, options);
        } else {
            if (!api.settings.get('allow_contact_requests')) {
                log.debug(
                    `Not adding requesting or pending contact ${jid} `+
                    `because allow_contact_requests is false`
                );
                return;
            }
            if ((contact.get('ask') === 'subscribe') || (contact.get('subscription') === 'from')) {
                this.addContactToGroup(contact, _converse.HEADER_PENDING_CONTACTS, options);
            } else if (contact.get('requesting') === true) {
                this.addContactToGroup(contact, _converse.HEADER_REQUESTING_CONTACTS, options);
            }
        }
    },

    addContactToGroup (contact, name, options) {
        this.getGroup(name).contacts.add(contact, options);
    },

    addExistingContact (contact, options) {
        let groups;
        if (api.settings.get('roster_groups')) {
            groups = contact.get('groups');
            groups = (groups.length === 0) ? [_converse.HEADER_UNGROUPED] : groups;
        } else {
            groups = [_converse.HEADER_CURRENT_CONTACTS];
        }
        if (contact.get('num_unread')) {
            groups.push(_converse.HEADER_UNREAD);
        }
        groups.forEach(g => this.addContactToGroup(contact, g, options));
    },

    /**
     * Returns the group as specified by name.
     * Creates the group if it doesn't exist.
     * @method _converse.RosterGroups#getGroup
     * @private
     * @param {string} name
     */
    getGroup (name) {
        return this.get(name) || this.create({name});
    },

    /**
     * Fetches all the roster groups from sessionStorage.
     * @private
     * @method _converse.RosterGroups#fetchRosterGroups
     * @returns { Promise } - A promise which resolves once the groups have been fetched.
     */
    fetchRosterGroups () {
        return new Promise(success => {
            this.fetch({
                success,
                // We need to first have all groups before
                // we can start positioning them, so we set
                // 'silent' to true.
                silent: true,
            });
        });
    }
});

export default RosterGroups;
