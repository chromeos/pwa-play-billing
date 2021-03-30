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

import { purchases, profile } from './application-store';
/**
 *
 * @param {DOMElement} box - A DOM element to attach the log to.
 * @return {function} - A function that can be used to log things to the console and the log box
 */
export function Log(box) {
  return function (input) {
    console.log(input);
    box.innerText += `${input}
    `;
  };
}

/**
 * Creates a notification mechanism to alert the user to changes that occur.
 *
 * @export
 * @param {DOMElement} snackbar - A mwc-snackbar element to attach messages to.
 * @return {function} - A funciton that can be used to notify the user.
 */
export function Notifier(snackbar) {
  return function (message) {
    snackbar.labelText = message;
    snackbar.show();
  };
}

/**
 * Refreshes the available items and purchases state object.
 *
 * @export
 * @param {PlayBillingService} service
 * @param {User} user
 */
export async function refreshPurchases(service, user) {
  // Get purchases and available items, and attach them to skuList
  if (user) {
    profile.set(await user.getInfo());
  }
  if (service) {
    purchases.set((await service.getPurchases()) || []);
  }
}

/**
 * Sets the HTML theme property.
 *
 * @export
 * @param {string} themeColor
 */
export function changeTheme(themeColor) {
  const htmlDocument = document.getElementsByTagName('HTML')[0];
  if (themeColor in VALID_THEME_NAMES) {
    htmlDocument.style.setProperty('--mdc-theme-primary', VALID_THEME_NAMES[themeColor]);
  }
}

export const VALID_THEME_NAMES = {
  orange_you_glad_I_didnt_say_banana_orange: 'orange',
  one_eyed_one_horned_flyin_purple_people_eater: 'purple',
  gross_green: 'green',
  specific_blue: 'blue',
  retro_red: 'red',
};

export const BASIC_SUB = 'basic_sub';

export const PREMIUM_SUB = 'premium_sub';
