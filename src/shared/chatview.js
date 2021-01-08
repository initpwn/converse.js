import log from '@converse/headless/log';
import tpl_chatbox_message_form from 'templates/chatbox_message_form.js';
import tpl_toolbar from 'templates/toolbar.js';
import { ElementView } from '@converse/skeletor/src/element.js';
import { __ } from 'i18n';
import { _converse, api, converse } from '@converse/headless/core';
import { debounce } from 'lodash-es';
import { html, render } from 'lit-html';

const u = converse.env.utils;

export default class BaseChatView extends ElementView {

    initDebounced () {
        this.markScrolled = debounce(this._markScrolled, 100);
        this.debouncedScrollDown = debounce(this.scrollDown, 100);

        // For tests that use Jasmine.Clock we want to turn of
        // debouncing, since setTimeout breaks.
        if (api.settings.get('debounced_content_rendering')) {
            this.renderChatHistory = debounce(() => this.renderChatContent(false), 100);
            this.renderNotifications = debounce(() => this.renderChatContent(true), 100);
        } else {
            this.renderChatHistory = () => this.renderChatContent(false);
            this.renderNotifications = () => this.renderChatContent(true);
        }
    }

    renderChatContent (msgs_by_ref = false) {
        if (!this.tpl_chat_content) {
            this.tpl_chat_content = o => {
                return html`
                    <converse-chat-content .chatview=${this} .messages=${o.messages} notifications=${o.notifications}>
                    </converse-chat-content>
                `;
            };
        }
        const msg_models = this.model.messages.models;
        const messages = msgs_by_ref ? msg_models : Array.from(msg_models);
        render(this.tpl_chat_content({ messages, 'notifications': this.getNotifications() }), this.msgs_container);
    }

    renderMessageForm () {
        const form_container = this.querySelector('.message-form-container');
        render(
            tpl_chatbox_message_form(
                Object.assign(this.model.toJSON(), {
                    'hint_value': this.querySelector('.spoiler-hint')?.value,
                    'label_message': this.model.get('composing_spoiler') ? __('Hidden message') : __('Message'),
                    'label_spoiler_hint': __('Optional hint'),
                    'message_value': this.querySelector('.chat-textarea')?.value,
                    'show_send_button': api.settings.get('show_send_button'),
                    'show_toolbar': api.settings.get('show_toolbar'),
                    'unread_msgs': __('You have unread messages')
                })
            ),
            form_container
        );
        this.addEventListener('focusin', ev => this.emitFocused(ev));
        this.addEventListener('focusout', ev => this.emitBlurred(ev));
        this.renderToolbar();
    }

    renderToolbar () {
        if (!api.settings.get('show_toolbar')) {
            return this;
        }
        const options = Object.assign(
            {
                'model': this.model,
                'chatview': this
            },
            this.model.toJSON(),
            this.getToolbarOptions()
        );
        render(tpl_toolbar(options), this.querySelector('.chat-toolbar'));
        /**
         * Triggered once the _converse.ChatBoxView's toolbar has been rendered
         * @event _converse#renderToolbar
         * @type { _converse.ChatBoxView }
         * @example _converse.api.listen.on('renderToolbar', view => { ... });
         */
        api.trigger('renderToolbar', this);
        return this;
    }

    hideNewMessagesIndicator () {
        const new_msgs_indicator = this.querySelector('.new-msgs-indicator');
        if (new_msgs_indicator !== null) {
            new_msgs_indicator.classList.add('hidden');
        }
    }

    maybeFocus () {
        api.settings.get('auto_focus') && this.focus();
    }

    focus () {
        const textarea_el = this.getElementsByClassName('chat-textarea')[0];
        if (textarea_el && document.activeElement !== textarea_el) {
            textarea_el.focus();
        }
        return this;
    }

    show () {
        if (this.model.get('hidden')) {
            log.debug(`Not showing chat ${this.model.get('jid')} because it's set as hidden`);
            return;
        }
        if (u.isVisible(this)) {
            this.maybeFocus();
            return;
        }
        this.afterShown();
    }

    emitBlurred (ev) {
        if (this.contains(document.activeElement) || this.contains(ev.relatedTarget)) {
            // Something else in this chatbox is still focused
            return;
        }
        /**
         * Triggered when the focus has been removed from a particular chat.
         * @event _converse#chatBoxBlurred
         * @type { _converse.ChatBoxView | _converse.ChatRoomView }
         * @example _converse.api.listen.on('chatBoxBlurred', (view, event) => { ... });
         */
        api.trigger('chatBoxBlurred', this, ev);
    }

    emitFocused (ev) {
        if (this.contains(ev.relatedTarget)) {
            // Something else in this chatbox was already focused
            return;
        }
        /**
         * Triggered when the focus has been moved to a particular chat.
         * @event _converse#chatBoxFocused
         * @type { _converse.ChatBoxView | _converse.ChatRoomView }
         * @example _converse.api.listen.on('chatBoxFocused', (view, event) => { ... });
         */
        api.trigger('chatBoxFocused', this, ev);
    }

    async getHeadingDropdownItem (promise_or_data) { // eslint-disable-line class-methods-use-this
        const data = await promise_or_data;
        return html`
            <a href="#" class="dropdown-item ${data.a_class}" @click=${data.handler} title="${data.i18n_title}"
                ><i class="fa ${data.icon_class}"></i>${data.i18n_text}</a
            >
        `;
    }

    /**
     * Called when the chat content is scrolled up or down.
     * We want to record when the user has scrolled away from
     * the bottom, so that we don't automatically scroll away
     * from what the user is reading when new messages are received.
     *
     * Don't call this method directly, instead, call `markScrolled`,
     * which debounces this method by 100ms.
     * @private
     */
    _markScrolled (ev) {
        let scrolled = true;
        let scrollTop = null;
        const is_at_bottom =
            this.msgs_container.scrollTop + this.msgs_container.clientHeight >= this.msgs_container.scrollHeight - 62; // sigh...

        if (is_at_bottom) {
            scrolled = false;
            this.onScrolledDown();
        } else if (this.msgs_container.scrollTop === 0) {
            /**
             * Triggered once the chat's message area has been scrolled to the top
             * @event _converse#chatBoxScrolledUp
             * @property { _converse.ChatBoxView | _converse.ChatRoomView } view
             * @example _converse.api.listen.on('chatBoxScrolledUp', obj => { ... });
             */
            api.trigger('chatBoxScrolledUp', this);
        } else {
            scrollTop = ev.target.scrollTop;
        }
        u.safeSave(this.model, { scrolled, scrollTop });
    }

    /**
     * Scrolls the chat down.
     *
     * This method will always scroll the chat down, regardless of
     * whether the user scrolled up manually or not.
     * @param { Event } [ev] - An optional event that is the cause for needing to scroll down.
     */
    scrollDown (ev) {
        ev?.preventDefault?.();
        ev?.stopPropagation?.();
        if (this.model.get('scrolled')) {
            u.safeSave(this.model, {
                'scrolled': false,
                'scrollTop': null
            });
        }
        if (this.msgs_container.scrollTo) {
            const behavior = this.msgs_container.scrollTop ? 'smooth' : 'auto';
            this.msgs_container.scrollTo({ 'top': this.msgs_container.scrollHeight, behavior });
        } else {
            this.msgs_container.scrollTop = this.msgs_container.scrollHeight;
        }
        this.onScrolledDown();
    }

    onScrolledDown () {
        this.hideNewMessagesIndicator();
        if (!this.model.isHidden()) {
            this.model.clearUnreadMsgCounter();
            // Clear location hash if set to one of the messages in our history
            const hash = window.location.hash;
            hash && this.model.messages.get(hash.slice(1)) && _converse.router.history.navigate();
        }
        /**
         * Triggered once the chat's message area has been scrolled down to the bottom.
         * @event _converse#chatBoxScrolledDown
         * @type {object}
         * @property { _converse.ChatBox | _converse.ChatRoom } chatbox - The chat model
         * @example _converse.api.listen.on('chatBoxScrolledDown', obj => { ... });
         */
        api.trigger('chatBoxScrolledDown', { 'chatbox': this.model }); // TODO: clean up
    }

    updateCharCounter (chars) {
        if (api.settings.get('message_limit')) {
            const message_limit = this.querySelector('.message-limit');
            const counter = api.settings.get('message_limit') - chars.length;
            message_limit.textContent = counter;
            if (counter < 1) {
                u.addClass('error', message_limit);
            } else {
                u.removeClass('error', message_limit);
            }
        }
    }
}
