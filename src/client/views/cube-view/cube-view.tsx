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

import { Timezone } from "chronoshift";
import { Dataset, TabulatorOptions } from "plywood";
import * as React from "react";
import * as ReactDOM from "react-dom";
import { MANIFESTS } from "../../../common/manifests";
import { Clicker } from "../../../common/models/clicker/clicker";
import { Colors } from "../../../common/models/colors/colors";
import { Customization } from "../../../common/models/customization/customization";
import { DataCube } from "../../../common/models/data-cube/data-cube";
import { Device, DeviceSize } from "../../../common/models/device/device";
import { Dimension } from "../../../common/models/dimension/dimension";
import { Essence, VisStrategy } from "../../../common/models/essence/essence";
import { Filter } from "../../../common/models/filter/filter";
import { Highlight } from "../../../common/models/highlight/highlight";
import { Manifest } from "../../../common/models/manifest/manifest";
import { Measure } from "../../../common/models/measure/measure";
import { SeriesList } from "../../../common/models/series-list/series-list";
import { Series } from "../../../common/models/series/series";
import { Split } from "../../../common/models/split/split";
import { Splits } from "../../../common/models/splits/splits";
import { Stage } from "../../../common/models/stage/stage";
import { TimeShift } from "../../../common/models/time-shift/time-shift";
import { Timekeeper } from "../../../common/models/timekeeper/timekeeper";
import { ViewSupervisor } from "../../../common/models/view-supervisor/view-supervisor";
import { VisualizationProps } from "../../../common/models/visualization-props/visualization-props";
import { Fn } from "../../../common/utils/general/general";
import { datesEqual } from "../../../common/utils/time/time";
import { DimensionMeasurePanel } from "../../components/dimension-measure-panel/dimension-measure-panel";
import { DropIndicator } from "../../components/drop-indicator/drop-indicator";
import { FilterTile } from "../../components/filter-tile/filter-tile";
import { GlobalEventListener } from "../../components/global-event-listener/global-event-listener";
import { ManualFallback } from "../../components/manual-fallback/manual-fallback";
import { PinboardPanel } from "../../components/pinboard-panel/pinboard-panel";
import { Direction, DragHandle, ResizeHandle } from "../../components/resize-handle/resize-handle";
import { SeriesTile } from "../../components/series-tile/series-tile";
import { SeriesTilesRow } from "../../components/series-tile/series-tiles-row";
import { SplitTile } from "../../components/split-tile/split-tile";
import { SvgIcon } from "../../components/svg-icon/svg-icon";
import { VisSelector } from "../../components/vis-selector/vis-selector";
import { DruidQueryModal } from "../../modals/druid-query-modal/druid-query-modal";
import { RawDataModal } from "../../modals/raw-data-modal/raw-data-modal";
import { UrlShortenerModal } from "../../modals/url-shortener-modal/url-shortener-modal";
import { ViewDefinitionModal } from "../../modals/view-definition-modal/view-definition-modal";
import { DragManager } from "../../utils/drag-manager/drag-manager";
import { FunctionSlot } from "../../utils/function-slot/function-slot";
import * as localStorage from "../../utils/local-storage/local-storage";
import tabularOptions from "../../utils/tabular-options/tabular-options";
import { getVisualizationComponent } from "../../visualizations";
import { CubeHeaderBar } from "./cube-header-bar/cube-header-bar";
import "./cube-view.scss";

const ToggleArrow: React.SFC<{ right: boolean }> = ({ right }) =>
  right
    ? <SvgIcon svg={require("../../icons/full-caret-small-right.svg")} />
    : <SvgIcon svg={require("../../icons/full-caret-small-left.svg")} />;

export interface CubeViewLayout {
  factPanel: {
    width: number;
    hidden?: boolean;
  };
  pinboard: {
    width: number;
    hidden?: boolean;
  };
}

const defaultLayout: CubeViewLayout = {
  factPanel: { width: 240 },
  pinboard: { width: 240 }
};

export interface CubeViewProps {
  initTimekeeper?: Timekeeper;
  maxFilters?: number;
  hash: string;
  updateViewHash: (newHash: string, force?: boolean) => void;
  getCubeViewHash?: (essence: Essence, withPrefix?: boolean) => string;
  getEssenceFromHash: (hash: string, dateCube: DataCube, visualizations: Manifest[]) => Essence;
  dataCube: DataCube;
  onNavClick?: Fn;
  customization?: Customization;
  transitionFnSlot?: FunctionSlot<string>;
  supervisor?: ViewSupervisor;
}

export interface CubeViewState {
  essence?: Essence;
  timekeeper?: Timekeeper;
  visualizationStage?: Stage;
  menuStage?: Stage;
  dragOver?: boolean;
  showRawDataModal?: boolean;
  showViewDefinitionModal?: boolean;
  showDruidQueryModal?: boolean;
  urlShortenerModalProps?: { url: string, title: string };
  layout?: CubeViewLayout;
  deviceSize?: DeviceSize;
  updatingMaxTime?: boolean;
  lastRefreshRequestTimestamp: number;
}

const MIN_PANEL_WIDTH = 240;
const MAX_PANEL_WIDTH = 400;

export interface DataSetWithTabOptions {
  dataset: Dataset;
  options?: TabulatorOptions;
}

export class CubeView extends React.Component<CubeViewProps, CubeViewState> {
  static defaultProps: Partial<CubeViewProps> = { maxFilters: 20 };

  private static canDrop(): boolean {
    return DragManager.draggingDimension() !== null;
  }

  public mounted: boolean;
  private readonly clicker: Clicker;
  private downloadableDataset: DataSetWithTabOptions;
  private visualization = React.createRef<HTMLDivElement>();
  private container = React.createRef<HTMLDivElement>();
  private filterTile = React.createRef<FilterTile>();
  private seriesTile = React.createRef<SeriesTilesRow>();
  private splitTile = React.createRef<SplitTile>();

    constructor(props: CubeViewProps) {
    super(props);

    this.state = {
      essence: null,
      dragOver: false,
      layout: this.getStoredLayout(),
      lastRefreshRequestTimestamp: 0,
      updatingMaxTime: false
    };

    this.clicker = {
      changeFilter: (filter: Filter, colors?: Colors) => {
        this.setState(state => {
          let { essence } = state;
          essence = essence.changeFilter(filter);
          if (colors) essence = essence.changeColors(colors);
          return { ...state, essence };
        });
      },
      changeComparisonShift: (timeShift: TimeShift) => {
        this.setState(state =>
          ({ ...state, essence: state.essence.changeComparisonShift(timeShift) }));
      },
      changeSplits: (splits: Splits, strategy: VisStrategy, colors?: Colors) => {
        let { essence } = this.state;
        if (colors) essence = essence.changeColors(colors);
        this.setState({ essence: essence.changeSplits(splits, strategy) });
      },
      changeSplit: (split: Split, strategy: VisStrategy) => {
        const { essence } = this.state;
        this.setState({ essence: essence.changeSplit(split, strategy) });
      },
      addSplit: (split: Split, strategy: VisStrategy) => {
        const { essence } = this.state;
        this.setState({ essence: essence.addSplit(split, strategy) });
      },
      removeSplit: (split: Split, strategy: VisStrategy) => {
        const { essence } = this.state;
        this.setState({ essence: essence.removeSplit(split, strategy) });
      },
      changeSeriesList: (seriesList: SeriesList) => {
        const { essence } = this.state;
        this.setState({ essence: essence.changeSeriesList(seriesList) });
      },
      addSeries: (series: Series) => {
        const { essence } = this.state;
        this.setState({ essence: essence.addSeries(series) });
      },
      removeSeries: (series: Series) => {
        const { essence } = this.state;
        this.setState({ essence: essence.removeSeries(series) });
      },
      changeColors: (colors: Colors) => {
        const { essence } = this.state;
        this.setState({ essence: essence.changeColors(colors) });
      },
      changeVisualization: (visualization: Manifest) => {
        const { essence } = this.state;
        this.setState({ essence: essence.changeVisualization(visualization) });
      },
      pin: (dimension: Dimension) => {
        const { essence } = this.state;
        this.setState({ essence: essence.pin(dimension) });
      },
      unpin: (dimension: Dimension) => {
        const { essence } = this.state;
        this.setState({ essence: essence.unpin(dimension) });
      },
      changePinnedSortMeasure: (measure: Measure) => {
        const { essence } = this.state;
        this.setState({ essence: essence.changePinnedSortMeasure(measure) });
      },
      changeHighlight: (measure: string, delta: Filter) => {
        const { essence } = this.state;
        this.setState({ essence: essence.changeHighlight(new Highlight({ measure, delta })) });
      },
      acceptHighlight: () => {
        const { essence } = this.state;
        this.setState({ essence: essence.acceptHighlight() });
      },
      dropHighlight: () => {
        const { essence } = this.state;
        this.setState({ essence: essence.dropHighlight() });
      }
    };
  }

  refreshMaxTime = () => {
    const { essence, timekeeper } = this.state;
    const { dataCube } = essence;
    this.setState({ updatingMaxTime: true });

    DataCube.queryMaxTime(dataCube)
      .then(maxTime => {
        if (!this.mounted) return;
        const timeName = dataCube.name;
        const isBatchCube = !dataCube.refreshRule.isRealtime();
        const isCubeUpToDate = datesEqual(maxTime, timekeeper.getTime(timeName));
        if (isBatchCube && isCubeUpToDate) {
          this.setState({ updatingMaxTime: false });
          return;
        }
        this.setState({
          timekeeper: timekeeper.updateTime(timeName, maxTime),
          updatingMaxTime: false,
          lastRefreshRequestTimestamp: (new Date()).getTime()
        });
      });
  }

  componentWillMount() {
    const { hash, dataCube, initTimekeeper } = this.props;
    if (!dataCube) {
      throw new Error("Data cube is required.");
    }

    this.setState({
      timekeeper: initTimekeeper || Timekeeper.EMPTY
    });
    this.updateEssenceFromHashOrDataCube(hash, dataCube);
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
    const { hash, dataCube } = this.props;
    if (!nextProps.dataCube) {
      throw new Error("Data cube is required.");
    }

    if (dataCube.name !== nextProps.dataCube.name || hash !== nextProps.hash) {
      this.updateEssenceFromHashOrDataCube(nextProps.hash, nextProps.dataCube);
    }
  }

  componentWillUpdate(nextProps: CubeViewProps, nextState: CubeViewState): void {
    const { updateViewHash, getCubeViewHash } = this.props;
    const { essence } = this.state;
    if (updateViewHash && !nextState.essence.equals(essence)) {
      updateViewHash(getCubeViewHash(nextState.essence));
    }
  }

  componentDidUpdate(prevProps: CubeViewProps, { layout: { pinboard: prevPinboard, factPanel: prevFactPanel } }: CubeViewState) {
    const { layout: { pinboard, factPanel } } = this.state;
    if (pinboard.hidden !== prevPinboard.hidden || factPanel.hidden !== prevFactPanel.hidden) {
      this.globalResizeListener();
    }
  }

  componentWillUnmount() {
    const { transitionFnSlot } = this.props;

    this.mounted = false;
    if (transitionFnSlot) transitionFnSlot.clear();
  }

  updateEssenceFromHashOrDataCube(hash: string, dataCube: DataCube) {
    let essence: Essence;
    try {
      essence = this.getEssenceFromHash(hash, dataCube);
    } catch (e) {
      const { getCubeViewHash, updateViewHash } = this.props;
      essence = this.getEssenceFromDataCube(dataCube);
      updateViewHash(getCubeViewHash(essence), true);
    }
    this.setState({ essence });
  }

  getEssenceFromDataCube(dataCube: DataCube): Essence {
    return Essence.fromDataCube(dataCube, MANIFESTS);
  }

  getEssenceFromHash(hash: string, dataCube: DataCube): Essence {
    if (!dataCube) {
      throw new Error("Data cube is required.");
    }

    if (!hash) {
      throw new Error("Hash is required.");
    }

    const { getEssenceFromHash } = this.props;
    return getEssenceFromHash(hash, dataCube, MANIFESTS);
  }

  globalResizeListener = () => {
    const containerDOM = this.container.current;
    const visualizationDOM = this.visualization.current;
    if (!containerDOM || !visualizationDOM) return;

    this.setState({
      deviceSize: Device.getSize(),
      menuStage: Stage.fromClientRect(containerDOM.getBoundingClientRect()),
      visualizationStage: Stage.fromClientRect(visualizationDOM.getBoundingClientRect())
    });
  }

  private isSmallDevice(): boolean {
    return this.state.deviceSize === DeviceSize.SMALL;
  }

  dragEnter = (e: React.DragEvent<HTMLElement>) => {
    if (!CubeView.canDrop()) return;
    e.preventDefault();
    this.setState({ dragOver: true });
  }

  dragOver = (e: React.DragEvent<HTMLElement>) => {
    if (!CubeView.canDrop()) return;
    e.preventDefault();
  }

  dragLeave = () => {
    this.setState({ dragOver: false });
  }

  drop = (e: React.DragEvent<HTMLElement>) => {
    if (!CubeView.canDrop()) return;
    e.preventDefault();
    const dimension = DragManager.draggingDimension();
    if (dimension) {
      this.clicker.changeSplit(Split.fromDimension(dimension), VisStrategy.FairGame);
    }
    this.setState({ dragOver: false });
  }

  openRawDataModal = () => {
    this.setState({
      showRawDataModal: true
    });
  }

  onRawDataModalClose = () => {
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
      onClose={this.onRawDataModalClose}
    />;
  }

  openViewDefinitionModal = () => {
    this.setState({
      showViewDefinitionModal: true
    });
  }

  onViewDefinitionModalClose = () => {
    this.setState({
      showViewDefinitionModal: false
    });
  }

  renderViewDefinitionModal() {
    const { showViewDefinitionModal, essence } = this.state;
    if (!showViewDefinitionModal) return null;

    return <ViewDefinitionModal
      onClose={this.onViewDefinitionModalClose}
      essence={essence}
    />;
  }

  openDruidQueryModal = () => {
    this.setState({
      showDruidQueryModal: true
    });
  }

  closeDruidQueryModal = () => {
    this.setState({
      showDruidQueryModal: false
    });
  }

  renderDruidQueryModal() {
    const { showDruidQueryModal, essence, timekeeper } = this.state;
    if (!showDruidQueryModal) return null;
    return <DruidQueryModal
      timekeeper={timekeeper}
      essence={essence}
      onClose={this.closeDruidQueryModal} />;
  }

  openUrlShortenerModal = (url: string, title: string) => {
    this.setState({
      urlShortenerModalProps: { url, title }
    });
  }

  closeUrlShortenerModal = () => {
    this.setState({
      urlShortenerModalProps: null
    });
  }

  renderUrlShortenerModal() {
    const { urlShortenerModalProps } = this.state;
    if (!urlShortenerModalProps) return null;
    return <UrlShortenerModal
      title={urlShortenerModalProps.title}
      url={urlShortenerModalProps.url}
      onClose={this.closeUrlShortenerModal} />;
  }

  triggerFilterMenu = (dimension: Dimension) => {
    if (!dimension) return;
    this.filterTile.current.filterMenuRequest(dimension);
  }

  appendDirtySeries = (series: Series) => {
    if (!series) return;
    this.seriesTile.current.appendDirtySeries(series);
  }

  changeTimezone = (newTimezone: Timezone) => {
    const { essence } = this.state;
    const newEssence = essence.changeTimezone(newTimezone);
    this.setState({ essence: newEssence });
  }

  getStoredLayout(): CubeViewLayout {
    return localStorage.get("cube-view-layout-v2") || defaultLayout;
  }

  storeLayout(layout: CubeViewLayout) {
    localStorage.set("cube-view-layout-v2", layout);
  }

  private updateLayout(layout: CubeViewLayout) {
    this.setState({ layout });
    this.storeLayout(layout);
  }

  toggleFactPanel = () => {
    const { layout: { factPanel }, layout } = this.state;
    this.updateLayout({
      ...layout,
      factPanel: {
        ...factPanel,
        hidden: !factPanel.hidden
      }
    });
  }

  togglePinboard = () => {
    const { layout: { pinboard }, layout } = this.state;
    this.updateLayout({
      ...layout,
      pinboard: {
        ...pinboard,
        hidden: !pinboard.hidden
      }
    });
  }

  onFactPanelResize = (width: number) => {
    const { layout: { factPanel }, layout } = this.state;
    this.updateLayout({
      ...layout,
      factPanel: {
        ...factPanel,
        width
      }
    });
  }

  onPinboardPanelResize = (width: number) => {
    const { layout: { pinboard }, layout } = this.state;
    this.updateLayout({
      ...layout,
      pinboard: {
        ...pinboard,
        width
      }
    });
  }

  onPanelResizeEnd = () => {
    this.globalResizeListener();
  }

  render() {
    const clicker = this.clicker;

    const { getCubeViewHash, onNavClick, customization } = this.props;
    const { layout, essence, timekeeper, menuStage, visualizationStage, dragOver, updatingMaxTime } = this.state;

    if (!essence) return null;

    const styles = this.calculateStyles();

    const headerBar = <CubeHeaderBar
      clicker={clicker}
      essence={essence}
      timekeeper={timekeeper}
      onNavClick={onNavClick}
      getCubeViewHash={getCubeViewHash}
      refreshMaxTime={this.refreshMaxTime}
      openRawDataModal={this.openRawDataModal}
      openViewDefinitionModal={this.openViewDefinitionModal}
      openUrlShortenerModal={this.openUrlShortenerModal}
      openDruidQueryModal={this.openDruidQueryModal}
      customization={customization}
      getDownloadableDataset={() => this.downloadableDataset}
      changeTimezone={this.changeTimezone}
      updatingMaxTime={updatingMaxTime}
    />;

    return <div className="cube-view">
      <GlobalEventListener resize={this.globalResizeListener} />
      {headerBar}
      <div className="container" ref={this.container}>
        {!layout.factPanel.hidden && <DimensionMeasurePanel
          style={styles.dimensionMeasurePanel}
          clicker={clicker}
          essence={essence}
          menuStage={menuStage}
          triggerFilterMenu={this.triggerFilterMenu}
          appendDirtySeries={this.appendDirtySeries}
        />}
        {!this.isSmallDevice() && !layout.factPanel.hidden && <ResizeHandle
          direction={Direction.LEFT}
          value={layout.factPanel.width}
          onResize={this.onFactPanelResize}
          onResizeEnd={this.onPanelResizeEnd}
          min={MIN_PANEL_WIDTH}
          max={MAX_PANEL_WIDTH}
        >
          <DragHandle />
        </ResizeHandle>}

        <div className="center-panel" style={styles.centerPanel}>
          <div className="center-top-bar">
            <div className="dimension-panel-toggle"
                 onClick={this.toggleFactPanel}>
              <ToggleArrow right={layout.factPanel.hidden} />
            </div>
            <div className="filter-split-section">
              <FilterTile
                ref={this.filterTile}
                clicker={clicker}
                essence={essence}
                timekeeper={timekeeper}
                menuStage={visualizationStage}
                refreshMaxTime={this.refreshMaxTime}
              />
              <SplitTile
                ref={this.splitTile}
                clicker={clicker}
                essence={essence}
                menuStage={visualizationStage}
              />
              <SeriesTilesRow
                ref={this.seriesTile}
                clicker={clicker}
                essence={essence}
                menuStage={visualizationStage}
              />
            </div>
            <VisSelector clicker={clicker} essence={essence} />
            <div className="pinboard-toggle"
                 onClick={this.togglePinboard}>
              <ToggleArrow right={!layout.pinboard.hidden} />
            </div>
          </div>
          <div
            className="center-main"
            onDragEnter={this.dragEnter}
          >
            <div className="visualization" ref={this.visualization}>{this.visElement()}</div>
            {this.manualFallback()}
            {dragOver ? <DropIndicator /> : null}
            {dragOver ? <div
              className="drag-mask"
              onDragOver={this.dragOver}
              onDragLeave={this.dragLeave}
              onDragExit={this.dragLeave}
              onDrop={this.drop}
            /> : null}
          </div>
        </div>

        {!this.isSmallDevice() && !layout.pinboard.hidden && <ResizeHandle
          direction={Direction.RIGHT}
          value={layout.pinboard.width}
          onResize={this.onPinboardPanelResize}
          onResizeEnd={this.onPanelResizeEnd}
          min={MIN_PANEL_WIDTH}
          max={MAX_PANEL_WIDTH}
        >
          <DragHandle />
         </ResizeHandle>}
        {!layout.pinboard.hidden && <PinboardPanel
          style={styles.pinboardPanel}
          clicker={clicker}
          essence={essence}
          timekeeper={timekeeper}
        />}
      </div>
      {this.renderDruidQueryModal()}
      {this.renderRawDataModal()}
      {this.renderViewDefinitionModal()}
      {this.renderUrlShortenerModal()}
    </div>;
  }

  private calculateStyles() {
    const { layout } = this.state;
    const isDimensionPanelHidden = layout.factPanel.hidden;
    const isPinboardHidden = layout.pinboard.hidden;
    if (this.isSmallDevice()) {
      const dimensionsWidth = isDimensionPanelHidden ? 0 : 200;
      const pinboardWidth = isPinboardHidden ? 0 : 200;
      return {
        dimensionMeasurePanel: { width: dimensionsWidth },
        centerPanel: { left: dimensionsWidth, right: pinboardWidth },
        pinboardPanel: { width: pinboardWidth }
      };
    }
    const nonSmallLayoutPadding = 10;
    return {
      dimensionMeasurePanel: {
        width: isDimensionPanelHidden ? 0 : layout.factPanel.width
      },
      centerPanel: {
        left: isDimensionPanelHidden ? nonSmallLayoutPadding : layout.factPanel.width,
        right: isPinboardHidden ? nonSmallLayoutPadding : layout.pinboard.width
      },
      pinboardPanel: {
        width: isPinboardHidden ? 0 : layout.pinboard.width
      }
    };
  }

  private manualFallback() {
    const { essence } = this.state;
    if (!essence.visResolve.isManual()) return null;
    const clicker = this.clicker;
    return React.createElement(ManualFallback, {
      clicker,
      essence
    });
  }

  private visElement() {
    const { essence, visualizationStage: stage, lastRefreshRequestTimestamp } = this.state;
    if (!(essence.visResolve.isReady() && stage)) return null;
    const visProps: VisualizationProps = {
      refreshRequestTimestamp: lastRefreshRequestTimestamp,
      essence,
      clicker: this.clicker,
      timekeeper: this.state.timekeeper,
      stage,
      registerDownloadableDataset: (dataset: Dataset) => {
        this.downloadableDataset = { dataset, options: tabularOptions(essence) };
      }
    };

    return React.createElement(getVisualizationComponent(essence.visualization), visProps);
  }
}
