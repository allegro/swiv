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
import * as React from "react";
import { DimensionFixtures } from "../../../common/models/dimension/dimension.fixtures";
import { EssenceFixtures } from "../../../common/models/essence/essence.fixtures";
import { TimekeeperFixtures } from "../../../common/models/timekeeper/timekeeper.fixtures";
import { findDOMNode, renderIntoDocument } from "../../utils/test-utils";
import { FilterMenu } from "./filter-menu";

class Wrap extends React.Component {
  render() {
    return <FilterMenu
        clicker={null}
        containerStage={null}
        dimension={DimensionFixtures.wikiCommentLength()}
        essence={EssenceFixtures.wikiTotals()}
        timekeeper={TimekeeperFixtures.fixed()}
        changePosition={null}
        onClose={null}
        openOn={document.createElement("div")}
        refreshMaxTime={() => ""}
      />;
  }
}

describe("FilterMenu", () => {
  it("adds the correct class", () => {

    var renderedComponent = renderIntoDocument(
      <Wrap/>
    );

    expect(findDOMNode(renderedComponent).className, "should contain class").to.contain("filter-menu");
  });

});
