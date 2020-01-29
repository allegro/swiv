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

import { Instance } from "immutable-class";
import { FinalLineBreak } from "plywood";
import { getLocale } from "../../../client/config/constants";
import { Locales } from "../locale/locale";

export interface ShareOption {
    title?: string;
    format?: "csv" | "tsv";
    separator?: string;
    lineBreak?: string;
    finalLineBreak?: FinalLineBreak;
    columnOrdering: "keys-first" | "as-seen";
    locale?: Locales;
}

export type ShareOptions = ShareOption[];

export const shareOptionsDefaults: ShareOptions = [
      {
        title: "export to CSV",
        format: "csv",
        separator: ",",
        finalLineBreak: "suppress",
        columnOrdering: "keys-first",
        lineBreak: "\r\n",
        locale:
        {
          NUMBER: {
          locale: "en-US",
          localeOptions: {
            useGrouping: false
          }
          },
          TIME: {
            timeFormat: "YYYY-MM-DD[T]HH:mm:ss.SSS[Z]"
          },
          TIME_RANGE: {
            timeFormat: "YYYY-MM-DD[T]HH:mm:ss.SSS[Z]"
          }
      }},
      {
        title: "export to TSV",
        format: "tsv",
        separator: "\t",
        finalLineBreak: "suppress",
        columnOrdering: "keys-first",
        lineBreak: "\r\n",
        locale:
        {
          NUMBER: {
          locale: "en-US",
          localeOptions: {
            useGrouping: false
          }
          },
          TIME: {
            timeFormat: "YYYY-MM-DD[T]HH:mm:ss.SSS[Z]"
          },
          TIME_RANGE: {
            timeFormat: "YYYY-MM-DD[T]HH:mm:ss.SSS[Z]"
          }
      }}];

export class ClassShareOptions implements Instance<ShareOptions, ShareOptions> {

  static fromJS(definition: ShareOptions): ClassShareOptions {
    return new ClassShareOptions(definition);
  }
  public readonly options: ShareOptions;
  constructor(options?: ShareOptions) {

      if (options) {
        const newOptionsCopy = options.map( option => {
        option = { ...shareOptionsDefaults[1], ...option };
        option.locale = { ...shareOptionsDefaults[1].locale, ...option.locale };
        option.locale.TIME = { ...shareOptionsDefaults[1].locale.TIME, ...option.locale.TIME };
        option.locale.TIME_RANGE = { ...shareOptionsDefaults[1].locale.TIME_RANGE, ...option.locale.TIME_RANGE };
        option.locale.NUMBER = { ...shareOptionsDefaults[1].locale.NUMBER, ...option.locale.NUMBER };
        if (!option.locale.NUMBER.locale) { option.locale.NUMBER.locale = "en-US"; }
        option.locale.NUMBER.localeOptions = { ...shareOptionsDefaults[1].locale.NUMBER.localeOptions, ...option.locale.NUMBER.localeOptions };
        return option;
        });
        this.options = [...newOptionsCopy];
      } else {
          this.options = [...shareOptionsDefaults];
      }
  }

  public getOptions(): ShareOptions {
    return this.options;
  }

  public toJS() {
    return this.options;
  }

  public fromJSON() {
    return this.options;
  }

  public valueOf(): ShareOptions {
    return this.options;
  }

  public toJSON(): ShareOptions {
    return this.toJS();
  }

  public equals(other: ClassShareOptions): boolean {
      return other instanceof ClassShareOptions && this.valueOf() === other.valueOf();
  }

}
