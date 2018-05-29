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

import "./immutable-dropdown.scss";

import { ImmutableUtils } from "../../../common/utils/index";

import * as React from "react";
import { ListItem } from "../../../common/models/index";
import { ChangeFn } from "../../utils/immutable-form-delegate/immutable-form-delegate";
import { Dropdown } from "../dropdown/dropdown";

export interface ImmutableDropdownProps<T> {
  instance: any;
  path: string;
  label?: string;

  items: T[];
  equal: (a: T, b: T) => boolean;
  renderItem: (a: T) => string;
  keyItem: (a: T) => any;
  onChange: ChangeFn;
}

export interface ImmutableDropdownState {
}

export class ImmutableDropdown<T> extends React.Component<ImmutableDropdownProps<T>, ImmutableDropdownState> {
  // Allows usage in TSX :
  // const MyDropdown = ImmutableDropdown.specialize<MyImmutableClass>();
  // then : <MyDropdown ... />
  static specialize<U>() {
    return ImmutableDropdown as { new (props: ImmutableDropdownProps<U>): ImmutableDropdown<U>; };
  }

  static simpleGenerator(instance: any, changeFn: ChangeFn) {
    return (name: string, items: ListItem[]) => {
      let MyDropDown = ImmutableDropdown.specialize<ListItem>();

      return <MyDropDown
        items={items}
        instance={instance}
        path={name}
        equal={(a: ListItem, b: ListItem) => a.value === b.value}
        renderItem={(a: ListItem) => a ? a.label : ""}
        keyItem={(a: ListItem) => a.value || "default_value"}
        onChange={changeFn}
      />;
    };
  }

  onChange(newSelectedItem: T) {
    const { instance, path, onChange, keyItem } = this.props;

    onChange(
      ImmutableUtils.setProperty(instance, path, keyItem(newSelectedItem)),
      true,
      path,
      undefined
    );
  }

  render() {
    const { label, items, equal, renderItem, keyItem, instance, path } = this.props;
    const MyDropDown = Dropdown.specialize<T>();

    const selectedValue = ImmutableUtils.getProperty(instance, path);

    const selectedItem: T = items.filter(item => keyItem(item) === selectedValue)[0] || items[0];

    return <MyDropDown
      className="immutable-dropdown input"
      label={label}
      items={items}
      selectedItem={selectedItem}
      equal={equal}
      renderItem={renderItem}
      keyItem={keyItem}
      onSelect={this.onChange.bind(this)}
    />;
  }
}
