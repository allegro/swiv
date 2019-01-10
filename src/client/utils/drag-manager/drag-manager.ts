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

import { Dimension } from "../../../common/models/dimension/dimension";
import { FilterClause } from "../../../common/models/filter-clause/filter-clause";
import { Measure } from "../../../common/models/measure/measure";
import { Series } from "../../../common/models/series/series";
import { Split } from "../../../common/models/split/split";

enum DraggedElementType { DIMENSION, MEASURE, SERIES, SPLIT, FILTER }

interface DraggedElementBase<T> {
  type: DraggedElementType;
  element: T;
}

interface DraggedDimension extends DraggedElementBase<Dimension> {
  type: DraggedElementType.DIMENSION;
}

interface DraggedMeasure extends DraggedElementBase<Measure> {
  type: DraggedElementType.MEASURE;
}

interface DraggedSeries extends DraggedElementBase<Series> {
  type: DraggedElementType.SERIES;
}

interface DraggedSplit extends DraggedElementBase<Split> {
  type: DraggedElementType.SPLIT;
}

interface DraggedFilter extends DraggedElementBase<FilterClause> {
  type: DraggedElementType.FILTER;
}

type DraggedElement = DraggedDimension | DraggedMeasure | DraggedFilter | DraggedSplit | DraggedSeries;

export class DragManager {
  static dragging: DraggedElement = null;

  static init() {
    document.addEventListener("dragend", () => {
      DragManager.dragging = null;
    }, false);
  }

  static isDraggingSplit(): boolean {
    return this.dragging.type === DraggedElementType.SPLIT;
  }

  static isDraggingFilter(): boolean {
    return this.dragging.type === DraggedElementType.FILTER;
  }

  static setDragDimension(element: Dimension) {
    this.dragging = { type: DraggedElementType.DIMENSION, element };
  }

  static setDragMeasure(element: Measure) {
    this.dragging = { type: DraggedElementType.MEASURE, element };
  }

  static setDragSeries(element: Series) {
    this.dragging = { type: DraggedElementType.SERIES, element };
  }

  static setDragFilter(element: FilterClause) {
    this.dragging = { type: DraggedElementType.FILTER, element };
  }

  static setDragSplit(element: Split) {
    this.dragging = { type: DraggedElementType.SPLIT, element };
  }

  static draggingDimension(): Dimension {
    const el = DragManager.dragging;
    return el.type === DraggedElementType.DIMENSION ? el.element : null;
  }

  static draggingMeasure(): Measure {
    const el = DragManager.dragging;
    return el.type === DraggedElementType.MEASURE ? el.element : null;
  }

  static draggingSplit(): Split {
    const el = DragManager.dragging;
    return el.type === DraggedElementType.SPLIT ? el.element : null;
  }

  static draggingSeries(): Series {
    const el = DragManager.dragging;
    return el.type === DraggedElementType.SERIES ? el.element : null;
  }

  static draggingFilter(): FilterClause {
    const el = DragManager.dragging;
    return el.type === DraggedElementType.FILTER ? el.element : null;
  }
}
