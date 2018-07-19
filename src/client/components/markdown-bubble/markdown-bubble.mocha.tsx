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
import { shallow } from "enzyme";
import * as React from "react";
import { BodyPortal } from "..";
import { MarkdownBubble } from "./markdown-bubble";

describe("<MarkdownBubble>", () => {

  it("should pass position props to <BodyPortal>", () => {
    const wrapper = shallow(<MarkdownBubble top={10} left={20} bottom={30} content={""}/>);
    const portal = wrapper.find(BodyPortal);

    expect(portal.prop("top")).to.equal(10);
    expect(portal.prop("left")).to.equal(20);
    expect(portal.prop("bottom")).to.equal(30);
  });

  it("should render html for markdown", () => {
    const wrapper = shallow(<MarkdownBubble
      top={10}
      left={20}
      bottom={30}
      content={"*strong* **em** [link](example.com)"}/>);
    const content = wrapper.find(".markdown-content");

    expect(content.html()).to.be.equal("<div class=\"markdown-content\"><p><em>strong</em> <strong>em</strong> <a href=\"example.com\">link</a></p>\n</div>");
  });
});
