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

import { Logger } from "../../logger/logger";
import { Timekeeper } from "../../models/timekeeper/timekeeper";

export type Check = () => Promise<Date>;

export class TimeMonitor {
  public logger: Logger;
  public regularCheckInterval: number;
  public specialCheckInterval: number;
  public timekeeper: Timekeeper;
  public checks: Record<string, Check>;
  private doingChecks = false;

  constructor(logger: Logger) {
    this.logger = logger;
    this.checks = {};
    this.regularCheckInterval = 60000;
    this.specialCheckInterval = 60000;
    this.timekeeper = Timekeeper.EMPTY;
    setInterval(this.doChecks.bind(this), 1000);
  }

  addCheck(name: string, check: Check): this {
    this.checks[name] = check;
    this.timekeeper = this.timekeeper.addTimeTagFor(name);
    return this;
  }

  private doCheck(name: string): Promise<void> {
    const { logger } = this;
    const check = this.checks[name];
    if (!check) return Promise.resolve(null);
    return check().then(updatedTime => {
        logger.log(`Got the latest time for '${name}' (${updatedTime.toISOString()})`);
        this.timekeeper = this.timekeeper.updateTime(name, updatedTime);
      }).catch(e => {
        logger.error(`Error getting time for '${name}': ${e.message}`);
      }
    );
  }

  private doChecks(): void {
    const { doingChecks, timekeeper, regularCheckInterval } = this;
    if (doingChecks) return;
    const now = timekeeper.now().valueOf();
    const timeTags = this.timekeeper.timeTags;

    this.doingChecks = true;
    const checkTasks = timeTags
      .filter(timeTag => !timeTag.time || now - timeTag.updated.valueOf() > regularCheckInterval)
      .map(timeTag => this.doCheck(timeTag.name));
    Promise.all(checkTasks).then(() => {
      this.doingChecks = false;
    });
  }

}
