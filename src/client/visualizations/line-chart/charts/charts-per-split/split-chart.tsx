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

import { Dataset, Datum, NumberRange, TimeRange } from "plywood";
import * as React from "react";
import { NORMAL_COLORS } from "../../../../../common/models/colors/colors";
import { Essence } from "../../../../../common/models/essence/essence";
import { defaultFormatter } from "../../../../../common/models/series/series-format";
import { Stage } from "../../../../../common/models/stage/stage";
import { Unary } from "../../../../../common/utils/functional/functional";
import { BaseChart } from "../../base-chart/base-chart";
import { ColoredSeriesChartLine } from "../../chart-line/colored-series-chart-line";
import { SingletonSeriesChartLine } from "../../chart-line/singleton-series-chart-line";
import { InteractionsProps } from "../../interactions/interaction-controller";
import { selectSplitDataset } from "../../utils/dataset";
import { ContinuousTicks } from "../../utils/pick-x-axis-ticks";
import { ContinuousScale } from "../../utils/scale";
import { getContinuousSplit } from "../../utils/splits";
import calculateExtend from "./calculate-extend";
import { Label } from "./label";
import { nominalLabel } from "./nominal-label";

interface SplitChartProps {
  interactions: InteractionsProps;
  essence: Essence;
  dataset: Dataset;
  selectDatum: Unary<Dataset, Datum>;
  xScale: ContinuousScale;
  xTicks: ContinuousTicks;
  chartStage: Stage;
}

export const SplitChart: React.SFC<SplitChartProps> = props => {
  const { interactions, chartStage, essence, xScale, xTicks, selectDatum, dataset } = props;
  const splitDatum = selectDatum(dataset);
  const splitDataset = selectSplitDataset(splitDatum);

  const series = essence.getConcreteSeries();

  const label = <Label essence={essence} datum={splitDatum} />;
  const chartId = nominalLabel(splitDatum, essence);

  const continuousSplit = getContinuousSplit(essence);
  const getX = (d: Datum) => d[continuousSplit.reference] as (TimeRange | NumberRange);
  const domain = calculateExtend(splitDataset, essence);

  if (series.count() === 1) {
    const firstSeries = series.first();
    return <BaseChart
      chartId={chartId}
      interactions={interactions}
      label={label}
      xScale={xScale}
      xTicks={xTicks}
      chartStage={chartStage}
      formatter={firstSeries.formatter()}
      yDomain={domain}>
      {({ yScale, lineStage }) => {
        return <SingletonSeriesChartLine
          xScale={xScale}
          yScale={yScale}
          getX={getX}
          dataset={splitDataset.data}
          stage={lineStage}
          essence={essence}
          series={firstSeries} />;
      }}
    </BaseChart>;
  }

  return <BaseChart
    chartId={chartId}
    interactions={interactions}
    label={label}
    xScale={xScale}
    xTicks={xTicks}
    chartStage={chartStage}
    formatter={defaultFormatter}
    yDomain={domain}>
    {({ yScale, lineStage }) => <React.Fragment>
      {series.toArray().map((series, index) => {
        const color = NORMAL_COLORS[index];
        return <ColoredSeriesChartLine
          xScale={xScale}
          yScale={yScale}
          getX={getX}
          dataset={splitDataset.data}
          stage={lineStage}
          essence={essence}
          series={series}
          color={color} />;
      })}
    </React.Fragment>}
  </BaseChart>;
};