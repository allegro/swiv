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

import { expect } from "chai";
import { testImmutableClass } from "immutable-class-tester";
import { shareOptionsDefaults } from "../share-options/share-options";
import { SuccessUrlShortenerJS } from "../url-shortener/url-shortener.fixtures";
import { Customization, CustomizationJS } from "./customization";

describe("Customization", () => {
  it("is an immutable class", () => {
    testImmutableClass<CustomizationJS>(Customization, [
      {
        title: "Hello World",
        headerBackground: "brown",
        customLogoSvg: "ansvgstring",
        shareOptions: shareOptionsDefaults
      },
      {
        urlShortener: SuccessUrlShortenerJS,
        headerBackground: "green",
        externalViews: [],
        shareOptions: shareOptionsDefaults
      },
      {
        urlShortener: SuccessUrlShortenerJS,
        externalViews: [
          {
            title: "corporate dashboard",
            linkGenerator: "{ return 'https://dashboard.corporate.com/'+filter.toString() }",
            sameWindow: true
          },
          {
            title: "google docs",
            linkGenerator: "{ return 'http://182.343.32.2273:8080/'+dataCube.name }"
          },
          {
            title: "google docs",
            linkGenerator: "{ return 'http://182.343.32.2273:8080/'+timezone.timezone }"
          }
        ],
        shareOptions: shareOptionsDefaults
      },
      {
        headerBackground: "green",
        externalViews: [],
        timezones: ["Pacific/Niue", "America/Los_Angeles"],
        shareOptions: shareOptionsDefaults
      },
      {
        headerBackground: "green",
        externalViews: [],
        urlShortener: SuccessUrlShortenerJS,
        timezones: ["Pacific/Niue", "America/Los_Angeles"],
        logoutHref: "/log-me-out-now",
        shareOptions: shareOptionsDefaults
      }
    ]);
  });

  it("throws for invalid timezone", () => {
    expect(() => {
      Customization.fromJS({
        headerBackground: "green",
        externalViews: [],
        timezones: ["Pacific/Niue", "Not a timezone"]
      });
    }).to.throw("timezone 'Not a timezone' does not exist");
  });

});
