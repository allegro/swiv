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

import { Fn, isTruthy } from "../general/general";

export type Unary<T, R> = (arg: T) => R;
export type Binary<T, T2, R> = (arg: T, arg2: T2) => R;
export type Ternary<T, T2, T3, R> = (arg: T, arg2: T2, arg3: T3) => R;

export type Predicate<T> = Unary<T, boolean>;

export function noop(...args: any[]): any {
}

export function cons<T>(coll: T[], element: T): T[] {
  return coll.concat([element]);
}

export function flatMap<T, S>(coll: T[], mapper: Binary<T, number, S[]>): S[] {
  return [].concat(...coll.map(mapper));
}

export function concatTruthy<T>(...elements: T[]): T[] {
  return elements.reduce((result: T[], element: T) => isTruthy(element) ? cons(result, element) : result, []);
}

export function mapTruthy<T, S>(coll: T[], f: Binary<T, number, S>): S[] {
  return coll.reduce((result: S[], element: T, idx: number) => {
    const mapped: S = f(element, idx);
    return isTruthy(mapped) ? cons(result, mapped) : result;
  }, []);
}

export function thread(x: any, ...fns: Function[]) {
  return fns.reduce((x, f) => f(x), x);
}

export function threadTruthy(x: any, ...fns: Function[]) {
  return fns.reduce((x, f) => isTruthy(x) ? f(x) : x, x);
}

export function complement<T>(p: Predicate<T>): Predicate<T> {
 return (x: T) => !p(x);
}

export function debounce<T extends (...args: any[]) => any>(fn: T, ms: number): T & { cancel: Fn } {
  let timeoutId: any;

  const debouncedFn = function(...args: any[]) {
    const callLater = () => {
      timeoutId = undefined;
      fn(...args);
    };

    if (timeoutId !== undefined) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(callLater, ms);
  } as any;

  debouncedFn.cancel = () => timeoutId && clearTimeout(timeoutId);

  return debouncedFn;
}
