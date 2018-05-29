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

import "./measure-modal.scss";

import * as React from "react";
import { classNames } from "../../utils/dom/dom";

import { Button, FormLabel, ImmutableDropdown, ImmutableInput, Modal } from "../../components/index";

import { Measure } from "../../../common/models/index";

import { MEASURE as LABELS } from "../../../common/models/labels";

import { ImmutableFormDelegate, ImmutableFormState } from "../../utils/immutable-form-delegate/immutable-form-delegate";

export interface MeasureModalProps {
  measure?: Measure;
  onSave?: (measure: Measure) => void;
  onClose?: () => void;
}

export class MeasureModal extends React.Component<MeasureModalProps, ImmutableFormState<Measure>> {
  private hasInitialized = false;

  private delegate: ImmutableFormDelegate<Measure>;

  constructor(props: MeasureModalProps) {
    super(props);
    this.delegate = new ImmutableFormDelegate<Measure>(this);
  }

  initStateFromProps(props: MeasureModalProps) {
    if (props.measure) {
      this.setState({
        newInstance: new Measure(props.measure.valueOf()),
        canSave: false
      });
    }
  }

  componentWillReceiveProps(nextProps: MeasureModalProps) {
    this.initStateFromProps(nextProps);
  }

  componentDidMount() {
    this.initStateFromProps(this.props);
  }

  save() {
    if (!this.state.canSave) return;
    this.props.onSave(this.state.newInstance);
  }

  render(): JSX.Element {
    const { measure } = this.props;
    const { newInstance, canSave, errors } = this.state;
    const saveButtonDisabled = !canSave || measure.equals(newInstance);

    if (!newInstance) return null;

    var makeLabel = FormLabel.simpleGenerator(LABELS, errors, true);
    var makeTextInput = ImmutableInput.simpleGenerator(newInstance, this.delegate.onChange);
    var makeDropDownInput = ImmutableDropdown.simpleGenerator(newInstance, this.delegate.onChange);

    return <Modal
      className="dimension-modal"
      title={measure.title}
      onClose={this.props.onClose}
      onEnter={this.save.bind(this)}
    >
      <form className="general vertical">
        {makeLabel("title")}
        {makeTextInput("title", /^.+$/, true)}

        {makeLabel("units")}
        {makeTextInput("units")}

        {makeLabel("formula")}
        {makeTextInput("formula")}

      </form>

      <div className="button-bar">
        <Button className={classNames("save", { disabled: saveButtonDisabled })} title="OK" type="primary" onClick={this.save.bind(this)}/>
        <Button className="cancel" title="Cancel" type="secondary" onClick={this.props.onClose}/>
      </div>

    </Modal>;
  }

}
