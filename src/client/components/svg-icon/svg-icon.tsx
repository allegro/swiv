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

import memoizeOne from "memoize-one";
import * as React from "react";
import "./svg-icon.scss";

// Inspired by: https://gist.github.com/MoOx/1eb30eac43b2114de73a

export interface SvgIconProps {
  svg: string;
  className?: string;
  style?: any;
}

export interface SvgIconState {
}

export class SvgIcon extends React.Component<SvgIconProps, SvgIconState> {
  private svgDomNode: SVGSVGElement;

  parseSvg = memoizeOne((svgContent: string): { viewBox: string | undefined, innerHTML: string } => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgContent, "image/svg+xml");

    const svgs = doc.getElementsByTagName("svg");

    if (svgs.length === 1) {
      const svg = svgs[0];
      const viewBox = svg.getAttribute("viewBox");
      return { viewBox, innerHTML: svg.innerHTML };
    }

    return { viewBox: "0 0 16 16", innerHTML: '<rect width="16" height="16" fill="red" />' };
  });

  render() {
    var { className, style, svg } = this.props;

    const { viewBox, innerHTML } = this.parseSvg(svg);

    return React.createElement("svg", {
      className: "svg-icon " + (className || ""),
      viewBox,
      preserveAspectRatio: "xMidYMid meet",
      style,
      dangerouslySetInnerHTML: { __html: innerHTML }
    });
  }
}
