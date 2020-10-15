/*
 * Copyright 2017-2020 Allegro.pl
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

import { IncomingHttpHeaders } from "http";
import { Instance } from "immutable-class";
import * as plywood from "plywood";
import { Binary } from "../../utils/functional/functional";

export type DynamicSubsetFormulaFn = Binary<IncomingHttpHeaders, typeof plywood, plywood.Expression>;
export type DynamicSubsetFormulaDef = string;

export class DynamicSubsetFormula implements Instance<DynamicSubsetFormulaDef, DynamicSubsetFormulaDef> {

  static fromJS(def: DynamicSubsetFormulaDef): DynamicSubsetFormula {
    return new DynamicSubsetFormula(def);
  }

  private readonly subsetFunction: DynamicSubsetFormulaFn;

  constructor(private definition: DynamicSubsetFormulaDef) {
    this.subsetFunction = new Function("headers", "plywood", definition) as DynamicSubsetFormulaFn;
  }

  getSubsetExpression(headers: IncomingHttpHeaders): plywood.Expression {
    return this.subsetFunction(headers, plywood);
  }

  valueOf(): DynamicSubsetFormulaDef {
    return this.definition;
  }

  equals(other: DynamicSubsetFormula): boolean {
    return other instanceof DynamicSubsetFormula && this.valueOf() === other.valueOf();
  }

  toJS(): DynamicSubsetFormulaDef {
    return this.definition;
  }

  toJSON(): DynamicSubsetFormulaDef {
    return this.toJS();
  }

  toString(): string {
    return this.definition;
  }
}
