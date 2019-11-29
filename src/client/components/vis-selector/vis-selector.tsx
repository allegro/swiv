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
import { Essence } from "../../../common/models/essence/essence";
import { classNames, findParentWithClass } from "../../utils/dom/dom";
import { SvgIcon } from "../svg-icon/svg-icon";
import { VisSelectorMenu } from "../vis-selector-menu/vis-selector-menu";
import "./vis-selector.scss";

export interface VisSelectorProps {
  clicker: Clicker;
  essence: Essence;
}

export interface VisSelectorState {
  menuOpenOn?: Element;
}

export class VisSelector extends React.Component<VisSelectorProps, VisSelectorState> {
  state: VisSelectorState = {
    menuOpenOn: null
  };

  openMenu = (e: React.MouseEvent<HTMLElement>) => {
    const { menuOpenOn } = this.state;
    const target = e.currentTarget;
    if (menuOpenOn === target) {
      this.closeMenu();
      return;
    }
    this.setState({
      menuOpenOn: target
    });
  }

  closeMenu = () => {
    this.setState({
      menuOpenOn: null
    });
  }

  renderMenu() {
    const { menuOpenOn } = this.state;

    if (!menuOpenOn) return null;
    const { clicker, essence } = this.props;
    return <VisSelectorMenu
      clicker={clicker}
      essence={essence}
      onClose={this.closeMenu}
      openOn={menuOpenOn} />;
  }

  render() {
    const { essence: { visualization } } = this.props;
    const { menuOpenOn } = this.state;

    return <div className={classNames("vis-selector", { active: menuOpenOn })} onClick={this.openMenu}>
      <div className="vis-item selected">
        <SvgIcon svg={require("../../icons/vis-" + visualization.name + ".svg")} />
        <div className="vis-title">{visualization.title}</div>
      </div>
      {this.renderMenu()}
    </div>;
  }
}
