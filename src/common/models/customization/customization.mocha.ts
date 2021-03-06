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
import { Timezone } from "chronoshift";
import * as sinon from "sinon";
import * as localeModule from "../locale/locale";
import * as urlShortenerModule from "../url-shortener/url-shortener";
import { Customization, DEFAULT_TIMEZONES, DEFAULT_TITLE, fromConfig, serialize } from "./customization";
import { customization, customizationJS } from "./customization.fixtures";

describe("Customization", () => {
  describe("fromConfig", () => {
    it("should pass headerBackground", () => {
      const customization = fromConfig({ ...customizationJS, headerBackground: "foobar" });

      expect(customization).to.contain({ headerBackground: "foobar" });
    });

    it("should pass customLogoSvg", () => {
      const customization = fromConfig({ ...customizationJS, customLogoSvg: "foobar" });

      expect(customization).to.contain({ customLogoSvg: "foobar" });
    });

    it("should pass sentryDSN", () => {
      const customization = fromConfig({ ...customizationJS, sentryDSN: "foobar" });

      expect(customization).to.contain({ sentryDSN: "foobar" });
    });

    describe("title", () => {
      it("should pass title", () => {
        const customization = fromConfig({ ...customizationJS, title: "foobar" });

        expect(customization).to.contain({ title: "foobar" });
      });

      it("should use default title", () => {
        const customization = fromConfig({ ...customizationJS, title: undefined });

        expect(customization).to.contain({ title: DEFAULT_TITLE });
      });
    });

    describe("timezones", () => {
      it("should create timezone objects from strings", () => {
        const customization = fromConfig({
          ...customizationJS,
          timezones: ["Europe/Warsaw", "Asia/Manila"]
        });

        expect(customization.timezones).to.have.length(2);
        expect(customization.timezones[0].equals(Timezone.fromJS("Europe/Warsaw"))).to.be.true;
        expect(customization.timezones[1].equals(Timezone.fromJS("Asia/Manila"))).to.be.true;
      });

      it("should use default timezones if empty", () => {
        const customization = fromConfig({ ...customizationJS, timezones: undefined });

        expect(customization.timezones).to.deep.equal(DEFAULT_TIMEZONES);
      });
    });

    describe("externalViews", () => {
      // TODO: Implement
    });

    describe("urlShortener", () => {
      let urlShortenerFromConfig: sinon.SinonStub;

      beforeEach(() => {
        urlShortenerFromConfig = sinon
          .stub(urlShortenerModule, "fromConfig")
          .returns("foobar");
      });

      afterEach(() => {
        urlShortenerFromConfig.restore();
      });

      it("should call urlShortener fromConfig", () => {
        fromConfig({ urlShortener: { input: 42 } } as any);

        expect(urlShortenerFromConfig.calledWith({ input: 42 })).to.be.true;
      });

      it("should use result of urlShortener fromConfig", () => {
        const settings = fromConfig({ urlShortener: { input: 42 } } as any);

        expect(settings).to.deep.contain({
          urlShortener: "foobar"
        });
      });
    });

    describe("locale", () => {
      let localeFromConfig: sinon.SinonStub;

      beforeEach(() => {
        localeFromConfig = sinon
          .stub(localeModule, "fromConfig")
          .returns("foobar");
      });

      afterEach(() => {
        localeFromConfig.restore();
      });

      it("should call locale fromConfig", () => {
        fromConfig({ locale: { input: 42 } } as any);

        expect(localeFromConfig.calledWith({ input: 42 })).to.be.true;
      });

      it("should use result of locale fromConfig", () => {
        const settings = fromConfig({ locale: { input: 42 } } as any);

        expect(settings).to.deep.contain({
          locale: "foobar"
        });
      });
    });

    describe("cssVariables", () => {
      it("should create empty object as default", () => {
        const customization = fromConfig({ ...customizationJS, cssVariables: undefined });

        expect(customization).to.deep.contain({ cssVariables: {} });
      });

      it("should pass only valid variables", () => {
        const customization = fromConfig({
          ...customizationJS,
          cssVariables: {
            "brand": "foobar",
            "brand-selected": "foobar-selected",
            "invalid-name": "invalid"
          }
        });

        expect(customization).to.deep.contain({
          cssVariables: {
            "brand": "foobar",
            "brand-selected": "foobar-selected"
          }
        });
      });
    });
  });

  describe("serialize", () => {
    it("should pass headerBackground", () => {
      const serialized = serialize({ ...customization, headerBackground: "foobar" });

      expect(serialized).to.contain({ headerBackground: "foobar" });
    });

    it("should pass customLogoSvg", () => {
      const serialized = serialize({ ...customization, customLogoSvg: "foobar" });

      expect(serialized).to.contain({ customLogoSvg: "foobar" });
    });

    it("should pass sentryDSN", () => {
      const serialized = serialize({ ...customization, sentryDSN: "foobar" });

      expect(serialized).to.contain({ sentryDSN: "foobar" });
    });

    it("should not pass title", () => {
      const serialized = serialize({ ...customization, title: "foobar" });

      expect(serialized).to.not.have.property("title");
    });

    it("should not pass cssVariables", () => {
      const serialized = serialize({ ...customization, cssVariables: { brand: "foobar" } });

      expect(serialized).to.not.have.property("cssVariables");
    });

    it("should serialize timezone objects to strings", () => {
      const serialized = serialize({
        ...customization,
        timezones: [Timezone.fromJS("Europe/Warsaw"), Timezone.fromJS("Asia/Manila")]
      });

      expect(serialized).to.deep.contain({ timezones: ["Europe/Warsaw", "Asia/Manila"] });
    });

    describe("externalViews", () => {
      // TODO: Implement
    });

    describe("urlShortener", () => {

      it("should return hasUrlShortener true if has url shortener", () => {
        const serialized = serialize({
          ...customization,
          urlShortener: (() => {}) as any
        });

        expect(serialized).to.contain({ hasUrlShortener: true });
      });

      it("should return hasUrlShortener true if has url shortener", () => {
        const serialized = serialize({
          ...customization,
          urlShortener: undefined
        });

        expect(serialized).to.contain({ hasUrlShortener: false });
      });
    });

    describe("locale", () => {
      let localeSerialize: sinon.SinonStub;

      beforeEach(() => {
        localeSerialize = sinon
          .stub(localeModule, "serialize")
          .returns("foobar");
      });

      afterEach(() => {
        localeSerialize.restore();
      });

      it("should call locale serialize", () => {
        serialize({ ...customization, locale: { input: 42 } } as any);

        expect(localeSerialize.calledWith({ input: 42 })).to.be.true;
      });

      it("should use result of locale serialize", () => {
        const serialized = serialize({ ...customization, locale: { input: 42 } } as any);

        expect(serialized).to.deep.contain({
          locale: "foobar"
        });
      });
    });
  });
});
