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

/* global firebase */
// Imports Firebase from [reserved URLs](https://firebase.google.com/docs/hosting/reserved-urls)
import '/__/firebase/8.2.4/firebase-app.js';
import '/__/firebase/8.2.4/firebase-auth.js';
import '/__/firebase/8.2.4/firebase-firestore.js';
import '/__/firebase/8.2.4/firebase-functions.js';
import '/__/firebase/init.js';

import { authenticated } from './application-store';

/**
 * Firebase class
 */
export class Firebase {
  /**
   * Constructor
   * @param {DOMElement} appBar
   * @param {function} log - The logging function to use
   */
  constructor(appBar, log) {
    // Firebase initialization
    this.appBar = appBar;
    this.log = log;

    this.firebase = firebase;
    this.provider = new firebase.auth.GoogleAuthProvider();

    this.bearer = null;

    // TODO: Update user in state management so other things that rely on the user being authenticated can be properly activated
    this.firebase.auth().onAuthStateChanged((user) => {
      if (user) {
        this.log(user.email);
        this.log(user.photoURL);
        this.log(user.displayName);
        authenticated.set(true);
        this.appBar.setAttribute('photourl', user.photoURL);
      } else {
        this.log('no user');
        authenticated.set(false);
        this.appBar.setAttribute('photourl', '');
      }
    });

    this.appBar.addEventListener('sign-in', this.login.bind(this));
    this.appBar.addEventListener('sign-out', this.logout.bind(this));
  }

  /**
   * Logs user in
   */
  async login() {
    try {
      await this.firebase.auth().signInWithPopup(this.provider);
      this.log('User sign in successful');
    } catch (error) {
      this.log('Something went wrong!');
      this.log(error.message);
    }
  }

  /**
   * Log usr out
   */
  async logout() {
    try {
      await this.firebase.auth().signOut();
      this.log('User was logged out');
    } catch (error) {
      this.log('User could not be logged out');
      this.log(error.message);
    }
  }

  /**
   * Generate bearer header with user id token for POST requests
   * ID token is JSON Web Token (JWT) used to identify the user to a Firebase service.
   */
  async getApiHeader() {
    const user = this.firebase.auth().currentUser;
    if (user && !this.bearer) {
      this.bearer = new Headers();
      this.bearer.append('Authorization', `Bearer ${await user.getIdToken(false)}`);
      this.bearer.append('Content-Type', 'application/json');
    }
    return this.bearer;
  }
}
