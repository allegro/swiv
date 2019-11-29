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

import * as React from "react";
import { Measure } from "../../../common/models/measure/measure";
import { MeasureSeries } from "../../../common/models/series/measure-series";
import { SeriesFormat } from "../../../common/models/series/series-format";
import { Binary } from "../../../common/utils/functional/functional";
import { FormatPicker } from "./format-picker";

interface MeasureSeriesMenuProps {
  measure: Measure;
  series: MeasureSeries;
  onChange: Binary<MeasureSeries, boolean, void>;
}

export const MeasureSeriesMenu: React.SFC<MeasureSeriesMenuProps> = ({ measure, series, onChange }) => {

  function onFormatChange(format: SeriesFormat) {
    onChange(series.set("format", format), true);
  }

  return <React.Fragment>
    <FormatPicker
      measure={measure}
      format={series.format}
      formatChange={onFormatChange}
    />
  </React.Fragment>;
};
