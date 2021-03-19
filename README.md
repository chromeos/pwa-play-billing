# PWA Play Billing Sample Setup

- [PWA Play Billing Sample Setup](#pwa-play-billing-sample-setup)
- [Introduction](#introduction)
- [Checkout and setup](#checkout-and-setup)
- [Firebase setup](#firebase-setup)
  - [Set up Firebase Account](#set-up-firebase-account)
  - [Firebase Authentication](#firebase-authentication)
  - [Firebase Hosting](#firebase-hosting)
  - [Firebase Functions](#firebase-functions)
  - [Firebase Cloud Firestore](#firebase-cloud-firestore)
- [First deploy](#first-deploy)
- [Google Play Console setup](#google-play-console-setup)
  - [General setup](#general-setup)
  - [Package your PWA with Bubblewrap](#package-your-pwa-with-bubblewrap)
    - [Install Bubblewrap](#install-bubblewrap)
    - [Initialize project](#initialize-project)
    - [Build](#build)
  - [Upload your app to Google Play](#upload-your-app-to-google-play)
    - [Only if you have a new listing](#only-if-you-have-a-new-listing)
    - [Upload your package](#upload-your-package)
    - [Choose Testers](#choose-testers)
  - [Run the app](#run-the-app)
  - [Set up SKUs for in-app products and subscriptions](#set-up-skus-for-in-app-products-and-subscriptions)
    - [In-app products](#in-app-products)
    - [Subscriptions](#subscriptions)
    - [Notes](#notes)
- [Second Deploy](#second-deploy)
  - [Update “View In Play Store” link](#update-view-in-play-store-link)
  - [Update the Web App manifest.json](#update-the-web-app-manifestjson)
  - [Update Digital Asset Links](#update-digital-asset-links)
  - [Re-deploy](#re-deploy)
- [Google Play Developer API](#google-play-developer-api)
  - [Link API Project to your Play Console](#link-api-project-to-your-play-console)
  - [Setup a service account](#setup-a-service-account)
  - [Create service account key](#create-service-account-key)
- [Real-Time Developer Notifications (RTDN)](#real-time-developer-notifications-rtdn)
  - [Google Cloud Console setup](#google-cloud-console-setup)
  - [Play Console setup](#play-console-setup)
  - [Backend setup](#backend-setup)
- [Final deploy](#final-deploy)
- [Testing](#testing)
  - [Set up your device](#set-up-your-device)
  - [Set up License Testers](#set-up-license-testers)

# Introduction

This sample app demonstrates how you can publish your Progressive Web App (PWA) using Trusted Web Activities (TWA) on Google Play Store and receive payments with Google Play Billing using [Digital Goods API](https://developers.google.com/web/android/trusted-web-activity/receive-payments-play-billing) and [PaymentRequest API](https://github.com/w3c/payment-request).

The sample uses Firebase for static hosting and backend server operations for simplicity. However, you can use any other service to publish on Play Store and use Play Billing as well.

# Checkout and setup

```
$ git clone https://github.com/chromeos/pwa-play-billing
$ cd pwa-play-billing
$ npm install
$ cd functions
$ npm install
$ cd ..
$ npm start
```

# Firebase setup

## Set up Firebase Account

1. In order to start with Firebase, please visit the [Firebase Console](console.firebase.google.com) and create a Firebase account.
2. Once your Firebase account is created, revisit the console and create a new project by clicking the “Add project” button

![Add Firebase project.](images/image1.png 'image_tooltip')

3. Create a unique name for your project. Below the name input box will be the project ID, write it down.

![Create Firebase project name. Below, the full project ID is outlined.](images/image2.png 'image_tooltip')

4. The next page is regarding activating Google Analytics for your Firebase project. Turn this option off as this is just a test application and we don’t need analytics activated.
5. Firebase will then set up all the required resources for your project. When it’s done, you will see a “Your new project is ready” message with a continue option. Go ahead and click “Continue”.

## Firebase Authentication

The sample requires users to be signed-in with an account before they can purchase and consume in-app purchases. User accounts also allow a user to access their purchases across multiple devices (purchases made via the Play Store on Chrome OS, can still be accessed on an Android device).

1. To set up authentication, go to your project page in the [Firebase Console](https://console.firebase.google.com)
2. In the left-hand menu, click to expand the “Build” section and choose “Authentication”.
3. From there, click on the Sign-in method tab (If you see a “Get Started” button, clicking on it will take you to the same page as well).

![Add a sign-in method for Firebase authentication.](images/image3.png 'image_tooltip')

4. Click on the Google provider in the Sign-in providers list.
5. Turn the switch on to enable the Google Provider.
6. Give the project a unique name as this will be what is presented to your users to identify your app.
7. Choose an email address for the project support email.
8. Click Save to confirm changes.

![Choose a project support email.](images/image4.png 'image_tooltip')

The sample code loads the authentication method without needing to pass in the Web SDK configuration information because Firebase Hosted Configuration handles this automatically. To learn more about authentication, please visit the Firebase [documentation here](https://firebase.google.com/docs/auth).

## Firebase Hosting

1. In the left hand navigation menu for your project in the [Firebase console](https://console.firebase.google.com), click on the “Hosting” option. At the top of the page should be a Get Started link, click on it.

![Firebase Hosting is outlined in Firebase console menu.](images/image5.png 'image_tooltip')

2. The Get Started button will provide the command to install the [Firebase CLI](https://github.com/firebase/firebase-tools). That command is:

   ```
   $ npm install -g firebase-tools
   ```

3. After installing the Firebase CLI, you will need to login to Firebase. You can use the following command:

   ```
   $ firebase login
   ```

4. Finally, in the downloaded project, in the [.firebaserc](https://github.com/chromeos/pwa-play-billing/blob/main/.firebaserc#L3) file and the [firebase.json](https://github.com/chromeos/pwa-play-billing/blob/main/firebase.json#L3) file, replace `<FIREBASE_PROJECT_ID>` with your project ID you noted down earlier when you first created the Firebase project.

   ```
   // firebase.json
   {
   "hosting": {
       "site": "<FIREBASE_PROJECT_ID>",
       "public": "src",
   ...
   ```

   ```
   // .firebaserc
   {
   "projects": {
       "default": "<FIREBASE_PROJECT_ID>"
   }
   ```

[The frontend code can be found here.](https://github.com/chromeos/pwa-play-billing/tree/main/src)

## Firebase Functions

A large portion of granting purchase entitlements is controlled from the backend. The sample uses Firebase Functions to implement the backend functionality, as well as the real time developer notifications (RTDN).

**Note:** To use Firebase Functions, we need to enable a [Blaze billing plan](https://firebase.google.com/pricing?authuser=0). The Blaze billing plan offers a free starting quota to test this project without the need to incur costs. As you experiment and grow, your costs may grow as well, so it would be beneficial to test the project as necessary and address any cleanup operations that may be necessary to reduce costs.

1. To upgrade your project’s billing plan, click on the Functions option in the left hand navigation menu for your project in the [Firebase Console](https://console.firebase.google.com).
2. Click on “Upgrade project”
3. Confirm that the selected plan is Blaze.

   **Note:** If you don’t have a billing account yet, Firebase will take you to the flow to create a billing account. Complete the steps to create a billing account, and go back to Step 1.

![Setup billing account with Blaze plan.](images/image6.png 'image_tooltip')

4. Click Purchase to switch to the Blaze billing plan.

![Click "Purchase".](images/image7.png 'image_tooltip')

5. You can also set a budget alert to avoid unexpected bills in the confirmation page.

![Set a budget alert.](images/image8.png 'image_tooltip')

## Firebase Cloud Firestore

This sample uses [Firebase Cloud Firestore](https://firebase.google.com/docs/firestore) to store user information.

1. To set up Firestore, visit the Firestore tab in the Firebase Console and click Create Database.

![Cloud Firestore in Firebase console.](images/image9.png 'image_tooltip')

2. In the first step, choose “production mode” to keep the data private and click Next. The Admin SDK in the sample functions code handles the communications with the database.
3. In the second step, choose a Cloud Firestore location. Pick something close to your location where your functions are deployed. Then click Enable.

There are three key collections of data as shown below (Note that the document id was omitted from the tables as it is auto-generated). The sample’s backend code automatically populates these tables with Firebase Functions. If you’d like to generate your own SKUs via the Google Play Console, make sure to add them to the SKUs collection in Firestore.

<br/>

<table>
  <tr>
   <td colspan="3" ><strong>SKUS</strong>
   </td>
  </tr>
  <tr>
   <td><strong>Field</strong>
   </td>
   <td><strong>Type</strong>
   </td>
   <td><strong>Values</strong>
   </td>
  </tr>
  <tr>
   <td>sku
   </td>
   <td>string
   </td>
   <td>Value of a SKU defined in the Google Play Console
   </td>
  </tr>
  <tr>
   <td>type
   </td>
   <td>string
   </td>
   <td>One of {repeatable, onetime,  subscription}. These values represent the purchase behavior.
   </td>
  </tr>
</table>

<br/>

<table>
  <tr>
   <td colspan="3" ><strong>tokens</strong>
   </td>
  </tr>
  <tr>
   <td><strong>Field</strong>
   </td>
   <td><strong>Type</strong>
   </td>
   <td><strong>Values</strong>
   </td>
  </tr>
  <tr>
   <td>isValid
   </td>
   <td>boolean
   </td>
   <td>Verifies that this token provided was a valid token and can be used to identify purchases (prevents fraud)
   </td>
  </tr>
  <tr>
   <td>purchaseToken
   </td>
   <td>string
   </td>
   <td>A unique token identifier supplied by Google Play
   </td>
  </tr>
  <tr>
   <td>userDatabaseId
   </td>
   <td>string
   </td>
   <td>This references the users collection unique identifier for the user
   </td>
  </tr>
</table>

<br/>

<table>
  <tr>
   <td colspan="3" ><strong>users</strong>
   </td>
  </tr>
  <tr>
   <td><strong>Field</strong>
   </td>
   <td><strong>Type</strong>
   </td>
   <td><strong>Values</strong>
   </td>
  </tr>
  <tr>
   <td>accountName
   </td>
   <td>string
   </td>
   <td>Name on the account
   </td>
  </tr>
  <tr>
   <td>email
   </td>
   <td>string
   </td>
   <td>Email address
   </td>
  </tr>
  <tr>
   <td>hasBasicSub
   </td>
   <td>boolean
   </td>
   <td>True if the user has the basic subscription
   </td>
  </tr>
  <tr>
   <td>lastQueryTime
   </td>
   <td>number
   </td>
   <td>The last time that the user was queried from the database
   </td>
  </tr>
  <tr>
   <td>numCoins
   </td>
   <td>number
   </td>
   <td>The number of coins that the user has. Coins are repeatable purchase items that accumulate.
   </td>
  </tr>
  <tr>
   <td>photoEntitlements
   </td>
   <td>Array&lt;string>
   </td>
   <td>One-time purchase items that the user has.
   </td>
  </tr>
  <tr>
   <td>theme
   </td>
   <td>string
   </td>
   <td>The purchase made by using the repeatable purchase item. (i.e., the user purchased a red theme using coins that they purchased).
   </td>
  </tr>
</table>

<br/>

# Request an origin trial token

On [line 23 of index.html](https://github.com/chromeos/pwa-play-billing/blob/main/src/index.html#L23), you will see an option to insert an origin trial token. Visit [this link](https://developer.chrome.com/origintrials/#/view_trial/-5451607348931985407) to request an origin trial token for the Digital Goods API. Once you have your origin trial token, you can go and insert it on line 23 in the content attribute which currently holds the value `$ORIGIN_TRIAL_TOKEN`. To learn more about setting up origin trials, please see [this guide](http://googlechrome.github.io/OriginTrials/developer-guide.html).

# First deploy

After setting up Firebase, you can deploy just the hosting content first:

```
$ npm ci // Install the project
$ npm run deploy:hosting // Deploys only to hosting
```

You can now visit your PWA at `https://<project_id>.web.app`

Note that some functionality is still missing. We’ll set them up in the following sections and redeploy the app.

# Google Play Console setup

## General setup

To list your TWA in the Google Play Store, you’ll need to [create a developer account](https://play.google.com/apps/publish/signup/). There is a one-time $25 registration fee.

After your developer account is set up, go to “All apps” in the left navigation menu and select “Create app”. Once you fill out the required fields to create your app, you’ll be brought to the “Dashboard” where you’ll find step-by-step task guides to test, setup, and release your app. For more information on creating a new app, visit [Play Console help page](https://support.google.com/googleplay/android-developer/answer/9859152?hl=en).

## Package your PWA with Bubblewrap

[Bubblewrap](https://github.com/GoogleChromeLabs/bubblewrap/tree/master/packages/cli) is a command-line tool that will wrap your PWA in a Trusted Web Activity and output AAB and APK files that can be uploaded to the Play Console. To use Bubblewrap you need Node.js 10.0 or above.

During your first time running Bubblewrap, it will give you the option to download and install the dependencies, or you may [set them up manually](https://github.com/GoogleChromeLabs/bubblewrap/tree/master/packages/cli#manually-setting-up-the-environment) yourself. We recommend checking out the [quickstart guide](https://github.com/GoogleChromeLabs/bubblewrap/tree/master/packages/cli#quickstart-guide) for more details.

### Install Bubblewrap

```
$ npm i -g @bubblewrap/cli
```

### Initialize project

```
$ mkdir <new-project-dir>
$ cd <new-project-dir>
$ bubblewrap init --manifest https://<project.id>.web.app/manifest.json
```

This init command will parse the manifest and prompt you to enter or confirm values for your Android project. Fill out the “Application name” and “Short name” as you would like your app name to appear (note that you are restricted to 12 characters for “short name”).

![Bubblewrap init prompt for app info.](images/image10.png 'image_tooltip')

If you have an existing listing in the Play Store:

1. For “Application ID”, use your existing package name when asked.
2. Make sure to enter a version code higher than its existing versions.
3. When prompted for “Key store location” and “Key name”, pass in the same key store location and key name that you used before. Otherwise the Play Console will reject your new upload because you’ve signed it with different keys.

If you’re planning to create a new listing:

1. For “Application ID”, choose a new unique package name.
2. Leave the version code as is (default value of 1).
3. For “Key store location” and “Key name”, you may use the default or enter your preferred path and name. Bubblewrap will then let you know that it couldn’t find a key store at the provided path. Enter “Yes” to let it create a new signing key. Remember the passwords you entered for your new key store and key as you’ll be prompted for them later on when you build.

When the prompt asks you whether to enable Play Billing, respond “Yes”.

![Bubblewrap init prompt for enabling Play Billing feature.](images/image11.png 'image_tooltip')

### Build

```
$ bubblewrap build
```

After successfully building your project, in your project directory, you’ll see the APK (`app-release-signed.apk`) and AAB (`app-release-bundle.aab`) you can upload to your Play Console (next section).

Note that if you skipped the step for updating your Digital Asset Links above, you may receive a warning message which is safe to ignore for now.

> Read more about setting up Digital Asset Links at:
> https://developers.google.com/web/android/trusted-web-activity/quick-start#creating-your-asset-link-file
>
> Failed to run the PWA Quality Criteria checks. Skipping.

## Upload your app to Google Play

### Only if you have a new listing

Follow the tasks in the “Set up your app” section in the dashboard before moving on.

![In Play Console app Dashboard, the "Set up your app" checklist.](images/image12.png 'image_tooltip')

### Upload your package

1. We recommend you to publish to Internal Testing Track to speed up the time to start testing in the Play Store. You can access the Internal Testing Track by choosing on Internal testing on the left hand side menu.

![In Play Console, Internal testing page.](images/image13.png 'image_tooltip')

2. Click on the “Create new release” button.
3. If you haven’t uploaded a package before, Play Console will offer you to opt in for Play App Signing. This is highly recommended. Click Continue to opt in.
4. Click on the Upload button and choose the `app-release-bundle.aab` package generated by Bubblewrap.
5. Fill in “Release name” and “Release notes” fields and click Save.
6. Click on “Review release”.
7. Review the release and click on “Start rollout to Internal testing”. If you see a warning with the following message, you can ignore it for now. We’ll configure testers in the next step.

**Note:** This release will not be available to any users because you haven't specified any testers for it yet. Tip: configure your testing track to ensure that the release is available to your testers.

### Choose Testers

1. Click on Testers tab under Internal testing page

![Add testers on the Internal testing page.](images/image14.png 'image_tooltip')

2. Either click on “Create email list” to create a new testers list. Add email addresses of your testers into this list and save. You can also edit an existing list by clicking on the right arrow button.
3. Enable your testers list by clicking on the checkbox next to it.
4. Save changes.

![Enable testers list by clicking checkbox for each list name.](images/image15.png 'image_tooltip')

5. Click on the Copy link button under the “How testers join your test” to retrieve the URL to your testing track. Share this link with your testers. Testers need to follow this link and opt-in for receiving the testing version first to install your app.

![Copy link for URL to your testing track.](images/image16.png 'image_tooltip')

## Run the app

Now that the app is uploaded to Play Store, you should be able to opt-in for the testing track by following the test URL (copied above), and install the app through Play Store and run it on your device. Note that some functionality is still missing, and we’ll configure them in the following steps.

## Set up SKUs for in-app products and subscriptions

This section will cover the steps to set up your in-app products and subscriptions which will be purchasable via the Digital Goods API.

In the left-hand navigation menu, scroll down until you see the “Monetize” section and expand the “Products” menu. If you don’t see the “Monetize” section, make sure you’re in the app menu and not the general user menu. To see the app menu, go to “All apps” and select the corresponding app.

If you see “Missing requirements for accessing this page”, follow the instructions to set up a merchant account and come back to this page later.

### In-app products

1. Click on “In-app products”.
2. Click on the “Create product” button.
3. Enter `coins_100` as the Product ID. This cannot be changed later.
4. Fill in the name and description fields. Set a price, for example $1. You can always edit these fields later.
5. Click Save and then Activate.

Repeat this process for these Product IDs:

- `coins_200`
- `coins_1000`
- `onetime`

### Subscriptions

1. Click on “Subscriptions”.
2. Click on the “Create subscription” button.
3. Enter `basic_sub` as the Product ID. This cannot be changed later.
4. Fill in the name and description fields.
5. Set a billing period (e.g weekly) and price, for example $10. Note that the billing period cannot be changed later.
6. Click Save and then Activate.

### Notes

If you’d like to add your own SKUs, be sure to note down the “Product ID”s as that’s how they’ll be identified by the Digital Goods API. In the case of our sample code, we obtain the product IDs from the SKUs collection we populated in Firestore (see above). So make sure the SKUs you’ve added in the Play Console matches the information in the SKUs collection in Firestore (and vice versa). If not, please adjust either accordingly so they are aligned.

# Second Deploy

Now that you’ve successfully created your TWA and uploaded it to the Play Console, it’s time to update the missing information and redeploy your PWA again.

## Update “View In Play Store” link

After your first deploy, you might have noticed that when checking your PWA at `https://<project.id>.web.app`, clicking on the user profile icon will show a menu. One of the menu items is “View In Play Store” and clicking on it will take you to a broken link. Now that you’ve uploaded your app to the Play Store and released it to the internal testing track, you can update this link! In [./src/js/components/profile-menu.html](https://github.com/chromeos/pwa-play-billing/blob/main/src/js/components/profile-menu.js#L80) replace `<PLAY_PACKAGE_NAME>` with your app’s package name for easy access to install the TWA.

```
// profile-menu.html
...
 _showPlayStore() {
window.open(＇https://play.google.com/store/apps/details?id=<PLAY_PACKAGE_NAME>＇,＇_blank＇);
...
```

## Update the Web App manifest.json

To link your web application to the Android app, you will also need to reference in your web app’s manifest.json ([./src/manifest.json](https://github.com/chromeos/pwa-play-billing/blob/main/src/manifest.json) file) the Android package name. Replace the two instances of `<PLAY_PACKAGE_NAME>` with your app’s package name.

```
// manifest.json
{
 ...
 "android_package_name": "<PLAY_PACKAGE_NAME>",
 "prefer_related_applications": true,
 "related_applications": [
  {
   "id": "<PLAY_PACKAGE_NAME>",
   "platform": "chromeos_play",
  }
 ],
 ...
```

## Update Digital Asset Links

In order to publish your app to the Google Play Store and have your app be connected to the Play Store for purchasing, users need to use Digital Asset Links to validate that relationship. In our sample, this is done by publishing a Digital Asset Links JSON file at `https://<project.id>.web.app/.well-known/assetlinks.json`.

Update the [./src/.well-known/assetlinks.json file](https://github.com/chromeos/pwa-play-billing/blob/main/src/.well-known/assetlinks.json#L6-L7) by replacing `<PLAY_PACKAGE_NAME>` with your app’s package name and `<SIGNING_KEY_CERT>` with your signing key’s SHA-256 fingerprint. You can find the SHA-256 certificate fingerprint in “App Integrity” under the “Setup” section in the left hand menu of the Play Console or use this [link](https://play.google.com/console/developers/app/keymanagement) and choose your developer account and then your app to be redirected.

```
// assetlinks.json
[
 {
   "relation": ["delegate_permission/common.handle_all_urls"],
   "target": {
    "namespace": "android_app",
    "package_name": "<PLAY_PACKAGE_NAME>",
    "sha256_cert_fingerprints": ["<SIGNING_KEY_CERT>"]
   }
 }
]
```

For information on Digital Asset Links, please check out the following YouTube video:  
[Validating your Trusted Web Activity’s Digital Asset Links](https://youtu.be/3bAQPnxLd4c).

## Re-deploy

After updating the manifest.json and assetlinks.json files, remember to re-deploy your project to update your PWA.

```
$ npm run deploy
```

Double-check the manifest and asset links at `https://<project.id>.web.app/manifest.json` and `https://<project.id>.web.app/.well-known/assetlinks.json` to make sure they’ve updated.

# Google Play Developer API

Like in our sample, it is highly recommended that you verify purchases and tokens in your backend server with the [Google Play Developer API](https://developers.google.com/android-publisher), alongside using the Digital Goods API in your PWA. There are two main configuration steps before you can use the API in your backend code.

## Link API Project to your Play Console

To [link your Google Cloud project in the Play Console](https://developers.google.com/android-publisher/getting_started#using_an_existing_api_project), go to the “API access” section in the left-hand navigation general user menu (not the app menu). This is under “Settings” > “Developer account” > “API access”.

![In Play Console, API access page.](images/image17.png 'image_tooltip')

You can either “Link an existing project” or “Create a new project”. If you don’t see your existing project in the drop-down menu, first verify that the email you’ve used for your developer Play Console account is listed as an “Owner” in the [API Console](https://console.developers.google.com/iam-admin/) and that it has the Google Play Android Developer API enabled in the [API Library](https://console.developers.google.com/apis/library) (it may take up to a couple hours after you’ve done these for your project to be listed in the Play Console).

If you create a new project, the API will automatically be enabled and linked for you. You can always unlink and link a new Google Cloud project at any time.

## Setup a service account

Backend services authenticate through a service account to access Google Play Developer API. To [set up a service account as your API access client](https://developers.google.com/android-publisher/getting_started#using_a_service_account), scroll down to the “Service accounts” section on the same “API access” page.

If you had linked an existing API project with existing service accounts, you may see your available service accounts listed (you may need to click “Refresh service accounts”). If you don’t see your expected service accounts, check the service account permissions in the [Google Cloud Platform](https://console.cloud.google.com/iam-admin/iam) (make sure you are in the right project). Your service account should have a suitable role; for our purposes “Service Account User” is sufficient. Then go back to the Play Console and refresh service accounts to see it listed.

If you don’t have a service account, follow these instructions to create a new service account.

1. Click “Create new service account”

![Create a new service account on the API access page.](images/image18.png 'image_tooltip')

2. Follow the instructions and go to the [Google Cloud Platform](https://console.developers.google.com/iam-admin/serviceaccounts/project?project=498462053203) and click “+CREATE SERVICE ACCOUNT”.
3. Fill in the details and click “Create”.
4. Then complete step “2. Grant this service account access to project”. Though it is labeled optional, it isn’t in our case. We recommend adding the “Service Accounts” > “Service Account User” role.

![On Google Cloud Platform, grant "Service Account User" role to service account.](images/image19.png 'image_tooltip')

5. Step 3 is optional as labeled. Click Done to save your service account.
6. Now go back to the Play Console, and click “Refresh service accounts” to see your new service account listed. Then click “Grant access” to give it permissions.

![In Play Console, click to grant access to service account.](images/image20.png 'image_tooltip')
![In Play Console, the app permissions tab.](images/image22.png 'image_tooltip')

7. Make sure “Manage orders and subscriptions permission” is checked.

![Enable "Manage orders and subscriptions permission" for service account.](images/image21.png 'image_tooltip')

8. Click “Invite user”.

## Create service account key

Go back to the [Google Cloud Platform](https://console.developers.google.com/iam-admin/serviceaccounts/project?project=498462053203). You may see that for the service account we just created/used, it says “No keys” under “Key ID”.

![On Google Cloud Platform, table of service accounts.](images/image23.png 'image_tooltip')

To create a new key:

1. Under the “Actions” three-dot menu, select “Manage keys”.
2. In the window opened, click on “Add key” and choose “Create new key”.
3. Choose your preferred format and click “Create”.
4. It will then download a file that contains your private key. Store it somewhere safe and secure and **don’t lose it**! If you misplace it, you won’t be able to recover it but you can create another new key.
5. Use your private key to fill out the missing service account credentials in the [functions/src/config.ts](https://github.com/chromeos/pwa-play-billing/blob/main/functions/src/config.ts#L21-L23) file.

   1. Fill in the `serviceAccountEmail` const with the `client_email` from the private key file you downloaded.
   2. Copy the entire private key string (`private_key`) as is into the `serviceAccountPrivateKey` const.

      ```
      // config.ts
      ...
      // service account credentials
      export const serviceAccountEmail = ＇＇;
      export const serviceAccountPrivateKey = ＇＇;
      ...
      ```

# Real-Time Developer Notifications (RTDN)

[RTDN](https://developer.android.com/google/play/billing/getting-ready#configure-rtdn), which utilizes [Google Pub/Sub](https://cloud.google.com/pubsub/docs/overview), lets your backend server receive notifications from Google Play about any user’s entitlement changes. Specifically, RTDN is useful for subscriptions and essential if you have a cross-platform app.

## Google Cloud Console setup

To set up RTDN, first sign in to the [Google API Console](https://console.developers.google.com/), and make sure you are using the same project that you linked to the Play Console earlier when configuring Google Play Developer API.

Navigate to “APIs & Services” in the left hand menu. Then click “+ ENABLE APIS AND SERVICES”, search for “Cloud Pub/Sub API” and enable it.

![In Google Cloud Console, enable APIs and services.](images/image24.png 'image_tooltip')

Then to create your Pub/Sub topic, go to the [Pub/Sub topics page](https://console.cloud.google.com/cloudpubsub/topicList) in the Cloud Console and click “+ CREATE TOPIC”.

Fill in the “Topic ID” and note down the full topic name for later.

![Create a topic ID and below it the full topic name is outlined.](images/image25.png 'image_tooltip')

Then click on “ADD MEMBER” to add [google-play-developer-notifications@system.gserviceaccount.com](mailto:google-play-developer-notifications@system.gserviceaccount.com) with the “Pub/Sub Publisher” role which allows it to publish messages to the topic you’ve created.

![Add the service account as a member to the topic.](images/image26.png 'image_tooltip')

![Add the service account email with "Pub/Sub Publisher" role.](images/image27.png 'image_tooltip')

## Play Console setup

Now that you’ve created a topic and added the Google Play developer notifications account, you’ll need to set up RTDN in your app in the Play Console. In the left-hand navigation menu, scroll down to the “Monetize” section and select “Monetization setup”. Add your topic name which we noted down earlier from the Pub/Sub console. Click “Save changes”.

![In Play Console, add full topic name for RTDN.](images/image28.png 'image_tooltip')

## Backend setup

In our sample, we use Firebase Cloud Functions as a serverless framework in place of a backend server to handle HTTP requests. Additionally, this is also how we receive the RTDN events and trigger corresponding events via [Pub/Sub triggers](https://firebase.google.com/docs/functions/pubsub-events). You’ll see in `functions/src/index.ts` a similar piece of code:

```
export const rtdnListener = functions.pubsub
 .topic(topicID).onPublish(async (data, context) => {
   // Read and handle the incoming Realtime Developer notification
 });
```

Earlier you added your service account credentials into the [functions/src/config.ts](https://github.com/chromeos/pwa-play-billing/blob/main/functions/src/config.ts#L25-L29) file. Now, replace `<PLAY_PACKAGE_NAME>` with your Android app package name and `<RTDN_TOPIC_ID>` with your RTDN topic ID you created earlier

Note that you should just the topic ID (e.g. "play-rtdn") and not the full topic name.

```
// config.ts
...
// app package name
export const packageName = ＇<PLAY_PACKAGE_NAME>＇;

// RTDN pub/sub topic ID
export const topicID = ＇<RTDN_TOPIC_ID>＇;
...
```

If you have your own secure backend server, you should implement consuming the messages sent to your RTDN topic there, by using the [Pub/Sub client libraries](https://cloud.google.com/pubsub/docs/reference/libraries). For full Pub/Sub documentation, check out https://cloud.google.com/pubsub/docs/.

# Final deploy

After updating the service account credentials and RTDN topic name, remember to re-deploy your project to update your PWA.

```
$ npm run deploy
```

Note: To resolve prettier errors, you can run the following command:

```
$ npm run prettier:fix
```

# Testing

## Set up your device

The Digital Goods API will be available on Chrome OS stable starting with version 89. In the meantime, it is possible to test the Digital Goods API by following these steps:

1. Enable the Chrome OS dev channel
2. Enable the following flags in Chrome by navigating to chrome://flags and searching for the flag by name.
   1. `#enable-experimental-web-platform-features`
   2. `#enable-web-payments-experimental-features`
   3. `#enable-debug-for-store-billing`
3. Install your app from the Play Store on the device.

## Set up License Testers

With application licensing, you can set up a list of Gmail accounts as License Testers to test your in-app billing & subscription integration. License testers have access to test payment methods that avoid charging the testers real money for purchases. You can also use test payment methods to simulate certain situations, such as when a payment is declined.

To add license testing accounts:

1. Go to “All apps” in the left navigation menu and click on “License testing” under “Settings”.
2. Fill in the “Add license testers” field.
3. Click “Save changes”

![In Play Console, add license testers.](images/image29.png 'image_tooltip')

See [Test your Google Play Billing Library integration](https://developer.android.com/google/play/billing/test) article for more information on License Testers and various test cases for different in-app products.
