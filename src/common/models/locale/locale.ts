/*
 * Copyright 2017-2021 Allegro.pl
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

import { isObject } from "../../utils/general/general";

const EN_US: Locale = {
  shortDays: ["S", "M", "T", "W", "T", "F", "S"],
  shortMonths: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sept", "Oct", "Nov", "Dec"],
  weekStart: 0,
  exportEncoding: "utf-8"
};

type LocaleName = "EN_US";

export const LOCALES: Record<LocaleName, Locale> = {
  EN_US
};

const DEFAULT_LOCALE = EN_US;

export interface LocaleJS {
  base: LocaleName;
  overrides: Locale;
}

export type LocaleSerialized = Locale;

export interface Locale {
  shortDays: string[];
  shortMonths: string[];
  weekStart: number;
  exportEncoding: string;
}

export function fromConfig(locale?: LocaleJS): Locale {
  if (!isObject(locale)) return DEFAULT_LOCALE;
  const { base, overrides } = locale;
  return {
    ...LOCALES[base],
    ...overrides
  };

}

export function serialize(locale: Locale): LocaleSerialized {
  return locale;
}

export function deserialize(locale: Locale): Locale {
  return locale;
}
