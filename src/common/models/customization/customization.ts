/*
 * Copyright 2015-2016 Imply Data, Inc.
 * Copyright 2017-2019 Allegro.pl
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { Timezone } from "chronoshift";
import { Class, immutableArraysEqual, Instance } from "immutable-class";
import { ImmutableUtils } from "../../utils/immutable-utils/immutable-utils";
import { ExternalView, ExternalViewValue } from "../external-view/external-view";
import { ClassShareOptions, ShareOptions } from "../share-options/share-options";
import { UrlShortener, UrlShortenerDef } from "../url-shortener/url-shortener";

export interface CustomizationValue {
  title?: string;
  headerBackground?: string;
  customLogoSvg?: string;
  externalViews?: ExternalView[];
  timezones?: Timezone[];
  logoutHref?: string;
  urlShortener?: UrlShortener;
  sentryDSN?: string;
  shareOptions?: ShareOptions;
}

export interface CustomizationJS {
  title?: string;
  headerBackground?: string;
  customLogoSvg?: string;
  externalViews?: ExternalViewValue[];
  timezones?: string[];
  logoutHref?: string;
  urlShortener?: UrlShortenerDef;
  sentryDSN?: string;
  shareOptions?: ShareOptions;
}

var check: Class<CustomizationValue, CustomizationJS>;

export class Customization implements Instance<CustomizationValue, CustomizationJS> {
  static DEFAULT_TITLE = "Turnilo (%v)";

  static DEFAULT_TIMEZONES: Timezone[] = [
    new Timezone("America/Juneau"), // -9.0
    new Timezone("America/Los_Angeles"), // -8.0
    new Timezone("America/Yellowknife"), // -7.0
    new Timezone("America/Phoenix"), // -7.0
    new Timezone("America/Denver"), // -7.0
    new Timezone("America/Mexico_City"), // -6.0
    new Timezone("America/Chicago"), // -6.0
    new Timezone("America/New_York"), // -5.0
    new Timezone("America/Argentina/Buenos_Aires"), // -4.0
    Timezone.UTC,
    new Timezone("Asia/Jerusalem"), // +2.0
    new Timezone("Europe/Paris"), // +1.0
    new Timezone("Asia/Kathmandu"), // +5.8
    new Timezone("Asia/Hong_Kong"), // +8.0
    new Timezone("Asia/Seoul"), // +9.0
    new Timezone("Pacific/Guam") // +10.0
  ];

  static DEFAULT_LOGOUT_HREF = "logout";

  static isCustomization(candidate: any): candidate is Customization {
    return candidate instanceof Customization;
  }

  static fromJS(parameters: CustomizationJS): Customization {
    var value: CustomizationValue = {
      title: parameters.title,
      headerBackground: parameters.headerBackground,
      customLogoSvg: parameters.customLogoSvg,
      logoutHref: parameters.logoutHref,
      sentryDSN: parameters.sentryDSN,
      shareOptions: parameters.shareOptions
    };

    var paramViewsJS = parameters.externalViews;
    var externalViews: ExternalView[] = null;
    if (Array.isArray(paramViewsJS)) {
      externalViews = paramViewsJS.map((view, i) => ExternalView.fromJS(view));
      value.externalViews = externalViews;
    }

    var timezonesJS = parameters.timezones;
    var timezones: Timezone[] = null;
    if (Array.isArray(timezonesJS)) {
      timezones = timezonesJS.map(Timezone.fromJS);
      value.timezones = timezones;
    }

    if (parameters.urlShortener) {
      value.urlShortener = UrlShortener.fromJS(parameters.urlShortener);
    }

    const options = new ClassShareOptions(parameters.shareOptions);
    value.shareOptions = options.getOptions();

    return new Customization(value);
  }

  public headerBackground: string;
  public customLogoSvg: string;
  public externalViews: ExternalView[];
  public timezones: Timezone[];
  public title: string;
  public logoutHref: string;
  public urlShortener: UrlShortener;
  public sentryDSN: string;
  public shareOptions: ShareOptions;

  constructor(parameters: CustomizationValue) {
    this.title = parameters.title || null;
    this.headerBackground = parameters.headerBackground || null;
    this.customLogoSvg = parameters.customLogoSvg || null;
    if (parameters.externalViews) this.externalViews = parameters.externalViews;
    if (parameters.timezones) this.timezones = parameters.timezones;
    this.logoutHref = parameters.logoutHref;
    if (parameters.shareOptions) this.shareOptions = parameters.shareOptions;
    if (parameters.urlShortener) this.urlShortener = parameters.urlShortener;
    if (parameters.sentryDSN) this.sentryDSN = parameters.sentryDSN;
  }

  public valueOf(): CustomizationValue {
    return {
      title: this.title,
      headerBackground: this.headerBackground,
      customLogoSvg: this.customLogoSvg,
      externalViews: this.externalViews,
      timezones: this.timezones,
      urlShortener: this.urlShortener,
      logoutHref: this.logoutHref,
      sentryDSN: this.sentryDSN,
      shareOptions: this.shareOptions
    };
  }

  public toJS(): CustomizationJS {
    var js: CustomizationJS = {};
    if (this.title) js.title = this.title;
    if (this.sentryDSN) js.sentryDSN = this.sentryDSN;
    if (this.headerBackground) js.headerBackground = this.headerBackground;
    if (this.customLogoSvg) js.customLogoSvg = this.customLogoSvg;
    if (this.externalViews) {
      js.externalViews = this.externalViews.map(view => view.toJS());
    }
    if (this.timezones) {
      js.timezones = this.timezones.map(tz => tz.toJS());
    }
    if (this.urlShortener) {
      js.urlShortener = this.urlShortener.toJS();
    }
    if (this.logoutHref) js.logoutHref = this.logoutHref;
    if (this.shareOptions) {
      // const options = new ClassShareOptions(this.shareOptions);
      js.shareOptions = this.shareOptions;
    }
    return js;
  }

  public toJSON(): CustomizationJS {
    return this.toJS();
  }

  public toString(): string {
    return `[custom: (${this.headerBackground}) logo: ${Boolean(this.customLogoSvg)}, externalViews: ${Boolean(this.externalViews)}, timezones: ${Boolean(
      this.timezones)}]`;
  }

  public equals(other: Customization): boolean {
    return Customization.isCustomization(other) &&
      this.title === other.title &&
      this.headerBackground === other.headerBackground &&
      this.customLogoSvg === other.customLogoSvg &&
      (!this.urlShortener || this.urlShortener.equals(other.urlShortener)) &&
      immutableArraysEqual(this.externalViews, other.externalViews) &&
      immutableArraysEqual(this.timezones, other.timezones) &&
      this.sentryDSN === other.sentryDSN &&
      this.logoutHref === other.logoutHref;
  }

  public getTitle(version: string): string {
    var title = this.title || Customization.DEFAULT_TITLE;
    return title.replace(/%v/g, version);
  }

  change(propertyName: string, newValue: any): Customization {
    return ImmutableUtils.change(this, propertyName, newValue);
  }

  public changeTitle(title: string): Customization {
    return this.change("title", title);
  }

  public getTimezones() {
    return this.timezones || Customization.DEFAULT_TIMEZONES;
  }

  public getLogoutHref() {
    return this.logoutHref || Customization.DEFAULT_LOGOUT_HREF;
  }
}

check = Customization;
