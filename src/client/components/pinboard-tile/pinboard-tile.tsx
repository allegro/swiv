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

import { Set } from "immutable";
import { Dataset, Datum } from "plywood";
import * as React from "react";
import { Clicker } from "../../../common/models/clicker/clicker";
import { Dimension } from "../../../common/models/dimension/dimension";
import { Essence } from "../../../common/models/essence/essence";
import { BooleanFilterClause, StringFilterAction, StringFilterClause } from "../../../common/models/filter-clause/filter-clause";
import { SortOn } from "../../../common/models/sort-on/sort-on";
import { Timekeeper } from "../../../common/models/timekeeper/timekeeper";
import { DatasetLoad, error, isError, isLoaded, isLoading, loaded, loading } from "../../../common/models/visualization-props/visualization-props";
import { debounceWithPromise, Unary } from "../../../common/utils/functional/functional";
import { Fn } from "../../../common/utils/general/general";
import { MAX_SEARCH_LENGTH } from "../../config/constants";
import { setDragData, setDragGhost } from "../../utils/dom/dom";
import { DragManager } from "../../utils/drag-manager/drag-manager";
import { reportError } from "../../utils/error-reporter/error-reporter";
import { Loader } from "../loader/loader";
import { Message } from "../message/message";
import { QueryError } from "../query-error/query-error";
import { SearchableTile } from "../searchable-tile/searchable-tile";
import { DataRows, EditMode, RowsMode } from "./data-rows";
import { pinboardIcons } from "./pinboard-icons";
import { SelectableRows } from "./selectable-rows";
import { TextRows } from "./text-rows";
import { isClauseEditable } from "./utils/is-clause-editable";
import { isDimensionPinnable } from "./utils/is-dimension-pinnable";
import { makeQuery } from "./utils/make-query";
import { isPinnableClause, PinnableClause } from "./utils/pinnable-clause";
import { equalParams, QueryParams } from "./utils/query-params";
import { shouldFetchData } from "./utils/should-fetch";
import { tileStyles } from "./utils/tile-styles";

export class PinboardTileProps {
  essence: Essence;
  clicker: Clicker;
  dimension: Dimension;
  timekeeper: Timekeeper;
  sortOn: SortOn;
  onClose: Fn;
}

export interface PinboardTileState {
  searchText: string;
  showSearch: boolean;
  datasetLoad: DatasetLoad;
}

const noMeasureError = new Error("No measure selected");

export class PinboardTile extends React.Component<PinboardTileProps, PinboardTileState> {

  state: PinboardTileState = {
    searchText: "",
    showSearch: false,
    datasetLoad: this.props.sortOn ? loading : error(noMeasureError)
  };

  private loadData(params: QueryParams) {
    if (!params.sortOn) {
      this.setState({ datasetLoad: error(noMeasureError) });
      return;
    }
    this.setState({ datasetLoad: loading });
    this.fetchData(params)
      .then(loadedDataset => {
        // TODO: encode it better
        // null is here when we get out of order request, so we just ignore it
        if (!loadedDataset) return;
        this.setState({ datasetLoad: loadedDataset });
      });
  }

  private fetchData(params: QueryParams): Promise<DatasetLoad | null> {
    this.lastQueryParams = params;
    return this.debouncedCallExecutor(params);
  }

  private lastQueryParams: Partial<QueryParams> = {};

  private callExecutor = (params: QueryParams): Promise<DatasetLoad | null> => {
    const { essence: { timezone, dataCube } } = params;
    return dataCube.executor(makeQuery(params), { timezone })
      .then((dataset: Dataset) => {
          // signal out of order requests with null
          if (!equalParams(params, this.lastQueryParams)) return null;
          return loaded(dataset);
        },
        err => {
          // signal out of order requests with null
          if (!equalParams(params, this.lastQueryParams)) return null;
          reportError(err);
          return error(err);
        });
  };

  private debouncedCallExecutor = debounceWithPromise(this.callExecutor, 500);

  componentDidMount() {
    const { essence, timekeeper, dimension, sortOn } = this.props;
    this.loadData({ essence, timekeeper, dimension, sortOn, searchText: "" });
  }

  componentWillUnmount() {
    this.debouncedCallExecutor.cancel();
  }

  componentDidUpdate(previousProps: PinboardTileProps, previousState: PinboardTileState) {
    if (shouldFetchData(previousProps, previousState)) {
      const { essence, timekeeper, dimension, sortOn } = this.props;
      const { searchText } = this.state;
      this.loadData({ essence, timekeeper, dimension, sortOn, searchText });
    }
  }

  onDragStart = (e: React.DragEvent<HTMLElement>) => {
    const { dimension } = this.props;

    const dataTransfer = e.dataTransfer;
    dataTransfer.effectAllowed = "all";
    setDragData(dataTransfer, "text/plain", dimension.title);

    DragManager.setDragDimension(dimension);
    setDragGhost(dataTransfer, dimension.title);
  };

  toggleSearch = () => {
    this.setState(({ showSearch }) => ({ showSearch: !showSearch }));
    this.setSearchText("");
  };

  setSearchText = (text: string) => {
    const searchText = text.substr(0, MAX_SEARCH_LENGTH);
    this.setState({ searchText });
  };

  private getFormatter(): Unary<Datum, string> {
    const { sortOn, essence } = this.props;

    const series = sortOn && essence.findConcreteSeries(sortOn.key);
    if (!series) return null;
    return d => series.formatValue(d);
  }

  private isEditable(): boolean {
    const clause = this.pinnedClause();
    return clause ? isClauseEditable(clause) : isDimensionPinnable(this.props.dimension);
  }

  private isInEditMode(): boolean {
    const clause = this.pinnedClause();
    return isClauseEditable(clause) && !clause.values.isEmpty();
  }

  private pinnedClause(): PinnableClause | null {
    const { essence: { filter }, dimension } = this.props;
    const clause = filter.getClauseForDimension(dimension);
    if (isPinnableClause(clause)) return clause;
    return null;
  }

  private toggleFilterValue = (value: string) => {
    const { clicker, essence: { filter } } = this.props;
    const clause = this.pinnedClause();
    if (!isPinnableClause(clause)) throw Error(`Expected Boolean or String filter clause, got ${clause}`);
    const updater = (values: Set<string>) => values.has(value) ? values.remove(value) : values.add(value);
    // TODO: call looks the same but typescript distinguish them and otherwise can't find common call signature
    const newClause = clause instanceof StringFilterClause ? clause.update("values", updater) : clause.update("values", updater);
    clicker.changeFilter(filter.setClause(newClause));
  };

  private createFilterClause = (value: string) => {
    const { clicker, essence: { filter }, dimension } = this.props;
    const reference = dimension.name;
    const values = Set.of(value);
    const clause = dimension.kind === "string"
      ? new StringFilterClause({ reference, action: StringFilterAction.IN, values })
      : new BooleanFilterClause({ reference, values });
    clicker.changeFilter(filter.addClause(clause));
  };

  filterData(data: Datum[]): Datum[] {
    const { searchText } = this.state;
    if (!searchText) return data;
    const lowerSearchText = searchText.toLowerCase();
    const { dimension } = this.props;
    return data.filter(datum => String(datum[dimension.name]).includes(lowerSearchText));
  }

  private getEditMode(): EditMode {
    if (this.isInEditMode()) {
      return {
        id: RowsMode.IN_EDIT,
        toggleValue: this.toggleFilterValue,
        clause: this.pinnedClause()
      };
    }
    if (this.isEditable()) {
      return {
        id: RowsMode.EDITABLE,
        createClause: this.createFilterClause
      };
    }
    return { id: RowsMode.NOT_EDITABLE };
  }

  renderData(data: Datum[]) {
    const { searchText } = this.state;
    const { dimension } = this.props;
    const filteredData = this.filterData(data);
    const emptySearchResults = searchText && filteredData.length === 0;
    return <div className="rows">
      <DataRows
        data={filteredData}
        dimension={dimension}
        formatter={this.getFormatter()}
        searchText={searchText}
        editMode={this.getEditMode()}/>
      {emptySearchResults && <div className="message">{`No results for "${searchText}"`}</div>}
    </div>;
  }

  render() {
    const { dimension, sortOn, onClose } = this.props;
    const { datasetLoad, showSearch, searchText } = this.state;

    return <SearchableTile
      style={tileStyles(datasetLoad)}
      title={dimension.title}
      toggleChangeFn={this.toggleSearch}
      onDragStart={this.onDragStart}
      onSearchChange={this.setSearchText}
      searchText={searchText}
      showSearch={showSearch}
      icons={pinboardIcons({ showSearch, onClose, onSearchClick: this.toggleSearch })}
      className="pinboard-tile">
      {!sortOn && <Message content="No measure selected" />}
      {isLoaded(datasetLoad) && this.renderData(datasetLoad.dataset.data)}
      {isError(datasetLoad) && <QueryError error={datasetLoad.error} />}
      {isLoading(datasetLoad) && <Loader />}
    </SearchableTile>;
  }
}
