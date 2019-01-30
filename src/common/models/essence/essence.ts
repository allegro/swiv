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

import { Timezone } from "chronoshift";
import { List, OrderedSet, Record as ImmutableRecord, Set } from "immutable";
import { PlywoodRange, Range, RefExpression } from "plywood";
import { visualizationIndependentEvaluator } from "../../utils/rules/visualization-independent-evaluator";
import { Colors } from "../colors/colors";
import { DataCube } from "../data-cube/data-cube";
import { DateRange } from "../date-range/date-range";
import { Dimension } from "../dimension/dimension";
import { FilterClause, FixedTimeFilterClause, isTimeFilter, NumberFilterClause, TimeFilterClause } from "../filter-clause/filter-clause";
import { Filter } from "../filter/filter";
import { Highlight } from "../highlight/highlight";
import { Manifest, Resolve } from "../manifest/manifest";
import { Measure } from "../measure/measure";
import { SeriesList } from "../series-list/series-list";
import { Series } from "../series/series";
import { Sort } from "../sort/sort";
import { Split } from "../split/split";
import { Splits } from "../splits/splits";
import { TimeShift } from "../time-shift/time-shift";
import { Timekeeper } from "../timekeeper/timekeeper";

function constrainDimensions(dimensions: OrderedSet<string>, dataCube: DataCube): OrderedSet<string> {
  return <OrderedSet<string>> dimensions.filter(dimensionName => Boolean(dataCube.getDimension(dimensionName)));
}

export interface VisualizationAndResolve {
  visualization: Manifest;
  resolve: Resolve;
}

/**
 * FairGame   - Run all visualizations pretending that there is no current
 * UnfairGame - Run all visualizations but mark current vis as current
 * KeepAlways - Just keep the current one
 */
export enum VisStrategy {
  FairGame,
  UnfairGame,
  KeepAlways
}

type DimensionId = string;

export interface EssenceValue {
  visualizations: Manifest[];
  dataCube: DataCube;
  visualization: Manifest;
  timezone: Timezone;
  filter: Filter;
  timeShift: TimeShift;
  splits: Splits;
  series: SeriesList;
  pinnedDimensions: OrderedSet<DimensionId>;
  colors: Colors;
  pinnedSort: string;
  compare: Filter;
  highlight: Highlight;
  visResolve?: Resolve;
}

const defaultEssence: EssenceValue = {
  visualizations: [],
  dataCube: null,
  visualization: null,
  timezone: Timezone.UTC,
  filter: null,
  splits: null,
  series: null,
  pinnedDimensions: OrderedSet([]),
  pinnedSort: null,
  colors: null,
  highlight: null,
  compare: null,
  timeShift: TimeShift.empty(),
  visResolve: null
};

export interface EssenceContext {
  dataCube: DataCube;
  visualizations: Manifest[];
}

export interface EffectiveFilterOptions {
  highlightId?: string;
  unfilterDimension?: Dimension;
  combineWithPrevious?: boolean;
}

type VisualizationResolverResult = Pick<EssenceValue, "splits" | "visualization" | "colors" | "visResolve">;
type VisualizationResolverParameters = Pick<EssenceValue, "visualization" | "visualizations" | "dataCube" | "splits" | "colors" | "series">;

function resolveVisualization({ visualization, visualizations, dataCube, splits, colors, series }: VisualizationResolverParameters): VisualizationResolverResult {
  let visResolve: Resolve;
  if (visualizations) {
    // Place vis here because it needs to know about splits and colors (and maybe later other things)
    if (!visualization) {
      const visAndResolve = Essence.getBestVisualization(visualizations, dataCube, splits, colors, null);
      visualization = visAndResolve.visualization;
    }

    const ruleVariables = { dataCube, splits, colors, isSelectedVisualization: true };
    visResolve = visualization.evaluateRules(ruleVariables);
    if (visResolve.isAutomatic()) {
      const adjustment = visResolve.adjustment;
      splits = adjustment.splits;
      colors = adjustment.colors || null;
      visResolve = visualization.evaluateRules({ ...ruleVariables, splits, colors });

      if (!visResolve.isReady()) {
        throw new Error(visualization.title + " must be ready after automatic adjustment");
      }
    }

    if (visResolve.isReady()) {
      visResolve = visualizationIndependentEvaluator({ dataCube, series });
    }
  }
  return { visualization, splits, colors, visResolve };
}

export class Essence extends ImmutableRecord<EssenceValue>(defaultEssence) {

  static getBestVisualization(
    visualizations: Manifest[],
    dataCube: DataCube,
    splits: Splits,
    colors: Colors,
    currentVisualization: Manifest
  ): VisualizationAndResolve {
    const visAndResolves = visualizations.map(visualization => {
      const isSelectedVisualization = visualization === currentVisualization;
      const ruleVariables = { dataCube, splits, colors, isSelectedVisualization };
      return {
        visualization,
        resolve: visualization.evaluateRules(ruleVariables)
      };
    });

    return visAndResolves.sort((vr1, vr2) => Resolve.compare(vr1.resolve, vr2.resolve))[0];
  }

  static fromDataCube(dataCube: DataCube, context: EssenceContext): Essence {
    const essence = new Essence({
      dataCube: context.dataCube,
      visualizations: context.visualizations,
      visualization: null,
      timezone: dataCube.getDefaultTimezone(),
      filter: dataCube.getDefaultFilter(),
      timeShift: TimeShift.empty(),
      splits: dataCube.getDefaultSplits(),
      series: SeriesList.fromMeasureNames(dataCube.getDefaultSelectedMeasures().toArray()),
      pinnedDimensions: dataCube.getDefaultPinnedDimensions(),
      colors: null,
      pinnedSort: dataCube.getDefaultSortMeasure(),
      compare: null,
      highlight: null
    });

    return essence.updateSplitsWithFilter();
  }

  public visResolve: Resolve;

  constructor(parameters: EssenceValue) {
    const {
      filter,
      visualizations,
      dataCube,
      timezone,
      timeShift,
      series,
      pinnedDimensions,
      pinnedSort,
      compare,
      highlight
    } = parameters;

    if (!dataCube) throw new Error("Essence must have a dataCube");

    const { visResolve, visualization, colors, splits } = resolveVisualization(parameters);

    const newHighlight = highlight && highlight.validForSeries(series) ? highlight : null;

    super({
      ...parameters,
      visualizations,
      dataCube,
      visualization,
      timezone: timezone || Timezone.UTC,
      timeShift,
      splits: splits && splits.constrainToDimensionsAndMeasures(dataCube.dimensions, dataCube.measures),
      filter: filter && filter.constrainToDimensions(dataCube.dimensions),
      series: series && series.constrainToMeasures(dataCube.measures),
      pinnedDimensions: constrainDimensions(pinnedDimensions, dataCube),
      pinnedSort: dataCube.getMeasure(pinnedSort) ? pinnedSort : dataCube.getDefaultSortMeasure(),
      colors,
      highlight: newHighlight && newHighlight.constrainToDimensions(dataCube.dimensions),
      compare,
      visResolve
    });
  }

  public toString(): string {
    return "[Essence]";
  }

  public toJS() {
    return {
      visualization: this.visualization,
      dataCube: this.dataCube.toJS(),
      timezone: this.timezone.toJS(),
      filter: this.filter && this.filter.toJS(),
      splits: this.splits && this.splits.toJS(),
      series: this.series.toJS(),
      timeShift: this.timeShift.toJS(),
      colors: this.colors && this.colors.toJS(),
      pinnedSort: this.pinnedSort,
      pinnedDimensions: this.pinnedDimensions.toJS(),
      compare: this.compare && this.compare.toJS(),
      highlight: this.highlight && this.highlight.toJS(),
      visResolve: this.visResolve,
      visualizations: this.visualizations
    };
  }

  // getters
  public getTimeAttribute(): RefExpression {
    return this.dataCube.timeAttribute;
  }

  public getTimeDimension(): Dimension {
    return this.dataCube.getTimeDimension();
  }

  public evaluateSelection(filter: TimeFilterClause, timekeeper: Timekeeper): FixedTimeFilterClause {
    if (filter instanceof FixedTimeFilterClause) return filter;
    const { timezone, dataCube } = this;
    return filter.evaluate(timekeeper.now(), dataCube.getMaxTime(timekeeper), timezone);
  }

  private combineWithPrevious(filter: Filter) {
    const timeDimension: Dimension = this.getTimeDimension();
    const timeFilter: FilterClause = filter.getClauseForDimension(timeDimension);
    if (!timeFilter || !(timeFilter instanceof FixedTimeFilterClause)) {
      throw new Error("Can't combine current time filter with previous period without time filter");
    }
    return filter.setClause(this.combinePeriods(timeFilter));
  }

  public getEffectiveFilter(
    timekeeper: Timekeeper,
    { highlightId = null, combineWithPrevious = false, unfilterDimension = null }: EffectiveFilterOptions = {}): Filter {
    const { dataCube, highlight, timezone } = this;
    let filter = this.filter;
    if (highlight && (highlightId !== highlight.owner)) filter = highlight.applyToFilter(filter);
    if (unfilterDimension) filter = filter.removeClause(unfilterDimension.name);
    filter = filter.getSpecificFilter(timekeeper.now(), dataCube.getMaxTime(timekeeper), timezone);
    if (combineWithPrevious) {
      filter = this.combineWithPrevious(filter);
    }
    return filter;
  }

  public hasComparison(): boolean {
    return !this.timeShift.isEmpty();
  }

  private combinePeriods(timeFilter: FixedTimeFilterClause): TimeFilterClause {
    const { timezone, timeShift } = this;
    const duration = timeShift.valueOf();
    return timeFilter.update("values", values =>
      values.flatMap(({ start, end }) =>
        [
          new DateRange({ start, end }),
          new DateRange({ start: duration.shift(start, timezone, -1), end: duration.shift(end, timezone, -1) })
        ]));
  }

  private timeFilter(timekeeper: Timekeeper): FixedTimeFilterClause {
    const { dataCube, timezone } = this;
    const timeDimension: Dimension = this.getTimeDimension();
    const timeFilter = this.filter.getClauseForDimension(timeDimension);
    if (!timeFilter || !isTimeFilter(timeFilter)) throw Error(`Incorrect time filter: ${timeFilter}`);
    if (timeFilter instanceof FixedTimeFilterClause) return timeFilter;
    return timeFilter.evaluate(timekeeper.now(), dataCube.getMaxTime(timekeeper), timezone);
  }

  public currentTimeFilter(timekeeper: Timekeeper): FixedTimeFilterClause {
    return this.timeFilter(timekeeper);
  }

  private shiftToPrevious(timeFilter: FixedTimeFilterClause): FixedTimeFilterClause {
    const { timezone, timeShift } = this;
    const duration = timeShift.valueOf();
    return timeFilter.update("values", values =>
      values.map(({ start, end }) => new DateRange({
        start: duration.shift(start, timezone, -1),
        end: duration.shift(end, timezone, -1)
      })));
  }

  public previousTimeFilter(timekeeper: Timekeeper): FixedTimeFilterClause {
    const timeFilter = this.timeFilter(timekeeper);
    return this.shiftToPrevious(timeFilter);
  }

  public getTimeClause(): TimeFilterClause {
    const timeDimension = this.getTimeDimension();
    return this.filter.getClauseForDimension(timeDimension) as TimeFilterClause;
  }

  public getEffectiveSelectedMeasures(): List<Measure> {
    return this.series.series.map(({ reference }) => this.dataCube.getMeasure(reference));
  }

  public getSeriesWithMeasures(): List<{ series: Series, measure: Measure }> {
    return this.series.series.map(series => ({
      series,
      measure: this.dataCube.getMeasure(series.reference)
    }));
  }

  public differentDataCube(other: Essence): boolean {
    return this.dataCube !== other.dataCube;
  }

  public differentSplits(other: Essence): boolean {
    return !this.splits.equals(other.splits);
  }

  public differentTimeShift(other: Essence): boolean {
    return !this.timeShift.equals(other.timeShift);
  }

  public differentColors(other: Essence): boolean {
    if (Boolean(this.colors) !== Boolean(other.colors)) return true;
    if (!this.colors) return false;
    return !this.colors.equals(other.colors);
  }

  public newEffectiveMeasures(other: Essence): boolean {
    return !this.getEffectiveSelectedMeasures().equals(other.getEffectiveSelectedMeasures());
  }

  public differentEffectiveFilter(other: Essence, myTimekeeper: Timekeeper, otherTimekeeper: Timekeeper, highlightId: string = null, unfilterDimension: Dimension = null): boolean {
    const myEffectiveFilter = this.getEffectiveFilter(myTimekeeper, { highlightId, unfilterDimension });
    const otherEffectiveFilter = other.getEffectiveFilter(otherTimekeeper, { highlightId, unfilterDimension });
    return !myEffectiveFilter.equals(otherEffectiveFilter);
  }

  public highlightOn(owner: string, measure?: string): boolean {
    const { highlight } = this;
    if (!highlight) return false;
    return highlight.owner === owner && (!measure || highlight.measure === measure);
  }

  public highlightOnDifferentMeasure(owner: string, measure: string): boolean {
    const { highlight } = this;
    if (!highlight) return false;
    return highlight.owner === owner && measure && highlight.measure !== measure;
  }

  public getHighlightRange(): PlywoodRange {
    const { highlight } = this;
    if (!highlight) return null;
    const clause = highlight.delta.clauses.first();
    if ((clause instanceof NumberFilterClause) || (clause instanceof FixedTimeFilterClause)) {
      return Range.fromJS(clause.values.first());
    }
    return null;
  }

  public getCommonSort(): Sort {
    return this.splits.getCommonSort();
  }

  // Setters

  public changeComparisonShift(timeShift: TimeShift): Essence {
    return this.set("timeShift", timeShift);
  }

  public updateDataCube(newDataCube: DataCube): Essence {
    const { dataCube } = this;
    if (dataCube.equals(newDataCube)) return this;
    return this
      .set("dataCube", newDataCube)
      // Make sure that all the elements of state are still valid
      /*
        TODO: Tthis line was here and there was some check for old timeFilter, really don't know what was that for.
      .update("filter", filter => filter.constrainToDimensions(newDataCube.dimensions, newDataCube.timeAttribute, dataCube.timeAttribute))
      */
      .update("filter", filter => filter.constrainToDimensions(newDataCube.dimensions))
      .update("splits", splits => splits.constrainToDimensionsAndMeasures(newDataCube.dimensions, newDataCube.measures))
      .update("series", seriesList => seriesList.constrainToMeasures(newDataCube.measures))
      .update("pinnedDimensions", pinned => constrainDimensions(pinned, newDataCube))
      .update("colors", colors => colors && !newDataCube.getDimension(colors.dimension) ? null : colors)
      .update("pinnedSort", sort => !newDataCube.getMeasure(sort) ? newDataCube.getDefaultSortMeasure() : sort)
      .update("compare", compare => compare && compare.constrainToDimensions(newDataCube.dimensions))
      .update("highlight", highlight => highlight && highlight.constrainToDimensions(newDataCube.dimensions))
      .resolveVisualizationAndUpdate();
  }

  public changeFilter(filter: Filter, removeHighlight = false): Essence {
    const { filter: oldFilter } = this;

    return this
      .set("filter", filter)
      .update("highlight", highlight => removeHighlight ? null : highlight)
      .update("splits", splits => {
        const differentClauses = filter.clauses.filter(clause => {
          const otherClause = oldFilter.clauseForReference(clause.reference);
          return !clause.equals(otherClause);
        });
        return splits.removeBucketingFrom(Set(differentClauses.map(clause => clause.reference)));
      })
      .updateSplitsWithFilter();
  }

  public changeTimezone(newTimezone: Timezone): Essence {
    const { timezone } = this;
    if (timezone === newTimezone) return this;
    return this.set("timezone", newTimezone);
  }

  public convertToSpecificFilter(timekeeper: Timekeeper): Essence {
    const { dataCube, filter, timezone } = this;
    if (!filter.isRelative()) return this;
    return this.changeFilter(filter.getSpecificFilter(timekeeper.now(), dataCube.getMaxTime(timekeeper), timezone));
  }

  public changeSplits(splits: Splits, strategy: VisStrategy): Essence {
    const { visualizations, highlight, dataCube, visualization, visResolve, filter, colors } = this;

    splits = splits.updateWithFilter(filter, dataCube.dimensions);

    // If in manual mode stay there, keep the vis regardless of suggested strategy
    if (visResolve.isManual()) {
      strategy = VisStrategy.KeepAlways;
    }
    if (this.splits.length() > 0 && splits.length() !== 0) {
      strategy = VisStrategy.UnfairGame;
    }

    let newVisualization: Manifest = visualization;
    if (strategy !== VisStrategy.KeepAlways && strategy !== VisStrategy.UnfairGame) {
      const currentVisualization = (strategy === VisStrategy.FairGame ? null : visualization);
      const visAndResolve = Essence.getBestVisualization(visualizations, dataCube, splits, colors, currentVisualization);
      newVisualization = visAndResolve.visualization;
    }

    function resetHighlight(essence: Essence): Essence {
      return essence
        .update("filter", filter => highlight.applyToFilter(filter))
        .set("highlight", null);
    }

    const withoutHighlight = highlight ? resetHighlight(this) : this;

    return withoutHighlight
      .set("splits", splits)
      .changeVisualization(newVisualization);
  }

  public changeSplit(splitCombine: Split, strategy: VisStrategy): Essence {
    return this.changeSplits(Splits.fromSplit(splitCombine), strategy);
  }

  public addSplit(split: Split, strategy: VisStrategy): Essence {
    return this.changeSplits(this.splits.addSplit(split), strategy);
  }

  public removeSplit(split: Split, strategy: VisStrategy): Essence {
    return this.changeSplits(this.splits.removeSplit(split), strategy);
  }

  addSeries(series: Series): Essence {
    return this.changeSeriesList(this.series.addSeries(series));
  }

  removeSeries(series: Series): Essence {
    return this.changeSeriesList(this.series.removeSeries(series));
  }

  changeSeriesList(series: SeriesList): Essence {
    return this.set("series", series).resolveVisualizationAndUpdate();
  }

  public updateSplitsWithFilter(): Essence {
    const { filter, dataCube: { dimensions }, splits } = this;
    const newSplits = splits.updateWithFilter(filter, dimensions);
    if (splits === newSplits) return this;
    return this.set("splits", newSplits).resolveVisualizationAndUpdate();
  }

  public changeColors(colors: Colors): Essence {
    return this.set("colors", colors).resolveVisualizationAndUpdate();
  }

  public changeVisualization(visualization: Manifest): Essence {
    return this.set("visualization", visualization).resolveVisualizationAndUpdate();
  }

  public resolveVisualizationAndUpdate() {
    const { visualization, colors, splits, dataCube, visualizations, series } = this;
    const result = resolveVisualization({ colors, splits, dataCube, visualizations, series, visualization });
    return this
      .set("visResolve", result.visResolve)
      .set("colors", result.colors)
      .set("visualization", result.visualization)
      .set("splits", result.splits);
  }

  public pin({ name }: Dimension): Essence {
    return this.update("pinnedDimensions", pinned => pinned.add(name));
  }

  public unpin({ name }: Dimension): Essence {
    return this.update("pinnedDimensions", pinned => pinned.remove(name));
  }

  public getPinnedSortMeasure(): Measure {
    return this.dataCube.getMeasure(this.pinnedSort);
  }

  public changePinnedSortMeasure({ name }: Measure): Essence {
    return this.set("pinnedSort", name);
  }

  public acceptHighlight(): Essence {
    const { highlight } = this;
    if (!highlight) return this;
    return this.changeFilter(highlight.applyToFilter(this.filter), true);
  }

  public changeHighlight(newHighlight: Highlight): Essence {
    if (!newHighlight.validForSeries(this.series)) return this;
    const { highlight, filter } = this;

    // If there is already a highlight from someone else accept it
    const differentHighlight = highlight && highlight.owner !== newHighlight.owner;
    const essence = differentHighlight ? this.changeFilter(highlight.applyToFilter(filter)) : this;
    return essence.set("highlight", newHighlight);
  }

  public dropHighlight(): Essence {
    return this.set("highlight", null);
  }
}
