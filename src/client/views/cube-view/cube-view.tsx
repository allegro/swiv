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

import './cube-view.scss';

import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { Expression, Dataset } from 'plywood';
import { Timezone } from 'chronoshift';
import { Fn } from '../../../common/utils/general/general';
import { FunctionSlot } from '../../utils/function-slot/function-slot';
import { DragManager } from '../../utils/drag-manager/drag-manager';
import { Colors, Clicker, Timekeeper, DataCube, Dimension, Essence, Filter, Stage, Measure,
  SplitCombine, Splits, VisStrategy, VisualizationProps, User,
  Customization, Manifest, ViewSupervisor, Device, DeviceSize } from '../../../common/models/index';
import { MANIFESTS } from '../../../common/manifests/index';

import { RawDataModal } from '../../modals/index';

import {
  DimensionMeasurePanel, FilterTile, SplitTile, VisSelector, ManualFallback, DropIndicator,
  PinboardPanel, ResizeHandle, GlobalEventListener, Modal
} from '../../components/index';

import { SupervisedCubeHeaderBar } from './supervised-cube-header-bar/supervised-cube-header-bar';
import { CubeHeaderBar } from './cube-header-bar/cube-header-bar';

import { getVisualizationComponent } from '../../visualizations/index';
import * as localStorage from '../../utils/local-storage/local-storage';
import {ViewDefinitionModal} from "../../modals/view-definition-modal/view-definition-modal";

export interface CubeViewLayout {
  dimensionPanelWidth: number;
  pinboardWidth: number;
}

export interface CubeViewProps extends React.Props<any> {
  initTimekeeper?: Timekeeper;
  maxFilters?: number;
  maxSplits?: number;
  user?: User;
  hash: string;
  updateViewHash: (newHash: string, force?: boolean) => void;
  getCubeViewHash?: (essence: Essence, withPrefix?: boolean) => string;
  getEssenceFromHash: (hash: string, dateCube: DataCube, visualizations: Manifest[]) => Essence;
  dataCube: DataCube;
  onNavClick?: Fn;
  customization?: Customization;
  transitionFnSlot?: FunctionSlot<string>;
  supervisor?: ViewSupervisor;
  addEssenceToCollection?: (essence: Essence) => void;
  stateful: boolean;
}

export interface CubeViewState {
  essence?: Essence;
  timekeeper?: Timekeeper;
  visualizationStage?: Stage;
  menuStage?: Stage;
  dragOver?: boolean;
  showRawDataModal?: boolean;
  showViewDefinitionModal?: boolean;
  layout?: CubeViewLayout;
  deviceSize?: DeviceSize;
  updatingMaxTime?: boolean;
}

const MIN_PANEL_WIDTH = 240;
const MAX_PANEL_WIDTH = 400;

export class CubeView extends React.Component<CubeViewProps, CubeViewState> {
  static defaultProps: Partial<CubeViewProps> = {
    maxFilters: 20,
    maxSplits: 3
  };

  public mounted: boolean;
  private clicker: Clicker;
  private downloadableDataset: Dataset;

  constructor(props: CubeViewProps) {
    super(props);

    this.state = {
      essence: null,
      dragOver: false,
      showRawDataModal: false,
      layout: this.getStoredLayout(),
      updatingMaxTime: false
    };

    this.clicker = {
      changeFilter: (filter: Filter, colors?: Colors) => {
        let {essence} = this.state;
        essence = essence.changeFilter(filter);
        if (colors) essence = essence.changeColors(colors);
        this.setState({essence});
      },
      changeTimeSelection: (selection: Expression) => {
        const {essence} = this.state;
        this.setState({essence: essence.changeTimeSelection(selection)});
      },
      changeSplits: (splits: Splits, strategy: VisStrategy, colors?: Colors) => {
        let {essence} = this.state;
        if (colors) essence = essence.changeColors(colors);
        this.setState({essence: essence.changeSplits(splits, strategy)});
      },
      changeSplit: (split: SplitCombine, strategy: VisStrategy) => {
        const {essence} = this.state;
        this.setState({essence: essence.changeSplit(split, strategy)});
      },
      addSplit: (split: SplitCombine, strategy: VisStrategy) => {
        const {essence} = this.state;
        this.setState({essence: essence.addSplit(split, strategy)});
      },
      removeSplit: (split: SplitCombine, strategy: VisStrategy) => {
        const {essence} = this.state;
        this.setState({essence: essence.removeSplit(split, strategy)});
      },
      changeColors: (colors: Colors) => {
        const {essence} = this.state;
        this.setState({essence: essence.changeColors(colors)});
      },
      changeVisualization: (visualization: Manifest) => {
        const {essence} = this.state;
        this.setState({essence: essence.changeVisualization(visualization)});
      },
      pin: (dimension: Dimension) => {
        const {essence} = this.state;
        this.setState({essence: essence.pin(dimension)});
      },
      unpin: (dimension: Dimension) => {
        const {essence} = this.state;
        this.setState({essence: essence.unpin(dimension)});
      },
      changePinnedSortMeasure: (measure: Measure) => {
        const {essence} = this.state;
        this.setState({essence: essence.changePinnedSortMeasure(measure)});
      },
      toggleMultiMeasureMode: () => {
        const {essence} = this.state;
        this.setState({essence: essence.toggleMultiMeasureMode()});
      },
      toggleEffectiveMeasure: (measure: Measure) => {
        const {essence} = this.state;
        this.setState({essence: essence.toggleEffectiveMeasure(measure)});
      },
      changeHighlight: (owner: string, measure: string, delta: Filter) => {
        const {essence} = this.state;
        this.setState({essence: essence.changeHighlight(owner, measure, delta)});
      },
      acceptHighlight: () => {
        const {essence} = this.state;
        this.setState({essence: essence.acceptHighlight()});
      },
      dropHighlight: () => {
        const {essence} = this.state;
        this.setState({essence: essence.dropHighlight()});
      }
    };
  }

  refreshMaxTime() {
    const { essence, timekeeper } = this.state;
    const { dataCube } = essence;
    this.setState({ updatingMaxTime: true });

    DataCube.queryMaxTime(dataCube)
      .then((updatedMaxTime) => {
        if (!this.mounted) return;
        this.setState({
          timekeeper: timekeeper.updateTime(dataCube.name, updatedMaxTime),
          updatingMaxTime: false
        });
      });
  }

  componentWillMount() {
    const { hash, dataCube, updateViewHash, initTimekeeper, getCubeViewHash } = this.props;
    let essence = this.getEssenceFromHash(dataCube, hash);
    if (!essence) {
      if (!dataCube) throw new Error('must have data cube');
      essence = this.getEssenceFromDataCube(dataCube);
      updateViewHash(getCubeViewHash(essence), true);
    }
    this.setState({
      essence,
      timekeeper: initTimekeeper || Timekeeper.EMPTY
    });
  }

  componentDidMount() {
    const { transitionFnSlot, getCubeViewHash } = this.props;

    this.mounted = true;
    DragManager.init();
    this.globalResizeListener();

    if (transitionFnSlot) {
      transitionFnSlot.fill((oldDataCube: DataCube, newDataCube: DataCube) => {
        if (!DataCube.isDataCube(oldDataCube)) return null;
        if (!DataCube.isDataCube(newDataCube)) return null;

        if (newDataCube === oldDataCube || !newDataCube.sameGroup(oldDataCube)) return null;
        const { essence } = this.state;
        if (!essence) return null;
        return getCubeViewHash(essence.updateDataCube(newDataCube));
      });
    }
  }

  componentWillReceiveProps(nextProps: CubeViewProps) {
    const { hash, dataCube, updateViewHash, getCubeViewHash } = this.props;
    if (!nextProps.dataCube) throw new Error('must have data cube');

    if (dataCube.name !== nextProps.dataCube.name || hash !== nextProps.hash) {
      let hashEssence = this.getEssenceFromHash(nextProps.dataCube, nextProps.hash);
      if (!hashEssence) {
        hashEssence = this.getEssenceFromDataCube(nextProps.dataCube);
        updateViewHash(getCubeViewHash(hashEssence), true);
      }

      this.setState({ essence: hashEssence });
    }
  }

  componentWillUpdate(nextProps: CubeViewProps, nextState: CubeViewState): void {
    const { updateViewHash, getCubeViewHash } = this.props;
    const { essence } = this.state;
    if (updateViewHash && !nextState.essence.equals(essence)) {
      updateViewHash(getCubeViewHash(nextState.essence));
    }
  }

  componentWillUnmount() {
    const { transitionFnSlot } = this.props;

    this.mounted = false;
    if (transitionFnSlot) transitionFnSlot.clear();
  }

  getEssenceFromDataCube(dataCube: DataCube): Essence {
    const essence = Essence.fromDataCube(dataCube, { dataCube: dataCube, visualizations: MANIFESTS });
    const isMulti = !!localStorage.get('is-multi-measure');
    return essence.multiMeasureMode !== isMulti ? essence.toggleMultiMeasureMode() : essence;
  }

  getEssenceFromHash(dataCube: DataCube, hash: string): Essence {
    if (!dataCube || !hash) return null;

    const { getEssenceFromHash } = this.props;
    return getEssenceFromHash(hash, dataCube, MANIFESTS);
  }

  globalResizeListener() {
    const { container, visualization } = this.refs;
    const containerDOM = ReactDOM.findDOMNode(container);
    const visualizationDOM = ReactDOM.findDOMNode(visualization);
    if (!containerDOM || !visualizationDOM) return;

    this.setState({
      deviceSize: Device.getSize(),
      menuStage: Stage.fromClientRect(containerDOM.getBoundingClientRect()),
      visualizationStage: Stage.fromClientRect(visualizationDOM.getBoundingClientRect())
    });
  }

  canDrop(e: DragEvent): boolean {
    return Boolean(DragManager.getDragDimension());
  }

  dragEnter(e: DragEvent) {
    if (!this.canDrop(e)) return;
    e.preventDefault();
    this.setState({ dragOver: true });
  }

  dragOver(e: DragEvent) {
    if (!this.canDrop(e)) return;
    e.dataTransfer.dropEffect = 'move';
    e.preventDefault();
  }

  dragLeave(e: DragEvent) {
    this.setState({ dragOver: false });
  }

  drop(e: DragEvent) {
    if (!this.canDrop(e)) return;
    e.preventDefault();
    const dimension = DragManager.getDragDimension();
    if (dimension) {
      this.clicker.changeSplit(SplitCombine.fromExpression(dimension.expression), VisStrategy.FairGame);
    }
    this.setState({ dragOver: false });
  }

  openRawDataModal() {
    this.setState({
      showRawDataModal: true
    });
  }

  onRawDataModalClose() {
    this.setState({
      showRawDataModal: false
    });
  }

  renderRawDataModal() {
    const { showRawDataModal, essence, timekeeper } = this.state;
    if (!showRawDataModal) return null;

    return <RawDataModal
      essence={essence}
      timekeeper={timekeeper}
      onClose={this.onRawDataModalClose.bind(this)}
    />;
  }

  openViewDefinitionModal() {
    this.setState({
      showViewDefinitionModal: true
    });
  }

  onViewDefinitionModalClose() {
    this.setState({
      showViewDefinitionModal: false
    });
  }

  renderViewDefinitionModal() {
    const { showViewDefinitionModal, essence } = this.state;
    if (!showViewDefinitionModal) return null;

    return <ViewDefinitionModal
      onClose={this.onViewDefinitionModalClose.bind(this)}
      essence={essence}
    />;
  }

  triggerFilterMenu(dimension: Dimension) {
    if (!dimension) return;
    (this.refs['filterTile'] as FilterTile).filterMenuRequest(dimension);
  }

  triggerSplitMenu(dimension: Dimension) {
    if (!dimension) return;
    (this.refs['splitTile'] as SplitTile).splitMenuRequest(dimension);
  }

  changeTimezone(newTimezone: Timezone): void {
    const { essence } = this.state;
    const newEssence = essence.changeTimezone(newTimezone);
    this.setState({ essence: newEssence });
  }

  getStoredLayout(): CubeViewLayout {
    return localStorage.get('cube-view-layout') || {dimensionPanelWidth: 240, pinboardWidth: 240};
  }

  storeLayout(layout: CubeViewLayout) {
    localStorage.set('cube-view-layout', layout);
  }

  onDimensionPanelResize(value: number) {
    let { layout } = this.state;
    layout.dimensionPanelWidth = value;

    this.setState({layout});
    this.storeLayout(layout);
  }

  onPinboardPanelResize(value: number) {
    let { layout } = this.state;
    layout.pinboardWidth = value;

    this.setState({layout});
    this.storeLayout(layout);
  }

  onPanelResizeEnd() {
    this.globalResizeListener();
  }

  onAddEssenceToCollection() {
    this.props.addEssenceToCollection(this.state.essence);
  }

  render() {
    const clicker = this.clicker;

    const { getCubeViewHash, onNavClick, user, customization, supervisor, stateful } = this.props;
    const { deviceSize, layout, essence, timekeeper, menuStage, visualizationStage, dragOver, updatingMaxTime } = this.state;

    if (!essence) return null;

    const { visualization } = essence;

    let visElement: JSX.Element = null;
    if (essence.visResolve.isReady() && visualizationStage) {
      const visProps: VisualizationProps = {
        clicker,
        timekeeper,
        essence,
        stage: visualizationStage,
        deviceSize,
        openRawDataModal: this.openRawDataModal.bind(this),
        registerDownloadableDataset: (dataset: Dataset) => {
          this.downloadableDataset = dataset;
        }
      };

      visElement = React.createElement(getVisualizationComponent(visualization), visProps);
    }

    let manualFallback: JSX.Element = null;
    if (essence.visResolve.isManual()) {
      manualFallback = React.createElement(ManualFallback, {
        clicker,
        essence
      });
    }

    let styles = {
      dimensionMeasurePanel: {width: layout.dimensionPanelWidth},
      centerPanel: {left: layout.dimensionPanelWidth, right: layout.pinboardWidth},
      pinboardPanel: {width: layout.pinboardWidth}
    };

    if (deviceSize === 'small') {
      styles = {
        dimensionMeasurePanel: {width: 200},
        centerPanel: {left: 200, right: 200},
        pinboardPanel: {width: 200}
      };
    }

    let headerBar = <CubeHeaderBar
      clicker={clicker}
      essence={essence}
      timekeeper={timekeeper}
      user={user}
      onNavClick={onNavClick}
      getCubeViewHash={getCubeViewHash}
      refreshMaxTime={this.refreshMaxTime.bind(this)}
      openRawDataModal={this.openRawDataModal.bind(this)}
      openViewDefinitionModal={this.openViewDefinitionModal.bind(this)}
      customization={customization}
      getDownloadableDataset={() => this.downloadableDataset}
      changeTimezone={this.changeTimezone.bind(this)}
      timezone={essence.timezone}
      updatingMaxTime={updatingMaxTime}
      addEssenceToCollection={this.onAddEssenceToCollection.bind(this)}
      stateful={stateful}
    />;

    if (supervisor) {
      headerBar = <SupervisedCubeHeaderBar
        essence={essence}
        customization={customization}
        changeTimezone={this.changeTimezone.bind(this)}
        timezone={essence.timezone}
        supervisor={supervisor}
      />;
    }

    return <div className='cube-view'>
      <GlobalEventListener
        resize={this.globalResizeListener.bind(this)}
      />
      {headerBar}
      <div className="container" ref='container'>
        <DimensionMeasurePanel
          style={styles.dimensionMeasurePanel}
          clicker={clicker}
          essence={essence}
          menuStage={menuStage}
          triggerFilterMenu={this.triggerFilterMenu.bind(this)}
          triggerSplitMenu={this.triggerSplitMenu.bind(this)}
          getCubeViewHash={getCubeViewHash}
        />

        {deviceSize !== 'small' ? <ResizeHandle
          side="left"
          initialValue={layout.dimensionPanelWidth}
          onResize={this.onDimensionPanelResize.bind(this)}
          onResizeEnd={this.onPanelResizeEnd.bind(this)}
          min={MIN_PANEL_WIDTH}
          max={MAX_PANEL_WIDTH}
        /> : null}

        <div className='center-panel' style={styles.centerPanel}>
          <div className='center-top-bar'>
            <div className='filter-split-section'>
              <FilterTile
                ref="filterTile"
                clicker={clicker}
                essence={essence}
                timekeeper={timekeeper}
                menuStage={visualizationStage}
                getCubeViewHash={getCubeViewHash}
              />
              <SplitTile
                ref="splitTile"
                clicker={clicker}
                essence={essence}
                menuStage={visualizationStage}
                getCubeViewHash={getCubeViewHash}
              />
            </div>
            <VisSelector clicker={clicker} essence={essence}/>
          </div>
          <div
            className='center-main'
            onDragEnter={this.dragEnter.bind(this)}
          >
            <div className='visualization' ref='visualization'>{visElement}</div>
            {manualFallback}
            {dragOver ? <DropIndicator/> : null}
            {dragOver ? <div
              className="drag-mask"
              onDragOver={this.dragOver.bind(this)}
              onDragLeave={this.dragLeave.bind(this)}
              onDragExit={this.dragLeave.bind(this)}
              onDrop={this.drop.bind(this)}
            /> : null}
          </div>
        </div>

        {deviceSize !== 'small' ? <ResizeHandle
          side="right"
          initialValue={layout.pinboardWidth}
          onResize={this.onPinboardPanelResize.bind(this)}
          onResizeEnd={this.onPanelResizeEnd.bind(this)}
          min={MIN_PANEL_WIDTH}
          max={MAX_PANEL_WIDTH}
        /> : null}

        <PinboardPanel
          style={styles.pinboardPanel}
          clicker={clicker}
          essence={essence}
          timekeeper={timekeeper}
          getCubeViewHash={getCubeViewHash}
        />
      </div>
      {this.renderRawDataModal()}
      {this.renderViewDefinitionModal()}
    </div>;
  }
}
