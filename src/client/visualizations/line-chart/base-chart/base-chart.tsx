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

import * as React from "react";
import { ReactNode } from "react";
import { Stage } from "../../../../common/models/stage/stage";
import { Unary } from "../../../../common/utils/functional/functional";
import { Scale } from "../chart-line/chart-line";
import { InteractionsProps } from "../interactions/interaction-controller";
import { ContinuousTicks } from "../utils/pick-x-axis-ticks";
import { ContinuousScale } from "../utils/scale";
import { Background } from "./background";
import getScale from "./scale";

interface ChartLinesProps {
  yScale: Scale;
  lineStage: Stage;
}

class BaseChartProps {
  chartId: string;
  children: Unary<ChartLinesProps, ReactNode>;
  label: ReactNode;
  xScale: ContinuousScale;
  xTicks: ContinuousTicks;
  chartStage: Stage;
  formatter: Unary<number, string>;
  yDomain: [number, number];
  interactions: InteractionsProps;
}

const TEXT_SPACER = 36;

export const BaseChart: React.SFC<BaseChartProps> = props => {
  const { interactions: { dragStart, handleHover, mouseLeave }, yDomain, chartStage, chartId, children, label, formatter, xScale, xTicks } = props;

  const [, xRange] = xScale.range();
  const lineStage = chartStage.within({ top: TEXT_SPACER, right: chartStage.width - xRange, bottom: 1 }); // leave 1 for border
  const axisStage = chartStage.within({ top: TEXT_SPACER, left: xRange, bottom: 1 });

  const yScale = getScale(yDomain, lineStage.height);

  return <React.Fragment>
    <div
      className="measure-line-chart"
      onMouseDown={e => dragStart(chartId, e)}
      onMouseMove={e => handleHover(chartId, e)}
      onMouseLeave={mouseLeave}
    >
      <svg style={chartStage.getWidthHeight()} viewBox={chartStage.getViewBox()}>
        {/*{renderHoverGuide(scale(0), lineStage)}*/}
        <Background
          axisStage={axisStage}
          formatter={formatter}
          gridStage={lineStage}
          xScale={xScale}
          xTicks={xTicks}
          yScale={yScale}
        />
        {children({ yScale, lineStage })}
      </svg>
      {label}
      {/*{renderHighlighter()}*/}
    </div>
    {/* renderChartBubble(splitData, series, chartIndex, containerStage, chartStage, extent, scale) */}
    {/* maybe in chart group??? */}
    {/*<Tooltip/>*/}
  </React.Fragment>;
};