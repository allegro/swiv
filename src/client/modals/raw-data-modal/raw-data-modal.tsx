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

import './raw-data-modal.scss';

import * as React from 'react';
import { List } from 'immutable';
import { isDate } from 'chronoshift';
import { $, AttributeInfo, Dataset, Datum, Expression } from 'plywood';
import { DataCube, Essence, Stage, Timekeeper } from '../../../common/models';

import { arraySum, Fn, formatFilterClause, makeTitle } from '../../../common/utils';
import { download, makeFileName } from '../../utils/download/download';
import { classNames } from '../../utils/dom/dom';
import { getVisibleSegments } from '../../utils/sizing/sizing';
import { exportOptions, STRINGS } from '../../config/constants';

import { Button, Loader, Modal, QueryError, Scroller, ScrollerLayout } from '../../components';

const HEADER_HEIGHT = 30;
const ROW_HEIGHT = 30;
const LIMIT = 100;
const TIME_COL_WIDTH = 180;
const BOOLEAN_COL_WIDTH = 100;
const NUMBER_COL_WIDTH = 100;
const DEFAULT_COL_WIDTH = 200;

export interface RawDataModalProps extends React.Props<any> {
  onClose: Fn;
  essence: Essence;
  timekeeper: Timekeeper;
}

export interface RawDataModalState {
  dataset?: Dataset;
  error?: Error;
  loading?: boolean;
  scrollLeft?: number;
  scrollTop?: number;
  stage?: Stage;
}

function getColumnWidth(attribute: AttributeInfo): number {
  switch (attribute.type) {
    case 'BOOLEAN':
      return BOOLEAN_COL_WIDTH;
    case 'NUMBER':
      return NUMBER_COL_WIDTH;
    case 'TIME':
      return TIME_COL_WIDTH;
    default:
      return DEFAULT_COL_WIDTH;
  }
}

function classFromAttribute(attribute: AttributeInfo): string {
  return classNames(
    String(attribute.type).toLowerCase().replace(/\//g, '-'),
    { unsplitable: attribute.unsplitable }
  );
}

export class RawDataModal extends React.Component<RawDataModalProps, RawDataModalState> {
  public mounted: boolean;

  constructor(props: RawDataModalProps) {
    super(props);
    this.state = {
      loading: false,
      dataset: null,
      scrollLeft: 0,
      scrollTop: 0,
      error: null,
      stage: null
    };

  }

  componentDidMount() {
    this.mounted = true;
    const { essence, timekeeper } = this.props;
    this.fetchData(essence, timekeeper);
  }

  componentWillUnmount() {
    this.mounted = false;
  }

  fetchData(essence: Essence, timekeeper: Timekeeper): void {
    const { dataCube } = essence;
    const $main = $('main');
    const query = $main.filter(essence.getEffectiveFilter(timekeeper).toExpression()).limit(LIMIT);
    this.setState({ loading: true });
    dataCube.executor(query, { timezone: essence.timezone })
      .then(
        (dataset: Dataset) => {
          if (!this.mounted) return;
          this.setState({
            dataset,
            loading: false
          });
        },
        (error: Error) => {
          if (!this.mounted) return;
          this.setState({
            error,
            loading: false
          });
        }
      );
  }

  onScrollerViewportUpdate(viewPortStage: Stage) {
    if (!viewPortStage.equals(this.state.stage)) {
      this.setState({
        stage: viewPortStage
      });
    }
  }

  onScroll(scrollTop: number, scrollLeft: number) {
    this.setState({ scrollLeft, scrollTop });
  }

  getStringifiedFilters(): List<string> {
    const { essence, timekeeper } = this.props;
    const { dataCube } = essence;

    return essence.getEffectiveFilter(timekeeper).clauses.map(clause => {
      const dimension = dataCube.getDimensionByExpression(clause.expression);
      if (!dimension) return null;
      return formatFilterClause(dimension, clause, essence.timezone);
    }).toList();
  }

  getSortedAttributes(dataCube: DataCube): AttributeInfo[] {
    const timeAttributeName = dataCube.timeAttribute ? dataCube.timeAttribute.name : null;

    const attributeRank = (attribute: AttributeInfo) => {
      const name = attribute.name;
      if (name === timeAttributeName) {
        return 1;
      } else if (attribute.unsplitable) {
        return 3;
      } else {
        return 2;
      }
    };

    return dataCube.attributes.sort((a1, a2) => {
      const score1 = attributeRank(a1);
      const score2 = attributeRank(a2);
      if (score1 === score2) {
        return a1.name.toLowerCase().localeCompare(a2.name.toLowerCase());
      }
      return score1 - score2;
    });

  }

  renderFilters(): List<JSX.Element> {
    const filters = this.getStringifiedFilters().map((filter: string, i: number) => {
      return <li className="filter" key={i}>{filter}</li>;
    }).toList();
    const limit = <li className="limit" key="limit">First {LIMIT} events matching </li>;
    return filters.unshift(limit);
  }

  renderHeader(): JSX.Element[] {
    const { essence } = this.props;
    const { dataset } = this.state;
    if (!dataset) return null;
    const { dataCube } = essence;

    const attributes = this.getSortedAttributes(dataCube);

    return attributes.map((attribute, i) => {
      const name = attribute.name;
      const width = getColumnWidth(attribute);
      const style = { width };
      return (<div className={classNames("header-cell", classFromAttribute(attribute))} style={style} key={i}>
        <div className="title-wrap">
          {makeTitle(name)}
        </div>
      </div>);
    });
  }

  getVisibleIndices(rowCount: number, height: number): number[] {
    const { scrollTop } = this.state;

    return [
      Math.max(0, Math.floor(scrollTop / ROW_HEIGHT)),
      Math.min(rowCount, Math.ceil((scrollTop + height) / ROW_HEIGHT))
    ];
  }

  renderRows(): JSX.Element[] {
    const { essence } = this.props;
    const { dataset, scrollLeft, stage } = this.state;
    if (!dataset) return null;
    const { dataCube } = essence;

    const rawData = dataset.data;

    const [firstRowToShow, lastRowToShow] = this.getVisibleIndices(rawData.length, stage.height);

    const rows = rawData.slice(firstRowToShow, lastRowToShow);
    let attributes = this.getSortedAttributes(dataCube);
    const attributeWidths = attributes.map(getColumnWidth);

    const { startIndex, shownColumns } = getVisibleSegments(attributeWidths, scrollLeft, stage.width);
    const leftOffset = arraySum(attributeWidths.slice(0, startIndex));

    attributes = attributes.slice(startIndex, startIndex + shownColumns);

    let rowY = firstRowToShow * ROW_HEIGHT;
    return rows.map((datum: Datum, i: number) => {
      const cols: JSX.Element[] = [];
      attributes.forEach((attribute: AttributeInfo) => {
        const name = attribute.name;
        const datumAttribute = datum[name];
        const value = (datumAttribute instanceof Expression) ? datumAttribute.resolve(datum).simplify() : datum[name];
        const colStyle = {
          width: getColumnWidth(attribute)
        };

        var displayValue = value;

        if (isDate(datum[name])) {
          displayValue = (datum[name] as Date).toISOString();
        }

        cols.push(<div className={classNames('cell', classFromAttribute(attribute))} key={name} style={colStyle}>
          <span className="cell-value">{String(displayValue)}</span>
        </div>);
      });

      const rowStyle = { top: rowY, left: leftOffset };
      rowY += ROW_HEIGHT;
      return <div className="row" style={rowStyle} key={i}>{cols}</div>;
    });
  }

  renderButtons(): JSX.Element {
    const { essence, onClose, timekeeper } = this.props;
    const { dataset, loading, error } = this.state;
    const { dataCube } = essence;

    const filtersString = essence.getEffectiveFilter(timekeeper).getFileString(dataCube.timeAttribute);

    const buttons: JSX.Element[] = [];

    buttons.push(<Button type="primary" className="close" onClick={onClose} title={STRINGS.close} />);

    exportOptions.forEach(({ label, fileFormat }) => {
      buttons.push(
        <Button
          type="secondary"
          className="download"
          onClick={download.bind(this, dataset, makeFileName(dataCube.name, filtersString, 'raw'), fileFormat)}
          title={label}
          disabled={Boolean(loading || error)}
        />
      );
    });

    return <div className="button-bar">
      {buttons}
    </div>;
  }

  render() {
    const { essence, onClose } = this.props;
    const { dataset, loading, error, stage } = this.state;
    const { dataCube } = essence;

    const title = `${makeTitle(STRINGS.rawData)}`;

    const scrollerLayout: ScrollerLayout = {
      // Inner dimensions
      bodyWidth: arraySum(dataCube.attributes.map(getColumnWidth)),
      bodyHeight: (dataset ? dataset.data.length : 0) * ROW_HEIGHT,

      // Gutters
      top: HEADER_HEIGHT,
      right: 0,
      bottom: 0,
      left: 0
    };

    return <Modal
      className="raw-data-modal"
      title={title}
      onClose={onClose}
    >
      <div className="content">
        <ul className="filters">{this.renderFilters()}</ul>
        <Scroller
          ref="table"
          layout={scrollerLayout}
          topGutter={this.renderHeader()}
          body={stage && this.renderRows()}
          onScroll={this.onScroll.bind(this)}
          onViewportUpdate={this.onScrollerViewportUpdate.bind(this)}
        />
        {error ? <QueryError error={error} /> : null}
        {loading ? <Loader /> : null}
        {this.renderButtons()}
      </div>
    </Modal>;
  }
}

