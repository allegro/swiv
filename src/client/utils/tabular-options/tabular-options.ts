/*
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
import { List } from "immutable";
import * as moment from "moment";
import { AttributeInfo, TabulatorOptions, TimeRange } from "plywood";
import { Essence } from "../../../common/models/essence/essence";
import { Locales } from "../../../common/models/locale/locale";
import { ConcreteSeries, SeriesDerivation } from "../../../common/models/series/concrete-series";

interface SeriesWithDerivation {
  series: ConcreteSeries;
  derivation: SeriesDerivation;
}

function findSeriesAndDerivation(name: string, concreteSeriesList: List<ConcreteSeries>): SeriesWithDerivation {
  for (const derivation of [SeriesDerivation.CURRENT, SeriesDerivation.PREVIOUS, SeriesDerivation.DELTA]) {
    const series = concreteSeriesList.find(s => s.plywoodKey(derivation) === name);
    if (series) {
      return { series, derivation };
    }
  }
  return null;
}

export default function tabularOptions(essence: Essence, locales?: Locales): TabulatorOptions {
  return {
    formatter: {
      TIME_RANGE: (range: TimeRange, tz: Timezone) => moment.tz(range.start, tz.toString()).format(locales.TIME_RANGE.timeFormat),
      TIME: (v: Date, tz: Timezone) => moment.tz(v, tz.toString()).format(locales.TIME.timeFormat),
      NUMBER: (v: number) =>  v.toLocaleString(locales.NUMBER.locale, { ...locales.NUMBER.localeOptions })
  },
    attributeTitle: ({ name }: AttributeInfo) => {
      const seriesWithDerivation = findSeriesAndDerivation(name, essence.getConcreteSeries());
      if (seriesWithDerivation) {
        const { series, derivation } = seriesWithDerivation;
        return series.title(derivation);
      }
      const dimension = essence.dataCube.getDimension(name);
      if (dimension) {
        return dimension.title;
      }
      return name;
    },
    timezone: essence.timezone
  };
}
