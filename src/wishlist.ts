import { initPage, setupBookDrawer } from './shared';

initPage().then(user => { if (user) setupBookDrawer(); });
