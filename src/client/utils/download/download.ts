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

import { Timezone } from "chronoshift";
import * as filesaver from "file-saver";
import { tz as getMomentWithTimezone } from "moment-timezone";
import { Dataset, DatasetJSFull, TabulatorOptions } from "plywood";
import { FixedTimeFilterClause } from "../../../common/models/filter-clause/filter-clause";
import { Filter } from "../../../common/models/filter/filter";
import { complement } from "../../../common/utils/functional/functional";
import { isBlank } from "../../../common/utils/general/general";
import { DataSetWithTabOptions } from "../../views/cube-view/cube-view";

export type FileFormat = "csv" | "tsv" | "json";

export function getMIMEType(fileType: string) {
  switch (fileType) {
    case "csv":
      return "text/csv";
    case "tsv":
      return "text/tsv";
    default:
      return "application/json";
  }
}

export function download({ dataset, options }: DataSetWithTabOptions, fileFormat: FileFormat, fileName?: string): void {
  const type = `${getMIMEType(fileFormat)};charset=utf-8`;
  const blob = new Blob([datasetToFileString(dataset, fileFormat, options)], { type });
  if (!fileName) fileName = `${new Date()}-data`;
  fileName += `.${fileFormat}`;
  filesaver.saveAs(blob, fileName, true); // true == disable auto BOM
}

export function datasetToFileString(dataset: Dataset, fileFormat: FileFormat, options?: TabulatorOptions): string {
  const optionsCopy = options ? { ...options } : {};
  if (fileFormat === "csv") {
    return dataset.toCSV(optionsCopy);
  } else if (fileFormat === "tsv") {
    return dataset.toTSV(optionsCopy);
  } else {
    const datasetJS = dataset.toJS() as DatasetJSFull;
    return JSON.stringify(datasetJS.data, null, 2);
  }
}

function dateToFileString(date: Date): string {
  return getMomentWithTimezone(date, Timezone.UTC.toString()).format("YYYY-MM-DD_HH_mm_ss");
}

export function dateFromFilter(filter: Filter): string {
  const timeFilter: FixedTimeFilterClause = filter.clauses.find(clause => clause instanceof FixedTimeFilterClause) as FixedTimeFilterClause;
  if (!timeFilter) return "";
  const { start, end } = timeFilter.values.first();
  return `${dateToFileString(start)}_${dateToFileString(end)}`;
}

export function makeFileName(...nameComponents: string[]): string {
  return nameComponents
    .filter(complement(isBlank))
    .map(name => name.toLowerCase())
    .join("_")
    .substr(0, 200);
}
