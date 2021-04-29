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

import { LitElement, html, HTMLTemplateResult } from 'lit';
import { customElement, property, query } from 'lit/decorators.js';

import '@material/mwc-menu';
import '@material/mwc-list/mwc-list-item.js';
import { Menu } from '@material/mwc-menu';

/**
 * ProfileMenu shows the users profile menu and the available options specific to that user.
 *
 * @class ProfileMenu
 * @extends {LitElement}
 */
@customElement('profile-menu')
export class ProfileMenu extends LitElement {

  @property({type: Boolean, reflect: true}) loggedIn: boolean = false;
  
  private signedOutHtml: HTMLTemplateResult = html`
      <mwc-list-item @click="${this._requestSignIn}">Sign In</mwc-list-item>
    `;
  private signedInHtml = html`
      <mwc-list-item @click="${this._requestSignOut}">Sign Out</mwc-list-item>
    `;

  @query('#menu') _menu!: Menu;

  /**
   *
   *
   * @return {*}
   * @memberof ProfileMenu
   */
  render(): HTMLTemplateResult {
    return html`
      <div style="position: relative;">
        <mwc-menu id="menu">
          ${this.loggedIn ? this.signedInHtml : this.signedOutHtml}
          <mwc-list-item @click="${this._showGitHubPage}">About</mwc-list-item>
          <mwc-list-item @click="${this._showPlayStore}">View In Play Store</mwc-list-item>
        </mwc-menu>
      </div>
    `;
  }

  /**
   * _showPlayStore loads the github page for this project.
   *
   * @memberof ProfileMenu
   */
  _showPlayStore(): void {
    window.open('https://play.google.com/store/apps/details?id=<PLAY_PACKAGE_NAME>', '_blank');
  }

  /**
   * _showGitHubPage loads the github page for this project.
   *
   * @memberof ProfileMenu
   */
  _showGitHubPage(): void {
    window.open('https://github.com/chromeos/pwa-play-billing', '_blank');
  }

  /**
   * _requestSignIn sends the sign-in event to the parent.
   *
   * @memberof ProfileMenu
   */
  _requestSignIn(): void {
    const event = new CustomEvent('sign-in', {
      detail: {
        'sign-in': true,
      },
    });
    this.dispatchEvent(event);
  }

  /**
   * _requestSignOut sends the sign-out event to the parent.
   *
   * @memberof ProfileMenu
   */
  _requestSignOut(): void {
    const event = new CustomEvent('sign-out', {
      detail: {
        'sign-out': true,
      },
    });
    this.dispatchEvent(event);
  }

  /**
   * show asks the menu to be shown.
   *
   * @memberof ProfileMenu
   */
  show(): void {
    console.log('show called');
    const menu = this._menu;
    menu.show();
  }

  /**
   * setAnchor specifies where the menu should be anchored in the page.
   *
   * @param {*} element
   * @memberof ProfileMenu
   */
  setAnchor(element: HTMLElement): void {
    const menu = this._menu;
    menu.anchor = element;
  }
}
