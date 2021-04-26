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
import { capitalCase } from 'capital-case';

import '@material/mwc-select';
import '@material/mwc-button';

import './sku-list';

/**
 *
 *
 * @class ThemePicker
 * @extends {LitElement}
 */
class ThemePicker extends LitElement {
  /**
   *
   *
   * @readonly
   * @static
   * @memberof ThemePicker
   */
  static get properties() {
    return {
      themes: { type: Array },
      purchasedTheme: { type: String },
    };
  }

  /**
   * Creates an instance of ThemePicker.
   * @memberof ThemePicker
   */
  constructor() {
    super();
    this.themes = [''];
    this.purchasedTheme = '';
    this._currentSelection = '';
  }

  /**
   *
   *
   * @return {*}
   * @memberof ThemePicker
   */
  render() {
    return html`
      <p style="font-weight: bold;">Choose a new theme</p>
      <mwc-select style="margin: 8px;" outlined id="theme-select">
        ${this.themes.map(
          (theme) =>
            html`<mwc-list-item value="${theme}" ?selected=${this.purchasedTheme == theme}
              >${this._formatTitle(theme)}</mwc-list-item
            >`,
        )} </mwc-select
      ><br />
      <mwc-button
        style="margin: 8px;"
        raised
        label="Change theme for 25 coin"
        @click="${this._onNewThemePurchased}"
        ?disabled=${this._currentSelection == this.purchasedTheme}
      ></mwc-button>
    `;
  }

  /**
   *
   *
   * @memberof ThemePicker
   */
  firstUpdated() {
    const themeSelector = this.shadowRoot.getElementById('theme-select');
    themeSelector.addEventListener('selected', this._onSelected.bind(this));
  }

  /**
   *
   *
   * @param {*} themeName
   * @return {*}
   * @memberof ThemePicker
   */
  _formatTitle(themeName) {
    return capitalCase(themeName.replace(/_/g, ' '));
  }

  /**
   *
   *
   * @memberof ThemePicker
   */
  _onSelected() {
    const themeSelector = this.shadowRoot.getElementById('theme-select');
    this._currentSelection = themeSelector.value;
    this.requestUpdate();
    if (this.themes != undefined) {
      const e = new CustomEvent('color-selected', {
        detail: {
          selectedColor: this._currentSelection,
        },
        bubbles: true,
        composed: true,
      });
      this.dispatchEvent(e);
    }
  }

  /**
   * Resets the picker selection to that of the current theme.
   *
   * @memberof ThemePicker
   */
  resetPickerSelection() {
    const themeSelector = this.shadowRoot.getElementById('theme-select');
    themeSelector.items.forEach((item) => {
      if (item.value == this.purchasedTheme) {
        item.selected = true;
      } else {
        item.selected = false;
      }
    });
  }

  /**
   * Lets the main application know that a theme purchase has been created.
   *
   * @memberof ThemePicker
   */
  _onNewThemePurchased() {
    const themeSelector = this.shadowRoot.getElementById('theme-select');
    const e = new CustomEvent('color-purchased', {
      detail: {
        selectedColor: themeSelector.value,
      },
      bubbles: true,
      composed: true,
    });
    this.dispatchEvent(e);
  }
}

customElements.define('theme-picker', ThemePicker);
