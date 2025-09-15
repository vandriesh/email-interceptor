import inlineCss from '../../../dist/chatgpt/index.css?inline';
import { initAppWithShadow } from '@extension/shared';
import App from '@src/matches/chatgpt/App';

initAppWithShadow({ id: 'CEB-extension-chatgpt', app: <App />, inlineCss });
