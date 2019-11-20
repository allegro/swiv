/*
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
import { day, month } from "chronoshift";
import { List } from "immutable";
import { TimeRange } from "plywood";
import * as React from "react";
import { Clicker } from "../../../../common/models/clicker/clicker";
import { DateRange } from "../../../../common/models/date-range/date-range";
import { Dimension } from "../../../../common/models/dimension/dimension";
import { Essence } from "../../../../common/models/essence/essence";
import { FixedTimeFilterClause } from "../../../../common/models/filter-clause/filter-clause";
import { Filter } from "../../../../common/models/filter/filter";
import { isValidTimeShift, TimeShift } from "../../../../common/models/time-shift/time-shift";
import { Timekeeper } from "../../../../common/models/timekeeper/timekeeper";
import { Fn } from "../../../../common/utils/general/general";
import {
  appendDays,
  datesEqual,
  formatYearMonth,
  getDayInMonth,
  monthToWeeks,
  prependDays
} from "../../../../common/utils/time/time";
import { getLocale, STRINGS } from "../../../config/constants";
import { classNames } from "../../../utils/dom/dom";
import { Button } from "../../button/button";
import { DateRangePicker } from "../../date-range-picker/date-range-picker";
import { SvgIcon } from "../../svg-icon/svg-icon";
import { TimeShiftSelector } from "./time-shift-selector";

export interface FixedTimeTabProps {
  essence: Essence;
  timekeeper: Timekeeper;
  dimension: Dimension;
  onClose: Fn;
  clicker: Clicker;
}

export interface FixedTimeTabState {
  shift: string;
  activeMonthStartDate?: Date;
  hoverTimeRange?: TimeRange;
  selectionSet?: boolean;
  timeRanges: List<TimeRange>;
}

export class FixedTimeTab extends React.Component<FixedTimeTabProps, FixedTimeTabState> {
  initialState = (): FixedTimeTabState => {
    const { essence, timekeeper, dimension: { name } } = this.props;
    const shift = essence.timeShift.toJS();
    const timeFilter = essence.getEffectiveFilter(timekeeper).clauseForReference(name);
    if (timeFilter && timeFilter instanceof FixedTimeFilterClause && !timeFilter.values.isEmpty()) {
      let dateRanges = List();
      for (let i = 0; i < timeFilter.values.size; i++) {
        let start = timeFilter.values.get(i).start;
        let end = timeFilter.values.get(i).end;
        dateRanges = dateRanges.push(new TimeRange({ start, end, bounds: "[]" }));
      }
      return { shift, activeMonthStartDate: null, hoverTimeRange: null, selectionSet: false, timeRanges: dateRanges };
    }
    return { shift, activeMonthStartDate: null, hoverTimeRange: null, selectionSet: false, timeRanges: List() };
  }

  componentWillMount() {
    const { timeRanges } = this.state;
    const { essence: { timezone } } = this.props;
    const flooredStart = month.floor(timeRanges.get(0).start || new Date(), timezone);
    this.setState({
      activeMonthStartDate: flooredStart,
      selectionSet: true
    });
  }

  onStartChange = (start: Date, index: int) => {
    const { timeRanges } = this.state;
    let end = timeRanges.get(index).end;
    const dateRanges = timeRanges.set(index, new TimeRange({ start, end, bounds: "[]" }));
    this.setState( { timeRanges: dateRanges });
  }

  onEndChange = (end: Date, index: int) => {
    const { timeRanges } = this.state;
    let start = timeRanges.get(index).start;
    let dateRanges = timeRanges.set(index, new TimeRange({ start, end, bounds: "[]" }));
    this.setState( { timeRanges: dateRanges });
  }

  setTimeShift = (shift: string) => this.setState({ shift });
  state: FixedTimeTabState = this.initialState();

  createDateRange(start: Date, maybeEnd: Date): DateRange | null {
    if (!start) return null;
    const timezone = this.props.essence.timezone;
    const end = maybeEnd || day.shift(start, timezone, 1);
    if (start >= end) return null;
    return new DateRange({ start, end });
  }

  constructFixedFilter(dateRanges: List<any>): Filter {
    const { essence: { filter }, dimension: { name } } = this.props;
    const clause = new FixedTimeFilterClause({ reference: name, values: dateRanges });
    return filter.setClause(clause);
  }

  constructTimeShift(): TimeShift {
    return TimeShift.fromJS(this.state.shift);
  }

  validateTimeShift(): boolean {
    return isValidTimeShift(this.state.shift);
  }

  validate(): boolean {
    let dateRanges = List();
    const { timeRanges } = this.state;
    for (let i = 0; i < timeRanges.size; i++) {
      let date = timeRanges.get(i);
      let dateRange = this.createDateRange(date.start, date.end);
      if (!dateRange) return false;
      else {
        dateRanges = dateRanges.push(dateRange);
      }
    }
    if (!this.validateTimeShift()) return false;
    const { essence: { filter, timeShift } } = this.props;
    const newTimeShift = this.constructTimeShift();
    const newFilter = this.constructFixedFilter(dateRanges);
    return !filter.equals(newFilter) || !timeShift.equals(newTimeShift);
  }

  onOkClick = () => {
    const { timeRanges } = this.state;
    if (!this.validate()) return;
    const { clicker, onClose } = this.props;
    let dateRanges = List();
    for (let i = 0; i < timeRanges.size; i++) {
      dateRanges = dateRanges.push(this.createDateRange(timeRanges.get(i).start, timeRanges.get(i).end));
    }
    clicker.changeFilter(this.constructFixedFilter(dateRanges));
    clicker.changeComparisonShift(this.constructTimeShift());
    onClose();
  }

  onTimeRangeClick = () => {
    const { timeRanges } = this.state;
    let dateRanges = timeRanges;
    let start = dateRanges.get(timeRanges.size - 1).start;
    let end = dateRanges.get(timeRanges.size - 1).end;
    dateRanges = dateRanges.push( new TimeRange({ start, end, bounds: "[]" }));
    this.setState( { timeRanges: dateRanges });
  }

  selectNewRange(startDate: Date, endDate?: Date) {
    const { essence: { timezone } } = this.props;
    const { timeRanges } = this.state;
    if (timeRanges.size === 1) {
      this.onStartChange(startDate, 0);
      // real end points are exclusive so +1 full day to selection (which is floored) to get the real end point
      if (endDate) endDate = day.shift(endDate, timezone, 1);
      this.onEndChange(endDate, 0);
    }
  }

  navigateToMonth(offset: number): void {
    const { essence: { timezone } } = this.props;
    const { activeMonthStartDate } = this.state;
    const newDate = month.shift(activeMonthStartDate, timezone, offset);
    this.setState({
      activeMonthStartDate: newDate
    });
  }

  goToPreviousMonth = () => this.navigateToMonth(-1);

  goToNextMonth = () => this.navigateToMonth(1);

  calculateHoverTimeRange(mouseEnteredDay: Date) {
    const { timeRanges } = this.state;
    let hoverTimeRange: TimeRange = null;
    if (timeRanges.get(0).start && !timeRanges.get(0).end) {
      let start = timeRanges.get(0).start;
      let end = mouseEnteredDay;
      // if mousing over backwards, set end to old start time
      if (mouseEnteredDay < start) {
        start = mouseEnteredDay;
        end = timeRanges.get(0).start;
      }
      hoverTimeRange = new TimeRange({ start, end, bounds: "[]" });
    }

    this.setState({ hoverTimeRange });
  }

  onCalendarMouseLeave = () => {
    this.setState({ hoverTimeRange: null });
  }

  selectDay(selection: Date): void {
    const { selectionSet, timeRanges } = this.state;

    if (selectionSet) {
      this.setState({ hoverTimeRange: null, selectionSet: false });
      this.selectNewRange(selection, null);
    } else {
      const isDoubleClickSameDay = datesEqual(selection, timeRanges.get(0).start);
      const isBackwardSelection = selection < timeRanges.get(0).start;

      if (isDoubleClickSameDay) {
        this.selectNewRange(timeRanges.get(0).start, timeRanges.get(0).start);
      } else if (isBackwardSelection) {
        this.selectNewRange(selection, timeRanges.get(0).start);
      } else {
        this.selectNewRange(timeRanges.get(0).start, selection);
      }
      this.setState({ selectionSet: true });
    }
  }

  getIsSelectable(date: Date): boolean {
    const { hoverTimeRange, selectionSet } = this.state;
    let inHoverTimeRange = hoverTimeRange && hoverTimeRange.contains(date);
    return inHoverTimeRange && !selectionSet;
  }

  renderDays(weeks: Date[][], monthStart: Date): JSX.Element[] {
    const { essence: { timezone, dataCube }, timekeeper } = this.props;
    const { timeRanges } = this.state;
    const startDay = day.floor(timeRanges.get(0).start, timezone);
    const dayBeforeEnd = timeRanges.get(0).end && day.shift(timeRanges.get(0).end, timezone, -1);
    const nextMonthStart = month.shift(monthStart, timezone, 1);

    return weeks.map((daysInWeek: Date[], row: number) => {
      return <div className="week" key={row}> {daysInWeek.map((dayDate: Date, column: number) => {
        const isPast = dayDate < monthStart;
        const isFuture = dayDate >= nextMonthStart;
        const isBeyondMaxRange = dayDate > dataCube.getMaxTime(timekeeper);
        const isSelected = startDay <= dayDate && dayDate < timeRanges.get(0).end;
        const isSelectedEdgeStart = datesEqual(dayDate, timeRanges.get(0).start);
        const isSelectedEdgeEnd = datesEqual(dayDate, dayBeforeEnd);
        const className = classNames("day", "value",
            {
              "past": isPast,
              "future": isFuture,
              "beyond-max-range": isBeyondMaxRange,
              "selectable": this.getIsSelectable(dayDate),
              "selected": isSelected,
              "selected-edge": isSelectedEdgeStart || isSelectedEdgeEnd
            });

        return <div
            className={className}
            key={column}
            onClick={this.selectDay.bind(this, dayDate)}
            onMouseEnter={this.calculateHoverTimeRange.bind(this, dayDate)}
        >{getDayInMonth(dayDate, timezone)}</div>;
      })}</div>;
    });
  }
  renderCalendar(startDate: Date): JSX.Element[] {
    const { essence: { timezone } } = this.props;
    const weeks: Date[][] = monthToWeeks(startDate, timezone, getLocale());
    const firstWeek = weeks[0];
    const lastWeek = weeks[weeks.length - 1];
    const countPrepend = 7 - firstWeek.length;
    const countAppend = 7 - lastWeek.length;
    weeks[0] = prependDays(timezone, firstWeek, countPrepend);
    weeks[weeks.length - 1] = appendDays(timezone, lastWeek, countAppend);
    return this.renderDays(weeks, startDate);
  }

  renderCalendarNav(startDate: Date): JSX.Element {
    const { essence: { timezone } } = this.props;

    return <div className="calendar-nav">
      <div
          className="caret left"
          onClick={this.goToPreviousMonth}
      >
        <SvgIcon svg={require("../../../icons/full-caret-left.svg")}/>
      </div>
      {formatYearMonth(startDate, timezone)}
      <div
          className="caret right"
          onClick={this.goToNextMonth}
      >
        <SvgIcon svg={require("../../../icons/full-caret-right.svg")}/>
      </div>
    </div>;
  }
  createDateRangePickers = () => {
    const { timeRanges } = this.state;
    const { essence: { dataCube, timezone }, timekeeper } = this.props;
    let pickers = [];
    for (let i = 0; i < timeRanges.size; i++) {
      pickers.push(
      <div>
      <Button type="secondary" title={"Delete"} onClick={() => this.setState( { timeRanges: timeRanges.splice(i, 1) })} />
      <DateRangePicker
        startTime={timeRanges.get(i).start}
        endTime={timeRanges.get(i).end}
        maxTime={dataCube.getMaxTime(timekeeper)}
        timezone={timezone}
        onStartChange={this.onStartChange}
        onEndChange={this.onEndChange}
        index={i}/></div>);
    }
    return pickers;
  }

  render() {
    const { essence: { dataCube, timezone }, timekeeper, dimension, onClose } = this.props;
    const { shift, timeRanges, activeMonthStartDate } = this.state;
    if (!dimension) return null;
    if (timeRanges.size === 1) {
      return <div>
        <DateRangePicker
            startTime={timeRanges.get(0).start}
            endTime={timeRanges.get(0).end}
            maxTime={dataCube.getMaxTime(timekeeper)}
            timezone={timezone}
            onStartChange={this.onStartChange}
            onEndChange={this.onEndChange}
            index={0}
        />
        <div
            className="calendar"
            onMouseLeave={this.onCalendarMouseLeave}
        >
          {this.renderCalendarNav(activeMonthStartDate)}
          <div className="week">
            {getLocale().shortDays.map((day, i) => {
              return <div className="day label" key={day + i}><span className="space"/>{day}</div>;
            })
            }
          </div>
          {this.renderCalendar(activeMonthStartDate)}
        </div>
        <div className="cont">
          <TimeShiftSelector
              shift={shift}
              time={this.createDateRange(timeRanges.get(0).start, timeRanges.get(0).end)}
              onShiftChange={this.setTimeShift}
              timezone={timezone}
              shiftValue={isValidTimeShift(shift) ? TimeShift.fromJS(shift) : null}
              errorMessage={!isValidTimeShift(shift) && STRINGS.invalidDurationFormat}
          />
        </div>
        <div className="ok-cancel-bar">
          <Button type="primary" onClick={this.onOkClick} disabled={!this.validate()} title={STRINGS.ok}/>
          <Button type="secondary" onClick={onClose} title={STRINGS.cancel}/>
          <Button type="secondary" title="Add Time Range" onClick={this.onTimeRangeClick}/>
        </div>
      </div>;
    } else {
      return <div><div className="datePickers">{this.createDateRangePickers()}</div>
        <div className="ok-cancel-bar">
          <Button type="primary" onClick={this.onOkClick} disabled={!this.validate()} title={STRINGS.ok}/>
          <Button type="secondary" onClick={onClose} title={STRINGS.cancel}/>
          <Button type="secondary" title="Add Time Range" onClick={this.onTimeRangeClick}/>
        </div>
      </div>;
    }
  }
}
