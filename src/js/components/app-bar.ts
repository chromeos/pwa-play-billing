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

import { IconButton } from '@material/mwc-icon-button';
import { LitElement, html, HTMLTemplateResult } from 'lit';
import { customElement, property, query } from 'lit/decorators.js';
import './profile-menu';
import { ProfileMenu } from './profile-menu';

/**
 * AppBar is a class that shows a bar at the top of the screen with options for signing in and signing out users.
 *
 * @class AppBar
 * @extends {LitElement}
 */
@customElement('app-bar')
export class AppBar extends LitElement {
  @property() title: string = '';
  @property() photoURL: string = '';
  @property() coinAmt: number = 0;

  @query('#profile-menu') _profileMenu!: ProfileMenu;
  @query('#login_btn') _loginBtn!: IconButton;
  
  /**
   * render shows the lit-element to the user and runs the templating engine.
   *
   * @return {*}
   * @memberof AppBar
   */
  render(): HTMLTemplateResult {
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
  _showCoinMenu(): void {
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
   * @memberof AppBar
   */
  firstUpdated(): void {
    console.log(this.photoURL);
    const profileMenu = this._profileMenu;
    profileMenu.addEventListener('sign-in', () => {
      this._dispatchSignInRequest('sign-in');
    });
    profileMenu.addEventListener('sign-out', () => {
      this._dispatchSignInRequest('sign-out');
    });
  }

  /**
   * _dispatchSignInRequest forwards the sign-in sign-out requests to the end consumer of the app-bar
   *
   * @param {*} type
   * @memberof AppBar
   */
  _dispatchSignInRequest(type: string): void {
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
  _showMenu(): void {
    const profileMenu = this._profileMenu;
    const iconBtn = this._loginBtn;
    profileMenu.setAnchor(iconBtn);
    profileMenu.show();
  }
}
