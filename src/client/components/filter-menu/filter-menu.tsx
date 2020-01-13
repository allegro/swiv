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

import * as React from "react";
import { Clicker } from "../../../common/models/clicker/clicker";
import { Dimension } from "../../../common/models/dimension/dimension";
import { DragPosition } from "../../../common/models/drag-position/drag-position";
import { Essence } from "../../../common/models/essence/essence";
import { Stage } from "../../../common/models/stage/stage";
import { Timekeeper } from "../../../common/models/timekeeper/timekeeper";
import { Fn } from "../../../common/utils/general/general";
import { BooleanFilterMenu } from "./boolean-filter-menu/boolean-filter-menu";
import "./filter-menu.scss";
import { NumberFilterMenu } from "./number-filter-menu/number-filter-menu";
import { StringFilterMenu } from "./string-filter-menu/string-filter-menu";
import { TimeFilterMenu } from "./time-filter-menu/time-filter-menu";

export interface FilterMenuProps {
  essence: Essence;
  timekeeper: Timekeeper;
  clicker: Clicker;
  containerStage?: Stage;
  openOn: Element;
  dimension: Dimension;
  changePosition: DragPosition;
  onClose: Fn;
  refreshMaxTime: Fn;
  inside?: Element;
}

export const FilterMenu: React.SFC<FilterMenuProps> = (props: FilterMenuProps) => {
  if (!props.dimension) return null;
  switch (props.dimension.kind) {
    case "time":
      return <TimeFilterMenu {...props} />;
    case "boolean":
      return <BooleanFilterMenu {...props} />;
    case "number":
      return <NumberFilterMenu {...props} />;
    default:
      return <StringFilterMenu {...props} />;
  }
};
