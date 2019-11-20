/*
 * Copyright 2015-2016 Imply Data, Inc.
 * Copyright 2017-2018 Allegro.pl
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

import { day, month, Timezone } from "chronoshift";
import * as React from "react";
import { DateRangeInput } from "../date-range-input/date-range-input";
import "./date-range-picker.scss";

export interface DateRangePickerProps {
  startTime?: Date;
  endTime?: Date;
  maxTime?: Date;
  timezone: Timezone;
  onStartChange: (t: Date, i: number) => void;
  onEndChange: (t: Date, i: number) => void;
  index: int;
}

export interface DateRangePickerState {
  start: Date;
  end: Date;
}

export class DateRangePicker extends React.Component<DateRangePickerProps, DateRangePickerState> {
  constructor(props: DateRangePickerProps) {
    super(props);
  }

  render() {
    const { startTime, endTime, timezone, onStartChange, onEndChange, index } = this.props;

    return <div className="date-range-picker">
      <div>
        <DateRangeInput label="Start" type="start" time={startTime} timezone={timezone} onChange={onStartChange} index={index} />
        <DateRangeInput label="End" type="end" time={endTime} timezone={timezone} onChange={onEndChange} index={index} />
      </div>
    </div>;
  }
}
