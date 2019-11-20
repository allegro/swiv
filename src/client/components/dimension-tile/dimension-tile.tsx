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

import { Duration } from "chronoshift";
import { Set } from "immutable";
import { $, Dataset, Datum, Expression, NumberRange, PlywoodValue, r, SortExpression, TimeRange } from "plywood";
import * as React from "react";
import { Clicker } from "../../../common/models/clicker/clicker";
import { Colors } from "../../../common/models/colors/colors";
import { Dimension } from "../../../common/models/dimension/dimension";
import { Essence } from "../../../common/models/essence/essence";
import { isTimeFilter, NumberFilterClause, StringFilterAction, StringFilterClause } from "../../../common/models/filter-clause/filter-clause";
import { clausePredicate } from "../../../common/models/filter-clause/filter-clause-predicate";
import { Filter, FilterMode } from "../../../common/models/filter/filter";
import {
  ContinuousDimensionKind,
  formatGranularity,
  getBestGranularityForRange,
  getDefaultGranularityForKind,
  getGranularities,
  granularityEquals,
  granularityToString
} from "../../../common/models/granularity/granularity";
import { SortOn } from "../../../common/models/sort-on/sort-on";
import { Bucket, bucketToAction } from "../../../common/models/split/split";
import { TimeShiftEnvType } from "../../../common/models/time-shift/time-shift-env";
import { Timekeeper } from "../../../common/models/timekeeper/timekeeper";
import { CANONICAL_LENGTH_ID } from "../../../common/utils/canonical-length/query";
import timeFilterCanonicalLength from "../../../common/utils/canonical-length/time-filter-canonical-length";
import { formatNumberRange } from "../../../common/utils/formatter/formatter";
import { Unary } from "../../../common/utils/functional/functional";
import { collect, Fn } from "../../../common/utils/general/general";
import { formatTimeRange } from "../../../common/utils/time/time";
import { MAX_SEARCH_LENGTH, PIN_ITEM_HEIGHT, PIN_PADDING_BOTTOM, PIN_TITLE_HEIGHT, SEARCH_WAIT, STRINGS } from "../../config/constants";
import { classNames, setDragData, setDragGhost } from "../../utils/dom/dom";
import { DragManager } from "../../utils/drag-manager/drag-manager";
import { Checkbox } from "../checkbox/checkbox";
import { HighlightString } from "../highlight-string/highlight-string";
import { Loader } from "../loader/loader";
import { Message } from "../message/message";
import { QueryError } from "../query-error/query-error";
import { SearchableTile, TileAction } from "../searchable-tile/searchable-tile";
import { SvgIcon } from "../svg-icon/svg-icon";
import { TileHeaderIcon } from "../tile-header/tile-header";
import "./dimension-tile.scss";

export interface DimensionTileProps {
  clicker: Clicker;
  essence: Essence;
  timekeeper: Timekeeper;
  dimension: Dimension;
  sortOn: SortOn;
  colors?: Colors;
  onClose?: any;
}

export interface DimensionTileState {
  loading?: boolean;
  dataset?: Dataset;
  error?: Error;
  notice?: string;
  fetchQueued?: boolean;
  unfolded?: boolean;
  foldable?: boolean;
  showSearch?: boolean;
  searchText?: string;
  selectedGranularity?: Bucket;
  filterMode?: FilterMode;
}

export class DimensionTile extends React.Component<DimensionTileProps, DimensionTileState> {

  private static readonly TOP_N = 100;
  private static readonly FOLDER_BOX_HEIGHT = 30;

  public mounted: boolean;
  public collectTriggerSearch: Fn;

  constructor(props: DimensionTileProps) {
    super(props);
    this.state = {
      loading: false,
      dataset: null,
      error: null,
      fetchQueued: false,
      unfolded: true,
      foldable: false,
      showSearch: false,
      selectedGranularity: null,
      searchText: ""
    };

    this.collectTriggerSearch = collect(SEARCH_WAIT, () => {
      if (!this.mounted) return;
      const { essence, timekeeper, dimension, sortOn } = this.props;
      const { unfolded } = this.state;
      this.fetchData(essence, timekeeper, dimension, sortOn, unfolded);
    });

  }

  private bucketForDimension(dimension: Dimension): Bucket {
    const { essence, timekeeper } = this.props;
    const clause = essence.filter.getClauseForDimension(dimension);
    if (clause) {
      if (isTimeFilter(clause)) {
        const fixedTimeFilter = essence.evaluateSelection(clause, timekeeper);
        return getBestGranularityForRange(fixedTimeFilter.values.first(), true, dimension.bucketedBy, dimension.granularities);
      }
      if (clause instanceof NumberFilterClause) {
        return getBestGranularityForRange(clause.values.first(), true, dimension.bucketedBy, dimension.granularities);
      }
      throw new Error(`Expected Time or Number FilterClause. Got ${clause.type}`);
    }
    return getDefaultGranularityForKind(
        dimension.kind as ContinuousDimensionKind,
        dimension.bucketedBy,
        dimension.granularities);
  }

  fetchData(essence: Essence, timekeeper: Timekeeper, dimension: Dimension, sortOn: SortOn, unfolded: boolean, selectedGranularity?: Bucket): void {
    if (!sortOn) {
      this.setState({
        loading: false,
        dataset: null,
        error: null
      });
      return;
    }
    const { searchText, foldable } = this.state;
    const { dataCube, colors } = essence;

    let filter = essence.getEffectiveFilter(timekeeper);
    // don't remove filter if time
    if (unfolded && dimension !== essence.getTimeDimension()) {
      filter = filter.removeClause(dimension.name);
    }

    filter = filter.setExclusionForDimension(false, dimension);

    let filterExpression = filter.toExpression(dataCube);

    const shouldFoldRows = !unfolded && foldable && colors && colors.dimension === dimension.name && colors.values;

    if (shouldFoldRows) {
      filterExpression = filterExpression.and(dimension.expression.in(colors.toSet()));
    }

    if (searchText) {
      filterExpression = filterExpression.and(dimension.expression.contains(r(searchText), "ignoreCase"));
    }

    let query: any = $("main")
        .filter(filterExpression);

    let sortExpression: Expression = null;

    if (dimension.canBucketByDefault()) {

      if (!selectedGranularity) {
        selectedGranularity = this.bucketForDimension(dimension);
      }

      this.setState({ selectedGranularity });

      query = query.split($(dimension.name).performAction(bucketToAction(selectedGranularity)), dimension.name);
      sortExpression = $(dimension.name);
    } else {
      query = query.split(dimension.expression, dimension.name);
      sortExpression = $(sortOn.key);
    }

    const sortSeries = essence.findConcreteSeries(sortOn.key);
    if (sortSeries) {
      query = query
        .apply(CANONICAL_LENGTH_ID, timeFilterCanonicalLength(essence, timekeeper))
        .performAction(sortSeries.plywoodExpression(0, { type: TimeShiftEnvType.CURRENT }));
    }

    query = query.sort(sortExpression, SortExpression.DESCENDING).limit(DimensionTile.TOP_N + 1);

    this.setState({
      loading: true,
      error: null,
      fetchQueued: false,
      dataset: null
    });
    dataCube.executor(query, { timezone: essence.timezone })
        .then(
            (dataset: Dataset) => {
              if (!this.mounted) return;
              this.setState({
                loading: false,
                dataset,
                error: null
              });
            },
            error => {
              if (!this.mounted) return;
              this.setState({
                loading: false,
                dataset: null,
                error
              });
            }
        );
  }

  updateFoldability(essence: Essence, dimension: Dimension, colors: Colors): boolean {
    let { unfolded } = this.state;
    let foldable = true;
    if (essence.filter.filteredOn(dimension.name)) { // has filter
      if (colors) {
        foldable = false;
        unfolded = false;
      } else if (dimension.kind === "time") {
        foldable = false;
        unfolded = true;
      }
    } else {
      if (!colors) {
        foldable = false;
        unfolded = true;
      }
    }

    this.setState({ foldable, unfolded });
    return unfolded;
  }

  componentWillMount() {
    const { essence, timekeeper, dimension, colors, sortOn } = this.props;
    const unfolded = this.updateFoldability(essence, dimension, colors);
    this.fetchData(essence, timekeeper, dimension, sortOn, unfolded);
  }

  componentWillReceiveProps(nextProps: DimensionTileProps) {
    const { essence, timekeeper, dimension, sortOn } = this.props;
    const { selectedGranularity } = this.state;
    const nextEssence = nextProps.essence;
    const nextTimekeeper = nextProps.timekeeper;
    const nextDimension = nextProps.dimension;
    const nextColors = nextProps.colors;
    const nextSortOn = nextProps.sortOn;
    const unfolded = this.updateFoldability(nextEssence, nextDimension, nextColors);

    // keep granularity selection if measures change or if autoupdate
    const currentSelection = essence.getTimeClause();
    const nextSelection = nextEssence.getTimeClause();
    const differentTimeFilterSelection = currentSelection ? !currentSelection.equals(nextSelection) : Boolean(nextSelection);
    if (differentTimeFilterSelection) {
      // otherwise render will try to format exiting dataset based off of new granularity (before fetchData returns)
      this.setState({ dataset: null });
    }

    const persistedGranularity = differentTimeFilterSelection ? null : selectedGranularity;

    if (
        essence.differentDataCube(nextEssence) ||
        essence.differentEffectiveFilter(nextEssence, timekeeper, nextTimekeeper, unfolded ? dimension : null) ||
        essence.differentColors(nextEssence) ||
        !dimension.equals(nextDimension) ||
        !SortOn.equals(sortOn, nextProps.sortOn) ||
        (!essence.timezone.equals(nextEssence.timezone)) && dimension.kind === "time" ||
        differentTimeFilterSelection
    ) {
      this.fetchData(nextEssence, nextTimekeeper, nextDimension, nextSortOn, unfolded, persistedGranularity);
    }

    this.setFilterModeFromProps(nextProps);
  }

  setFilterModeFromProps(props: DimensionTileProps) {
    if (props.colors) {
      this.setState({ filterMode: FilterMode.INCLUDE });
    } else {
      const filterMode = props.essence.filter.getModeForDimension(props.dimension);
      if (filterMode) this.setState({ filterMode });
    }
  }

  componentDidMount() {
    this.mounted = true;

    this.setFilterModeFromProps(this.props);
  }

  componentWillUnmount() {
    this.mounted = false;
  }

  onRowClick(value: any, event: MouseEvent) {
    const { clicker, essence, dimension } = this.props;
    const { dataset, filterMode } = this.state;

    let { colors } = this.props;
    let { filter } = essence;

    if (colors && colors.dimension === dimension.name) {
      if (colors.limit) {
        if (!dataset) return;
        const values = dataset.data.slice(0, colors.limit).map(d => d[dimension.name]);
        colors = Colors.fromValues(colors.dimension, values);
      }
      colors = colors.toggle(value);
      clicker.changeColors(colors);
    } else {
      filter = this.selectValueInFilter(filter, dimension, value, event);

      // If no longer filtered switch unfolded to true for later
      const { unfolded } = this.state;
      if (!unfolded && !filter.filteredOn(dimension.name)) {
        this.setState({ unfolded: true });
      }

      clicker.changeFilter(filter.setExclusionForDimension(filterMode === FilterMode.EXCLUDE, dimension));
    }
  }

  private selectValueInFilter(filter: Filter, dimension: Dimension, value: any, event: MouseEvent): Filter {
    const filterClause = filter.getClauseForDimension(dimension);
    if (!filterClause) {
      return filter.addClause(new StringFilterClause({ reference: dimension.name, values: Set.of(value), action: StringFilterAction.IN }));
    }
    if (!(filterClause instanceof StringFilterClause)) {
      throw new Error(`Expected StringFilterClause, got: ${filterClause}`);
    }
    if (event.altKey || event.ctrlKey || event.metaKey) {
      const values = filterClause.values;
      const filteredOnMe = values.has(value);
      const singleFilter = values.count() === 1;

      if (filteredOnMe && singleFilter) {
        return filter.removeClause(dimension.name);
      }
      return filter.removeClause(dimension.name).setClause(filterClause.update("values", values => values.add(value)));
    }
    return filter.setClause(filterClause.update("values", values =>
        values.has(value) ? values.remove(value) : values.add(value)));
  }

  changeFilterMode(value: FilterMode) {
    const { clicker, essence, dimension } = this.props;
    this.setState({ filterMode: value }, () => {
      clicker.changeFilter(essence.filter.setExclusionForDimension(value === FilterMode.EXCLUDE, dimension));
    });
  }

  getFilterActions(): TileAction[] {
    const { essence, dimension } = this.props;
    const { filterMode } = this.state;

    if (!essence || !dimension) return null;

    const options: FilterMode[] = [FilterMode.INCLUDE, FilterMode.EXCLUDE];

    return options.map(value => {
      return {
        selected: filterMode === value,
        onSelect: this.changeFilterMode.bind(this, value),
        displayValue: STRINGS[value],
        keyString: value
      };
    });
  }

  toggleFold = () => {
    const { essence, timekeeper, dimension, sortOn } = this.props;
    let { unfolded } = this.state;
    unfolded = !unfolded;
    this.setState({ unfolded });
    this.fetchData(essence, timekeeper, dimension, sortOn, unfolded);
  }

  onDragStart = (e: React.DragEvent<HTMLElement>) => {
    const { dimension } = this.props;

    const dataTransfer = e.dataTransfer;
    dataTransfer.effectAllowed = "all";
    setDragData(dataTransfer, "text/plain", dimension.title);

    DragManager.setDragDimension(dimension);
    setDragGhost(dataTransfer, dimension.title);
  }

  toggleSearch = () => {
    this.setState(({ showSearch }) => ({ showSearch: !showSearch }));
    this.onSearchChange("");
  }

  onSearchChange = (text: string) => {
    const { searchText, dataset, fetchQueued, loading } = this.state;
    const newSearchText = text.substr(0, MAX_SEARCH_LENGTH);

    if (searchText === newSearchText) return; // nothing to do;

    // If the user is just typing in more and there are already < TOP_N results then there is nothing to do
    if (newSearchText.indexOf(searchText) !== -1 && !fetchQueued && !loading && dataset && dataset.data.length < DimensionTile.TOP_N) {
      this.setState({
        searchText: newSearchText
      });
      return;
    }

    this.setState({
      searchText: newSearchText,
      fetchQueued: true
    });
    this.collectTriggerSearch();
  }

  getTitleHeader(): string {
    const { dimension } = this.props;
    const { selectedGranularity } = this.state;

    if (selectedGranularity && dimension.kind === "time") {
      return `${dimension.title} (${(selectedGranularity as Duration).getDescription()})`;
    }
    return dimension.title;
  }

  onSelectGranularity(selectedGranularity: Bucket) {
    if (selectedGranularity === this.state.selectedGranularity) return;
    const { essence, timekeeper, dimension, colors, sortOn } = this.props;
    const unfolded = this.updateFoldability(essence, dimension, colors);
    this.setState({ dataset: null });
    this.fetchData(essence, timekeeper, dimension, sortOn, unfolded, selectedGranularity);
  }

  getGranularityActions(): TileAction[] {
    const { dimension } = this.props;
    const { selectedGranularity } = this.state;
    const granularities = dimension.granularities || getGranularities(dimension.kind as ContinuousDimensionKind, dimension.bucketedBy, true);
    return granularities.map(g => {
      return {
        selected: granularityEquals(selectedGranularity, g),
        onSelect: this.onSelectGranularity.bind(this, g),
        displayValue: formatGranularity(g),
        keyString: granularityToString(g)
      };
    });
  }

  private prepareRowsData(): Datum[] {
    const { essence, dimension } = this.props;
    const { dataset, unfolded, searchText } = this.state;

    const filterClause = essence.filter.getClauseForDimension(dimension);

    if (dataset) {
      let rowData = dataset.data.slice(0, DimensionTile.TOP_N);

      if (!unfolded) {
        if (filterClause) {
          if (!(filterClause instanceof StringFilterClause)) {
            throw new Error(`Expected StringFilterClause, got: ${filterClause}`);
          }
          const predicate = clausePredicate(filterClause);
          rowData = rowData.filter(d => predicate(d[dimension.name] as string));
        }
      }

      if (searchText) {
        const searchTextLower = searchText.toLowerCase();
        rowData = rowData.filter(d => {
          return String(d[dimension.name]).toLowerCase().indexOf(searchTextLower) !== -1;
        });
      }

      return rowData;
    } else {
      return [];
    }
  }

  private prepareColorValues(colors: Colors, dimension: Dimension, rowData: Datum[]): string[] {
    if (colors) {
      return colors.getColors(rowData.map(d => d[dimension.name]));
    } else {
      return null;
    }
  }

  private getFormatter(): Unary<Datum, string> {
    const { sortOn, essence } = this.props;

    const series = sortOn && essence.findConcreteSeries(sortOn.key);
    if (!series) return null;
    return d => series.formatValue(d);
  }

  private prepareRows(rowData: Datum[], continuous: boolean): JSX.Element[] {
    const { essence: { filter }, dimension, colors } = this.props;
    const { searchText, filterMode } = this.state;

    const filterClause = filter.getClauseForDimension(dimension);
    if (filterClause && !(filterClause instanceof StringFilterClause)) {
      throw new Error(`Expected StringFilterClause, got: ${filterClause}`);
    }
    const colorValues = this.prepareColorValues(colors, dimension, rowData);
    const formatter = this.getFormatter();

    const isExcluded = filterMode === FilterMode.EXCLUDE;

    return rowData.map((datum, i) => {
      const segmentValue = datum[dimension.name];

      let className = "row";
      let checkbox: JSX.Element = null;
      let selected = false;
      if ((filterClause || colors) && !continuous) {
        if (colors) {
          selected = false;
          className += " color";
        } else {
          selected = (filterClause as StringFilterClause).values.has(segmentValue as string);
          className += " " + (selected ? "selected" : "not-selected");
        }
        checkbox = <Checkbox
            selected={selected}
            type={isExcluded ? "cross" : "check"}
            color={colorValues ? colorValues[i] : null}
        />;
      }

      const segmentValueStr = this.getSegmentValueString(segmentValue as PlywoodValue);

      return <div
          className={className}
          key={segmentValueStr}
          onClick={this.onRowClick.bind(this, segmentValue)}
      >
        <div className="segment-value" title={segmentValueStr}>
          {checkbox}
          <HighlightString className="label" text={segmentValueStr} highlight={searchText} />
        </div>
        {formatter && <div className="measure-value">{formatter(datum)}</div>}
      </div>;
    });
  }

  private getSegmentValueString(segmentValue: PlywoodValue): string {
    const { essence: { timezone } } = this.props;
    const segmentValueStr = String(segmentValue);

    if (segmentValue instanceof TimeRange) {
      return formatTimeRange(segmentValue, timezone);
    }
    if (segmentValue instanceof NumberRange) {
      return formatNumberRange(segmentValue);
    }
    return segmentValueStr;
  }

  private prepareFoldControl(isFoldable: boolean, unfolded: boolean): JSX.Element {
    if (isFoldable) {
      return <div
          className={classNames("folder", unfolded ? "folded" : "unfolded")}
          onClick={this.toggleFold}
      >
        <SvgIcon svg={require("../../icons/caret.svg")} />
        {unfolded ? "Show selection" : "Show all"}
      </div>;
    } else {
      return null;
    }
  }

  private calculateTileHeight(rowsCount: int, isFoldable: boolean): number {
    const titleAndPaddingHeight = PIN_TITLE_HEIGHT + PIN_PADDING_BOTTOM;
    const rowsHeightWithPaddingAndTitle = Math.max(2, rowsCount) * PIN_ITEM_HEIGHT + titleAndPaddingHeight;

    if (isFoldable) {
      return rowsHeightWithPaddingAndTitle + DimensionTile.FOLDER_BOX_HEIGHT;
    } else {
      return rowsHeightWithPaddingAndTitle;
    }
  }

  render() {
    const { sortOn, essence, dimension, colors, onClose } = this.props;
    const { loading, dataset, error, showSearch, unfolded, foldable, fetchQueued, searchText, filterMode } = this.state;

    const isContinuous = dimension.isContinuous();
    const rowsData = this.prepareRowsData();
    const rows = this.prepareRows(rowsData, isContinuous);
    const foldControl = this.prepareFoldControl(foldable, unfolded);

    let message: JSX.Element = null;
    if (!loading && dataset && !fetchQueued && searchText && !rows.length) {
      message = <div className="message">{`No results for "${searchText}"`}</div>;
    }

    const className = classNames(
        "dimension-tile",
        filterMode,
        (foldControl ? "has-folder" : "no-folder"),
        (colors ? "has-colors" : "no-colors"),
        { continuous: isContinuous }
    );

    const maxHeight = this.calculateTileHeight(rows.length, foldable);
    const style = {
      maxHeight
    };

    const icons: TileHeaderIcon[] = [{
      name: "search",
      ref: "search",
      onClick: this.toggleSearch,
      svg: require("../../icons/full-search.svg"),
      active: showSearch
    }];

    if (onClose !== null) {
      icons.push({
        name: "close",
        ref: "close",
        onClick: onClose,
        svg: require("../../icons/full-remove.svg")
      });
    }

    let actions: TileAction[] = null;

    if (dimension.canBucketByDefault()) {
      actions = this.getGranularityActions();
    } else if (!isContinuous && !essence.colors) {
      actions = this.getFilterActions();
    }

    return <SearchableTile
        style={style}
        title={this.getTitleHeader()}
        toggleChangeFn={this.toggleSearch}
        onDragStart={this.onDragStart}
        onSearchChange={this.onSearchChange}
        searchText={searchText}
        showSearch={showSearch}
        icons={icons}
        className={className}
        actions={actions}>
      <div className="rows">
        {rows}
        {message}
      </div>
      {foldControl}
      {error && <QueryError error={error} />}
      {!sortOn && <Message content="No measure selected"/>}
      {loading && <Loader />}
    </SearchableTile>;
  }
}
