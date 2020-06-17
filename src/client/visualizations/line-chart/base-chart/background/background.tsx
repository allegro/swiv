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
import { Stage } from "../../../../../common/models/stage/stage";
import { Unary } from "../../../../../common/utils/functional/functional";
import { GridLines } from "../../../../components/grid-lines/grid-lines";
import { VerticalAxis } from "../../../../components/vertical-axis/vertical-axis";
import { LinearScale } from "../../../../utils/scales/scales";
import { pickTicks } from "../../../../utils/ticks/ticks";
import { ContinuousScale } from "../../utils/continuous-types";
import { ContinuousTicks } from "../../utils/pick-x-axis-ticks";
import { TICK_WIDTH, TICKS_COUNT } from "../y-scale";
import "./background.scss";
import { BottomBorder } from "../../../../components/bottom-border/bottom-border";

interface BackgroundProps {
  gridStage: Stage;
  axisStage: Stage;
  xScale: ContinuousScale;
  xTicks: ContinuousTicks;
  yScale: LinearScale;
  formatter: Unary<number, string>;
}

export const Background: React.SFC<BackgroundProps> = props => {
  const { formatter, gridStage, axisStage, xScale, yScale, xTicks } = props;

  return <React.Fragment>
    <GridLines
      orientation="horizontal"
      scale={yScale}
      ticks={pickTicks(yScale, TICKS_COUNT)}
      stage={gridStage}
    />
    {/* TODO: omit last xTick if it's equal to last data point so we don't overplot with yAxis */}
    <GridLines
      orientation="vertical"
      scale={xScale}
      ticks={xTicks}
      stage={gridStage}
    />
    <VerticalAxis
      tickSize={TICK_WIDTH}
      stage={axisStage}
      formatter={formatter}
      ticks={pickTicks(yScale, TICKS_COUNT)}
      scale={yScale}
    />
    <BottomBorder stage={gridStage} />
  </React.Fragment>;
};
