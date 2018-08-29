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

import * as React from "react";
import { Unary } from "../../../common/utils/functional/functional";
import { classNames } from "../../utils/dom/dom";
import { ButtonGroup, GroupMember } from "../button-group/button-group";
import "./input-with-presets.scss";

export interface Preset {
  name: string;
  identity: string;
}

export interface InputWithPresetsProps {
  presets: Preset[];
  selected?: string;
  onChange: Unary<string, void>;
  errorMessage?: string;
  placeholder?: string;
  title?: string;
}

interface InputWithPresetsState {
  customPicked: boolean;
  customValue: string;
}

export class InputWithPresets extends React.Component<InputWithPresetsProps, InputWithPresetsState> {

  initialState(): InputWithPresetsState {
    const { selected, presets } = this.props;
    const presetPicked = presets.some(({ identity }) => identity === selected);
    return {
      customPicked: !presetPicked,
      customValue: presetPicked ? "" : this.props.selected
    };
  }

  state = this.initialState();

  customValueUpdate = (e: React.ChangeEvent<HTMLInputElement>) => {
    const customValue = e.currentTarget.value;
    this.props.onChange(customValue);
    this.setState({ customValue });
  }

  pickCustom = () => {
    this.setState({ customPicked: true });
    this.props.onChange(this.state.customValue);
  }

  pickPreset = (value: string) => {
    this.setState({ customPicked: false });
    this.props.onChange(value);
  }

  render() {
    const { errorMessage, selected, presets, placeholder, title } = this.props;
    const { customPicked, customValue } = this.state;

    const presetButtons = presets.map(({ name, identity }) => ({
      key: identity,
      title: name,
      isSelected: !customPicked && identity === selected,
      onClick: () => this.pickPreset(identity)
    }));

    const customButton: GroupMember = {
      key: "custom",
      title: "...",
      onClick: this.pickCustom,
      isSelected: customPicked
    };

    const members = [...presetButtons, customButton];

    return <React.Fragment>
      <ButtonGroup title={title} groupMembers={members} />
      {customPicked && <input type="text"
                              className={classNames("custom-input", { invalid: errorMessage })}
                              placeholder={placeholder}
                              value={customValue}
                              onChange={this.customValueUpdate} />}
      {errorMessage && <span className="error-message">{errorMessage}</span>}
    </React.Fragment>;
  }
}
