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

import { ApplyExpression } from "plywood";
import { Measure } from "../measure/measure";
import { ConcreteSeries, DerivationFilter } from "./concrete-series";
import { MeasureSeries } from "./measure-series";

export function fromMeasure(measure: Measure): MeasureConcreteSeries {
  return new MeasureConcreteSeries(MeasureSeries.fromMeasure(measure), measure);
}

export class MeasureConcreteSeries extends ConcreteSeries<MeasureSeries> {

  constructor(series: MeasureSeries, measure: Measure) {
    super(series, measure);
  }

  public plywoodExpression(nestingLevel: number, derivationFilter?: DerivationFilter): ApplyExpression {
    const expression = this.applyPeriod(derivationFilter);
    const name = this.plywoodKey(derivationFilter.derivation);
    return new ApplyExpression({ name, expression });
  }
}
