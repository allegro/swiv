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

import { VisualizationManifest } from "../../common/models/visualization-manifest/visualization-manifest";
import { BarChart } from "./bar-chart/bar-chart";
import { Grid } from "./grid/grid";
import { HeatMap } from "./heat-map/heat-map";
import { LineChart } from "./line-chart/line-chart";
import { Table } from "./table/table";
import { Totals } from "./totals/totals";

const VIS_COMPONENTS  = {
  "totals": Totals,
  "table": Table,
  "line-chart": LineChart,
  "bar-chart": BarChart,
  "heatmap": HeatMap,
  "grid": Grid
};

export function getVisualizationComponent({ name }: VisualizationManifest) {
  return VIS_COMPONENTS[name];
}
