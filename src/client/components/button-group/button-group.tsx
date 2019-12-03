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
import { Fn } from "../../../common/utils/general/general";
import { classNames } from "../../utils/dom/dom";
import "./button-group.scss";

export interface GroupMember<T> {
  title: string;
  onClick: Fn;
  key: string | number;
  className?: string;
  isSelected?: boolean;
}

export interface ButtonGroupProps<T> {
  groupMembers: Array<GroupMember<T>>;
  title?: string;
  className?: string;
}

export interface ButtonGroupState {
}

export class ButtonGroup<T> extends React.Component<ButtonGroupProps<T>, ButtonGroupState> {

  renderMembers() {
    const { groupMembers } = this.props;
    return groupMembers.map(button => {
      return <li
        className={classNames("group-member", button.className, { selected: button.isSelected })}
        key={button.key}
        onClick={button.onClick}
      >
        {button.title}
      </li>;
    });
  }

  render() {
    const { title, className } = this.props;

    return <div className={classNames("button-group", className)}>
      {title ? <div className="button-group-title">{title}</div> : null}
      <ul className="group-container">{this.renderMembers()}</ul>
    </div>;
  }
}
