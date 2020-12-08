import { html } from 'lit-html';
import { _converse } from '@converse/headless/core';

export default () => {
    const { chatboxes, CONTROLBOX_TYPE, CHATROOMS_TYPE } = _converse;
    return html`
        ${chatboxes.map(m => {
            if (m.get('type') === CONTROLBOX_TYPE) {
                return html`<converse-controlbox></converse-controlbox>`;
            } else if (m.get('type') === CHATROOMS_TYPE) {
                return html`<converse-muc jid="${m.get('jid')}"></converse-muc>`;
            } else {
                return html`<converse-chat jid="${m.get('jid')}"></converse-chat>`;
            }
        })}
    `;
};
