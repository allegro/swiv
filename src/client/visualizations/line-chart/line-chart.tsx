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

import { Dataset } from "plywood";
import * as React from "react";
import { LINE_CHART_MANIFEST } from "../../../common/visualization-manifests/line-chart/line-chart";
import { BaseVisualization, BaseVisualizationState } from "../base-visualization/base-visualization";
import { Charts } from "./charts/charts";
import { InteractionController } from "./interactions/interaction-controller";
import "./line-chart.scss";
import pickXAxisTicks from "./utils/pick-x-axis-ticks";
import calculateXScale from "./utils/x-scale";
import { XAxis } from "./x-axis/x-axis";

// magic number, probably shared
const Y_AXIS_WIDTH = 60;

export class LineChart extends BaseVisualization<BaseVisualizationState> {
  protected className = LINE_CHART_MANIFEST.name;

  private chartsRef = React.createRef<HTMLDivElement>();

  protected renderInternals(dataset: Dataset): JSX.Element {
    const { essence, timekeeper, stage } = this.props;

    const scale = calculateXScale(essence, timekeeper, dataset, stage.width - Y_AXIS_WIDTH);
    const ticks = pickXAxisTicks(scale, essence.timezone);

    const maxHeight = stage.height - 30; /* magic number for: X_AXIS_HEIGHT; */

    return <InteractionController
      dataset={dataset}
      xScale={scale}
      chartsContainerRef={this.chartsRef}
      essence={essence}
      highlight={this.getHighlight()}
      dropHighlight={this.dropHighlight}
      acceptHighlight={this.acceptHighlight}
      saveHighlight={this.highlight}>
      {interactions => {
        return <div className="line-chart-container">
          <div className="line-charts" ref={this.chartsRef} style={{ maxHeight }}>
            <Charts
              interactions={interactions}
              stage={stage}
              essence={essence}
              xScale={scale}
              xTicks={ticks}
              dataset={dataset} />
          </div>
          <XAxis
            width={stage.width}
            ticks={ticks}
            scale={scale}
            timezone={essence.timezone} />
        </div>;
      }}
    </InteractionController>;
  }
}
