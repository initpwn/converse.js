import debounce from 'lodash/debounce';
import tpl_roster from "./templates/roster.js";
import { ElementView } from "@converse/skeletor/src/element";
import { Model } from '@converse/skeletor/src/model.js';
import { _converse, api, converse } from "@converse/headless/core";
import { render } from 'lit-html';

const u = converse.env.utils;


/**
 * @class
 * @namespace _converse.RosterView
 * @memberOf _converse
 */
export default class RosterView extends ElementView {
    events = {
        'click a.controlbox-heading__btn.add-contact': 'showAddContactModal',
        'click a.controlbox-heading__btn.sync-contacts': 'syncContacts'
    }

    async initialize () {
        await api.waitUntil('rosterInitialized')
        this.debouncedRender = debounce(this.render, 100);
        this.listenTo(_converse.roster, "add", this.debouncedRender);
        this.listenTo(_converse.roster, "destroy", this.debouncedRender);
        this.listenTo(_converse.roster, "remove", this.debouncedRender);
        this.listenTo(_converse.roster, 'change', this.renderIfRelevantChange);
        this.listenTo(_converse.roster.state, "change", this.render);
        _converse.presences.on('change:show', () => this.debouncedRender());
        api.listen.on('rosterGroupsFetched', () => this.render());
        api.listen.on('rosterContactsFetched', () => this.render());
        this.render();
        this.listenToRosterFilter();
        /**
         * Triggered once the _converse.RosterView instance has been created and initialized.
         * @event _converse#rosterViewInitialized
         * @example _converse.api.listen.on('rosterViewInitialized', () => { ... });
         */
        api.trigger('rosterViewInitialized');
    }

    render () {
        render(tpl_roster(), this);
    }

    renderIfRelevantChange (model) {
        const attrs = ['ask', 'requesting', 'groups', 'num_unread'];
        const changed = model.changed || {};
        if (Object.keys(changed).filter(m => attrs.includes(m)).length) {
            this.render();
        }
    }

    showAddContactModal (ev) { // eslint-disable-line class-methods-use-this
        api.modal.show(_converse.AddContactModal, {'model': new Model()}, ev);
    }

    listenToRosterFilter () {
        this.filter_view = this.querySelector('converse-roster-filter');
        this.filter_view.addEventListener('update', () => this.render());
    }

    // TODO: Remove
    /**
     * Called whenever the filter settings have been changed or
     * when contacts have been added, removed or changed.
     *
     * Use the debounced version (see above) so that it doesn't get called for every
     * contact fetched from browser storage.
     */
    _updateFilter () {
        const filter = new _converse.RosterFilter();
        const type = filter.get('filter_type');
        if (type === 'state') {
            this.filter(filter.get('chat_state'), type);
        } else {
            this.filter(filter.get('filter_text'), type);
        }
    }

    // TODO: Remove
    filter (query, type) {
        const views = Object.values(this.getAll());
        // First ensure the filter is restored to its original state
        views.forEach(v => (v.model.contacts.length > 0) && v.show().filter(''));
        // Now we can filter
        query = query.toLowerCase();
        if (type === 'groups') {
            views.forEach(view => {
                if (!view.model.get('name').toLowerCase().includes(query)) {
                    u.slideIn(view.el);
                } else if (view.model.contacts.length > 0) {
                    u.slideOut(view.el);
                }
            });
        } else {
            views.forEach(v => v.filter(query, type));
        }
    }

    async syncContacts (ev) { // eslint-disable-line class-methods-use-this
        ev.preventDefault();
        u.addClass('fa-spin', ev.target);
        _converse.roster.data.save('version', null);
        await _converse.roster.fetchFromServer();
        api.user.presence.send();
        u.removeClass('fa-spin', ev.target);
    }
}

api.elements.define('converse-roster', RosterView);
