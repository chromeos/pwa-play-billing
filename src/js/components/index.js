/*
 *  Copyright 2021 Google LLC
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *       http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

// Add support for Web Components to older browsers.
import '@webcomponents/webcomponentsjs/webcomponents-loader';

// Material Design Buttons
import '@material/mwc-button';
import '@material/mwc-icon';
import '@material/mwc-icon-button';
import '@material/mwc-top-app-bar-fixed';
import '@material/mwc-snackbar';

// Custom components
import './sku-holder';
import './sku-list';
import './profile-menu';
import './app-bar';
import './coin-dialog';
import './theme-picker';
