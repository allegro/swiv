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

import { expect } from "chai";
import { MANIFESTS } from "../../manifests";
import { TABLE_MANIFEST } from "../../manifests/table/table";
import { Essence } from "../../models/essence/essence";
import { SeriesList } from "../../models/series-list/series-list";
import { PERCENT_FORMAT } from "../../models/series/series-format";
import { measureSeries, quantileSeries } from "../../models/series/series.fixtures";
import { SortDirection } from "../../models/sort/sort";
import { numberSplitCombine, stringSplitCombine, timeSplitCombine } from "../../models/split/split.fixtures";
import { Splits } from "../../models/splits/splits";
import { dataCube } from "../test/data-cube.fixture";
import { mockEssence } from "../test/essence.fixture";
import { count, quantile, sum } from "../test/measure";
import { fromReference, measureSeriesDefinition, quantileSeriesDefinition } from "./series-definition.fixtures";
import { numberSplitDefinition, stringSplitDefinition, timeSplitDefinition } from "./split-definition.fixtures";
import { ViewDefinition4 } from "./view-definition-4";
import { mockViewDefinition } from "./view-definition-4.fixture";
import { ViewDefinitionConverter4 } from "./view-definition-converter-4";

const converter = new ViewDefinitionConverter4();
const toEssence = (viewDef: ViewDefinition4) => converter.fromViewDefinition(viewDef, dataCube, MANIFESTS);

function assertEqlEssence(actual: Essence, expected: Essence) {
  try {
    expect(actual.equals(expected)).to.be.true;
  } catch (e) {
    expect(actual.toJS()).to.deep.equal(expected.toJS());
    throw e;
  }
}

function assertEqlEssenceWithoutVisResolve(actual: Essence, expected: Essence) {
  assertEqlEssence(actual.set("visResolve", null), expected.set("visResolve", null));
}

describe("ViewDefinitionConverter4", () => {
  describe("Base case", () => {
    it("converts to default essence", () => {
      const result = toEssence(mockViewDefinition());
      const expected = mockEssence();
      assertEqlEssence(result, expected);
    });
  });

  describe("Splits", () => {
    it("reads string split", () => {
      const result = toEssence(mockViewDefinition({
        splits: [stringSplitDefinition("string_a")],
        visualization: TABLE_MANIFEST.name
      }));
      const expected = mockEssence({
        splits: Splits.fromSplit(stringSplitCombine("string_a")),
        visualization: TABLE_MANIFEST
      });
      assertEqlEssence(result, expected);
    });

    it("reads string split with sort", () => {
      const result = toEssence(mockViewDefinition({
        splits: [stringSplitDefinition("string_a", "count")],
        visualization: TABLE_MANIFEST.name
      }));
      const expected = mockEssence({
        splits: Splits.fromSplit(stringSplitCombine("string_a", "count")),
        visualization: TABLE_MANIFEST
      });
      assertEqlEssence(result, expected);
    });

    it("reads string split with descending sort", () => {
      const result = toEssence(mockViewDefinition({
        splits: [stringSplitDefinition("string_a", "count", SortDirection.descending)],
        visualization: TABLE_MANIFEST.name
      }));
      const expected = mockEssence({
        splits: Splits.fromSplit(stringSplitCombine("string_a", "count", SortDirection.descending)),
        visualization: TABLE_MANIFEST
      });
      assertEqlEssence(result, expected);
    });

    it("reads string split with limit", () => {
      const result = toEssence(mockViewDefinition({
        splits: [stringSplitDefinition("string_a", "string_a", SortDirection.descending, 10)],
        visualization: TABLE_MANIFEST.name
      }));
      const expected = mockEssence({
        splits: Splits.fromSplit(stringSplitCombine("string_a", "string_a", SortDirection.descending, 10)),
        visualization: TABLE_MANIFEST
      });
      assertEqlEssence(result, expected);
    });

    it("reads time split", () => {
      const result = toEssence(mockViewDefinition({
        splits: [timeSplitDefinition("time", "P1D")],
        visualization: TABLE_MANIFEST.name
      }));
      const expected = mockEssence({
        splits: Splits.fromSplit(timeSplitCombine("time", "P1D")),
        visualization: TABLE_MANIFEST
      });
      assertEqlEssence(result, expected);
    });

    it("reads time split with granularity", () => {
      const result = toEssence(mockViewDefinition({
        splits: [timeSplitDefinition("time", "PT2M")],
        visualization: TABLE_MANIFEST.name
      }));
      const expected = mockEssence({
        splits: Splits.fromSplit(timeSplitCombine("time", "PT2M")),
        visualization: TABLE_MANIFEST
      });
      assertEqlEssence(result, expected);
    });

    it("reads number split", () => {
      const result = toEssence(mockViewDefinition({
        splits: [numberSplitDefinition("numeric", 100)],
        visualization: TABLE_MANIFEST.name
      }));
      const expected = mockEssence({
        splits: Splits.fromSplit(numberSplitCombine("numeric", 100)),
        visualization: TABLE_MANIFEST
      });
      assertEqlEssence(result, expected);
    });

    it("omits split on non existing dimension", () => {
      const result = toEssence(mockViewDefinition({
        splits: [
          stringSplitDefinition("string_a"),
          stringSplitDefinition("foobar-dimension")
        ],
        visualization: TABLE_MANIFEST.name
      }));
      const expected = mockEssence({
        splits: Splits.fromSplit(stringSplitCombine("string_a")),
        visualization: TABLE_MANIFEST
      });
      assertEqlEssence(result, expected);
    });

    it("omits dimension with non existing sort reference", () => {
      const result = toEssence(mockViewDefinition({
        splits: [
          stringSplitDefinition("string_a"),
          stringSplitDefinition("string_b", "foobar-dimension")
        ],
        visualization: TABLE_MANIFEST.name
      }));
      const expected = mockEssence({
        splits: Splits.fromSplit(stringSplitCombine("string_a")),
        visualization: TABLE_MANIFEST
      });
      assertEqlEssence(result, expected);
    });
  });

  describe("Series", () => {
    it("reads simple series", () => {
      const result = toEssence(mockViewDefinition({
        series: [fromReference("count")]
      }));
      const expected = mockEssence({
        series: SeriesList.fromSeries([measureSeries("count")])
      });
      assertEqlEssence(result, expected);
    });

    it("reads multiple simple series", () => {
      const result = toEssence(mockViewDefinition({
        series: [
          fromReference("count"),
          fromReference("sum")
        ]
      }));
      const expected = mockEssence({
        series: SeriesList.fromSeries([
          measureSeries("count"),
          measureSeries("sum")
        ])
      });
      assertEqlEssence(result, expected);
    });

    it("reads measure series", () => {
      const result = toEssence(mockViewDefinition({
        series: [measureSeriesDefinition("sum")]
      }));
      const expected = mockEssence({
        series: SeriesList.fromSeries([measureSeries("sum")])
      });
      assertEqlEssence(result, expected);
    });

    it("reads measure series with custom format", () => {
      const result = toEssence(mockViewDefinition({
        series: [measureSeriesDefinition("sum", PERCENT_FORMAT)]
      }));
      const expected = mockEssence({
        series: SeriesList.fromSeries([measureSeries("sum", PERCENT_FORMAT)])
      });
      assertEqlEssence(result, expected);
    });

    it("reads quantile series", () => {
      const result = toEssence(mockViewDefinition({
        series: [quantileSeriesDefinition("quantile")]
      }));
      const expected = mockEssence({
        series: SeriesList.fromSeries([quantileSeries("quantile")])
      });
      assertEqlEssence(result, expected);
    });

    it("reads quantile series with custom percentile", () => {
      const result = toEssence(mockViewDefinition({
        series: [quantileSeriesDefinition("quantile", 90)]
      }));
      const expected = mockEssence({
        series: SeriesList.fromSeries([quantileSeries("quantile", 90)])
      });
      assertEqlEssence(result, expected);
    });

    it("infers quantile series from reference to measure that has quantile expression", () => {
      const result = toEssence(mockViewDefinition({
        series: [fromReference("quantile")]
      }));
      const expected = mockEssence({
        series: SeriesList.fromSeries([quantileSeries("quantile")])
      });
      assertEqlEssence(result, expected);
    });
  });
});
