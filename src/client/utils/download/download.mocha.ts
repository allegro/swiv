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

import { expect } from "chai";
import { Dataset } from "plywood";
import { shareOptionsDefaults } from "../../../common/models/share-options/share-options";
import "../../utils/test-utils";
import { datasetToFileString, getMIMEType } from "./download";

describe("Download", () => {
  describe("datasetToFileString", () => {
    it("encloses set/string in brackets appropriately", () => {
      const ds = Dataset.fromJS([
        { y: ["dear", "john"] },
        { y: ["from", "peter"] }
      ]);
      expect(datasetToFileString(ds, "csv", shareOptionsDefaults[0]).indexOf("dear, john"), "csv").to.not.equal(-1);
      expect(datasetToFileString(ds, "tsv", shareOptionsDefaults[1]).indexOf("dear, john"), "tsv").to.not.equal(-1);
    });
  });

  describe("getMIMEType", () => {
    it("works as expected", () => {
      expect(getMIMEType("csv"), "csv").to.equal("text/csv");
      expect(getMIMEType("tsv"), "tsv").to.equal("text/tsv");
      expect(getMIMEType(""), "csv").to.equal("application/json");
      expect(getMIMEType("json"), "csv").to.equal("application/json");
      expect(getMIMEType("invalid"), "csv").to.equal("application/json");
    });
  });
});
