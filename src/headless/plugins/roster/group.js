import { Model } from '@converse/skeletor/src/model.js';
import { __ } from 'i18n';
import { _converse } from "@converse/headless/core";


const RosterGroup = Model.extend({
    idAttribute: 'name',

    initialize (attributes) {
        this.set(Object.assign({
            description: __('Click to hide these contacts'),
            state: _converse.OPENED
        }, attributes));
        // Collection of contacts belonging to this group.
        this.contacts = new _converse.RosterContacts();

        _converse.roster.on('change:groups', this.onContactGroupChange);
        _converse.roster.on('change:groups', this.onContactGroupChange);
    },

    onContactGroupChange (contact) {
        const in_this_group = contact.get('groups').includes(this.get('name'));
        if (!in_this_group) {
            this.contacts.remove(contact);
        }
    }
});

export default RosterGroup;
