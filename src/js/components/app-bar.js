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

import { LitElement, html } from 'lit';
import './profile-menu';

/**
 * AppBar is a class that shows a bar at the top of the screen with options for signing in and signing out users.
 *
 * @class AppBar
 * @extends {LitElement}
 */
class AppBar extends LitElement {
  /**
   * properties defines a set of user properties that can be set by a user.
   *
   * @readonly
   * @static
   * @memberof AppBar
   */
  static get properties() {
    return {
      title: { type: String },
      photoURL: { type: String, reflect: true },
      coinAmt: { type: Number },
    };
  }

  /**
   * Creates an instance of AppBar.
   * @memberof AppBar
   */
  constructor() {
    super();
    this.photoURL = '';
    this.coinAmt = 0;
  }

  /**
   * render shows the lit-element to the user and runs the templating engine.
   *
   * @return {*}
   * @memberof AppBar
   */
  render() {
    return html`
      <mwc-top-app-bar-fixed>
        <div slot="title">${this.title}</div>
        ${this.photoURL !== ''
          ? html`<p slot="actionItems" @click="${this._showCoinMenu}">
              <span id="coinAmt">${this.coinAmt}</span> coins <span><mwc-icon>toll</mwc-icon></span>
            </p>`
          : html``}
        ${this.photoURL !== ''
          ? html`<div
              id="login_btn"
              @click="${this._showMenu}"
              slot="actionItems"
              style='border-radius:50%; background-image: url("${this.photoURL}");
                background-size: 50px; width:50px; height: 50px; margin:8px;'
            ></div>`
          : html`<mwc-icon-button
              @click="${this._showMenu}"
              id="login_btn"
              icon="account_circle"
              label="Account"
              slot="actionItems"
            ></mwc-icon-button>`}
        <profile-menu id="profile-menu" ?loggedin=${this.photoURL !== ''}></profile-menu>
      </mwc-top-app-bar-fixed>
    `;
  }

  /**
   *
   *
   * @memberof AppBar
   */
  _showCoinMenu() {
    const event = new CustomEvent('show-coin-menu', {
      detail: {
        type: true,
      },
    });
    this.dispatchEvent(event);
  }

  /**
   * firstUpdated overrides the firstUpdated method of the LitElement class so it executes on the first update of the app.
   *
   * @param {*} props
   * @memberof AppBar
   */
  firstUpdated(props) {
    console.log(this.photoURL);
    const profileMenu = this.shadowRoot.getElementById('profile-menu');
    profileMenu.addEventListener('sign-in', (e) => {
      this._dispatchSignInRequest('sign-in');
    });
    profileMenu.addEventListener('sign-out', (e) => {
      this._dispatchSignInRequest('sign-out');
    });
  }

  /**
   * _dispatchSignInRequest forwards the sign-in sign-out requests to the end consumer of the app-bar
   *
   * @param {*} type
   * @memberof AppBar
   */
  _dispatchSignInRequest(type) {
    const event = new CustomEvent(type, {
      detail: {
        type: true,
      },
    });
    this.dispatchEvent(event);
  }

  /**
   *_showMenu launches the menu to be show to the user.
   *
   * @memberof AppBar
   */
  _showMenu() {
    const profileMenu = this.shadowRoot.getElementById('profile-menu');
    const iconBtn = this.shadowRoot.getElementById('login_btn');
    profileMenu.setAnchor(iconBtn);
    profileMenu.show();
  }
}

customElements.define('app-bar', AppBar);
