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

import { expect } from "chai";
import { Timezone } from "chronoshift";
import * as React from "react";
import * as ReactDOM from "react-dom";
import * as TestUtils from "react-dom/test-utils";
import { renderIntoDocument } from "../../utils/test-utils";
import { DateRangePicker } from "./date-range-picker";

describe("DateRangePicker", () => {
  it("adds the correct class", () => {
    var renderedComponent = renderIntoDocument(
      <DateRangePicker
        startTime={new Date(Date.UTC(2003, 11, 2))}
        endTime={new Date(Date.UTC(2004, 11, 2))}
        maxTime={new Date(Date.UTC(2004, 11, 2))}
        timezone={Timezone.UTC}
        onStartChange={() => {}}
        onEndChange={() => {}}
        index={0}
      />
    );

    expect(TestUtils.isCompositeComponent(renderedComponent), "should be composite").to.equal(true);
    expect(ReactDOM.findDOMNode(renderedComponent).className, "should contain class").to.contain("date-range-picker");
  });
  /* TODO: remove comments after the bug will be resolved https://github.com/chaijs/chai/pull/1071 */
  /*
    it('throws on non round start time input', () => {
      expect(() => {
        return renderIntoDocument(
          <DateRangePicker
            startTime={new Date(Date.UTC(2003, 11, 2, 2, 4))}
            endTime={new Date(Date.UTC(2004, 11, 2))}
            maxTime={new Date(Date.UTC(2004, 11, 2))}
            timezone={Timezone.UTC}
            onStartChange={() => {}}
            onEndChange={() => {}}
          />);
      }).to.throw('start time must be round');
    });*/

  /* TODO: remove comments after the bug will be resolved https://github.com/chaijs/chai/pull/1071 */
  /*  it('throws on non round end time input', () => {
      expect(() => {
        return renderIntoDocument(
        <DateRangePicker
          startTime={new Date(Date.UTC(2003, 11, 2))}
          endTime={new Date(Date.UTC(2004, 11, 2, 2, 3))}
          maxTime={new Date(Date.UTC(2004, 11, 2))}
          timezone={Timezone.UTC}
          onStartChange={() => {}}
          onEndChange={() => {}}
        />);
      }).to.throw('end time must be round'));
    });*/

  it("does not error on null end time", () => {
    expect(() => {
      renderIntoDocument(
        <DateRangePicker
          startTime={new Date(Date.UTC(2003, 11, 2))}
          endTime={null}
          maxTime={new Date(Date.UTC(2004, 11, 2))}
          timezone={Timezone.UTC}
          onStartChange={() => {}}
          onEndChange={() => {}}
          index={0}
        />);
    }).to.not.throw();
  });

});
