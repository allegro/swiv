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
import memoizeOne from "memoize-one";
import { Dataset, TabulatorOptions } from "plywood";
import * as React from "react";
import { CSSTransition } from "react-transition-group";
import { AppSettings } from "../../../common/models/app-settings/app-settings";
import { Clicker } from "../../../common/models/clicker/clicker";
import { Customization } from "../../../common/models/customization/customization";
import { DataCube } from "../../../common/models/data-cube/data-cube";
import { Device, DeviceSize } from "../../../common/models/device/device";
import { Dimension } from "../../../common/models/dimension/dimension";
import { Essence, VisStrategy } from "../../../common/models/essence/essence";
import { Filter } from "../../../common/models/filter/filter";
import { SeriesList } from "../../../common/models/series-list/series-list";
import { Series } from "../../../common/models/series/series";
import { Split } from "../../../common/models/split/split";
import { Splits } from "../../../common/models/splits/splits";
import { Stage } from "../../../common/models/stage/stage";
import { TimeShift } from "../../../common/models/time-shift/time-shift";
import { Timekeeper } from "../../../common/models/timekeeper/timekeeper";
import { VisualizationManifest } from "../../../common/models/visualization-manifest/visualization-manifest";
import { VisualizationProps } from "../../../common/models/visualization-props/visualization-props";
import { VisualizationSettings } from "../../../common/models/visualization-settings/visualization-settings";
import { Binary, Unary } from "../../../common/utils/functional/functional";
import { Nullary } from "../../../common/utils/functional/functional";
import { Fn } from "../../../common/utils/general/general";
import { datesEqual } from "../../../common/utils/time/time";
import { DimensionMeasurePanel } from "../../components/dimension-measure-panel/dimension-measure-panel";
import { DropIndicator } from "../../components/drop-indicator/drop-indicator";
import { FilterTile } from "../../components/filter-tile/filter-tile";
import { GlobalEventListener } from "../../components/global-event-listener/global-event-listener";
import { ManualFallback } from "../../components/manual-fallback/manual-fallback";
import { PinboardPanel } from "../../components/pinboard-panel/pinboard-panel";
import { Direction, DragHandle, ResizeHandle } from "../../components/resize-handle/resize-handle";
import { SeriesTilesRow } from "../../components/series-tile/series-tiles-row";
import { SideDrawer } from "../../components/side-drawer/side-drawer";
import { SplitTilesRow } from "../../components/split-tile/split-tiles-row";
import { SvgIcon } from "../../components/svg-icon/svg-icon";
import { VisSelector } from "../../components/vis-selector/vis-selector";
import { DruidQueryModal } from "../../modals/druid-query-modal/druid-query-modal";
import { RawDataModal } from "../../modals/raw-data-modal/raw-data-modal";
import { UrlShortenerModal } from "../../modals/url-shortener-modal/url-shortener-modal";
import { ViewDefinitionModal } from "../../modals/view-definition-modal/view-definition-modal";
import { DragManager } from "../../utils/drag-manager/drag-manager";
import * as localStorage from "../../utils/local-storage/local-storage";
import tabularOptions from "../../utils/tabular-options/tabular-options";
import { getVisualizationComponent } from "../../visualizations";
import { CubeContext, CubeContextValue } from "./cube-context";
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
  changeDataCubeAndEssence: Binary<DataCube, Essence | null, void>;
  changeEssence: Binary<Essence, boolean, void>;
  urlForEssence: Unary<Essence, string>;
  getEssenceFromHash: Binary<string, DataCube, Essence>;
  dataCube: DataCube;
  openAboutModal: Fn;
  customization?: Customization;
  appSettings: AppSettings;
}

export interface CubeViewState {
  essence?: Essence;
  timekeeper?: Timekeeper;
  visualizationStage?: Stage;
  menuStage?: Stage;
  dragOver?: boolean;
  showSideBar?: boolean;
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
  private getDownloadableDataset: Nullary<DataSetWithTabOptions>;
  private visualization = React.createRef<HTMLDivElement>();
  private container = React.createRef<HTMLDivElement>();
  private filterTile = React.createRef<FilterTile>();
  private seriesTile = React.createRef<SeriesTilesRow>();
  private splitTile = React.createRef<SplitTilesRow>();

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
      changeFilter: (filter: Filter) => {
        this.setState(state => {
          let { essence } = state;
          essence = essence.changeFilter(filter);
          return { ...state, essence };
        });
      },
      changeComparisonShift: (timeShift: TimeShift) => {
        this.setState(state =>
          ({ ...state, essence: state.essence.changeComparisonShift(timeShift) }));
      },
      changeSplits: (splits: Splits, strategy: VisStrategy) => {
        const { essence } = this.state;
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
      changeVisualization: (visualization: VisualizationManifest, settings: VisualizationSettings) => {
        const { essence } = this.state;
        this.setState({ essence: essence.changeVisualization(visualization, settings) });
      },
      pin: (dimension: Dimension) => {
        const { essence } = this.state;
        this.setState({ essence: essence.pin(dimension) });
      },
      unpin: (dimension: Dimension) => {
        const { essence } = this.state;
        this.setState({ essence: essence.unpin(dimension) });
      },
      changePinnedSortSeries: (series: Series) => {
        const { essence } = this.state;
        this.setState({ essence: essence.changePinnedSortSeries(series) });
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
  };

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
    this.mounted = true;
    DragManager.init();
    this.globalResizeListener();
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
    const { changeEssence } = this.props;
    const { essence } = this.state;
    if (!nextState.essence.equals(essence)) {
      changeEssence(nextState.essence, false);
    }
  }

  componentDidUpdate(prevProps: CubeViewProps, { layout: { pinboard: prevPinboard, factPanel: prevFactPanel } }: CubeViewState) {
    const { layout: { pinboard, factPanel } } = this.state;
    if (pinboard.hidden !== prevPinboard.hidden || factPanel.hidden !== prevFactPanel.hidden) {
      this.globalResizeListener();
    }
  }

  componentWillUnmount() {
    this.mounted = false;
  }

  updateEssenceFromHashOrDataCube(hash: string, dataCube: DataCube) {
    let essence: Essence;
    try {
      essence = this.getEssenceFromHash(hash, dataCube);
    } catch (e) {
      const { changeEssence } = this.props;
      essence = this.getEssenceFromDataCube(dataCube);
      changeEssence(essence, true);
    }
    this.setState({ essence });
  }

  getEssenceFromDataCube(dataCube: DataCube): Essence {
    return Essence.fromDataCube(dataCube);
  }

  getEssenceFromHash(hash: string, dataCube: DataCube): Essence {
    if (!dataCube) {
      throw new Error("Data cube is required.");
    }

    if (!hash) {
      throw new Error("Hash is required.");
    }

    const { getEssenceFromHash } = this.props;
    return getEssenceFromHash(hash, dataCube);
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
  };

  private isSmallDevice(): boolean {
    return this.state.deviceSize === DeviceSize.SMALL;
  }

  dragEnter = (e: React.DragEvent<HTMLElement>) => {
    if (!CubeView.canDrop()) return;
    e.preventDefault();
    this.setState({ dragOver: true });
  };

  dragOver = (e: React.DragEvent<HTMLElement>) => {
    if (!CubeView.canDrop()) return;
    e.preventDefault();
  };

  dragLeave = () => {
    this.setState({ dragOver: false });
  };

  drop = (e: React.DragEvent<HTMLElement>) => {
    if (!CubeView.canDrop()) return;
    e.preventDefault();
    const dimension = DragManager.draggingDimension();
    if (dimension) {
      this.clicker.changeSplit(Split.fromDimension(dimension), VisStrategy.FairGame);
    }
    this.setState({ dragOver: false });
  };

  openRawDataModal = () => {
    this.setState({
      showRawDataModal: true
    });
  };

  onRawDataModalClose = () => {
    this.setState({
      showRawDataModal: false
    });
  };

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
  };

  onViewDefinitionModalClose = () => {
    this.setState({
      showViewDefinitionModal: false
    });
  };

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
  };

  closeDruidQueryModal = () => {
    this.setState({
      showDruidQueryModal: false
    });
  };

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
  };

  closeUrlShortenerModal = () => {
    this.setState({
      urlShortenerModalProps: null
    });
  };

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
  };

  appendDirtySeries = (series: Series) => {
    if (!series) return;
    this.seriesTile.current.appendDirtySeries(series);
  };

  changeTimezone = (newTimezone: Timezone) => {
    const { essence } = this.state;
    const newEssence = essence.changeTimezone(newTimezone);
    this.setState({ essence: newEssence });
  };

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
  };

  togglePinboard = () => {
    const { layout: { pinboard }, layout } = this.state;
    this.updateLayout({
      ...layout,
      pinboard: {
        ...pinboard,
        hidden: !pinboard.hidden
      }
    });
  };

  onFactPanelResize = (width: number) => {
    const { layout: { factPanel }, layout } = this.state;
    this.updateLayout({
      ...layout,
      factPanel: {
        ...factPanel,
        width
      }
    });
  };

  onPinboardPanelResize = (width: number) => {
    const { layout: { pinboard }, layout } = this.state;
    this.updateLayout({
      ...layout,
      pinboard: {
        ...pinboard,
        width
      }
    });
  };

  onPanelResizeEnd = () => {
    this.globalResizeListener();
  };

  private getCubeContext(): CubeContextValue {
    const { essence } = this.state;
    /*
     React determine context value change using value reference.
     Because we're creating new object, reference would be different despite same values inside,
     hence memoization. More info: https://reactjs.org/docs/context.html#caveats
    */
    return this.constructContext(essence, this.clicker);
  }

  private constructContext = memoizeOne(
    (essence: Essence, clicker: Clicker) =>
      ({ essence, clicker }),
    ([nextEssence, nextClicker]: [Essence, Clicker], [prevEssence, prevClicker]: [Essence, Clicker]) =>
      nextEssence.equals(prevEssence) && nextClicker === prevClicker);

  render() {
    const clicker = this.clicker;

    const { urlForEssence, customization } = this.props;
    const { layout, essence, timekeeper, menuStage, visualizationStage, dragOver, updatingMaxTime, lastRefreshRequestTimestamp } = this.state;

    if (!essence) return null;

    const styles = this.calculateStyles();

    const headerBar = <CubeHeaderBar
      clicker={clicker}
      essence={essence}
      timekeeper={timekeeper}
      onNavClick={this.sideDrawerOpen}
      urlForEssence={urlForEssence}
      refreshMaxTime={this.refreshMaxTime}
      openRawDataModal={this.openRawDataModal}
      openViewDefinitionModal={this.openViewDefinitionModal}
      openUrlShortenerModal={this.openUrlShortenerModal}
      openDruidQueryModal={this.openDruidQueryModal}
      customization={customization}
      getDownloadableDataset={this.getDownloadableDataset}
      changeTimezone={this.changeTimezone}
      updatingMaxTime={updatingMaxTime}
    />;

    return <CubeContext.Provider value={this.getCubeContext()}>
      <div className="cube-view">
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
                />
                <SplitTilesRow
                  ref={this.splitTile}
                  clicker={clicker}
                  essence={essence}
                  menuStage={visualizationStage}
                />
                <SeriesTilesRow ref={this.seriesTile} menuStage={visualizationStage} />
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
            refreshRequestTimestamp={lastRefreshRequestTimestamp} />}
        </div>
        {this.renderDruidQueryModal()}
        {this.renderRawDataModal()}
        {this.renderViewDefinitionModal()}
        {this.renderUrlShortenerModal()}
      </div>
      {this.renderSideDrawer()}
    </CubeContext.Provider>;
  }

  sideDrawerOpen = () => {
    this.setState({ showSideBar: true });
  };

  sideDrawerClose = () => {
    this.setState({ showSideBar: false });
  };

  renderSideDrawer() {
    const { changeDataCubeAndEssence, openAboutModal, appSettings } = this.props;
    const { showSideBar, essence } = this.state;
    const { dataCubes, customization } = appSettings;
    const transitionTimeout = { enter: 500, exit: 300 };
    return <CSSTransition
      in={showSideBar}
      classNames="side-drawer"
      mountOnEnter={true}
      unmountOnExit={true}
      timeout={transitionTimeout}
    >
      <SideDrawer
        key="drawer"
        essence={essence}
        dataCubes={dataCubes}
        onOpenAbout={openAboutModal}
        onClose={this.sideDrawerClose}
        customization={customization}
        changeDataCubeAndEssence={changeDataCubeAndEssence}
      />
    </CSSTransition>;
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
    return <ManualFallback clicker={this.clicker} essence={essence} />;
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
        this.getDownloadableDataset = () => ({ dataset, options: tabularOptions(essence) });
      }
    };

    return React.createElement(getVisualizationComponent(essence.visualization), visProps);
  }
}
