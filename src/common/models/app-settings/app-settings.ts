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

import { Class, immutableArraysEqual, immutableEqual, Instance, NamedArray } from "immutable-class";
import { Executor } from "plywood";
import { hasOwnProperty } from "../../utils/general/general";
import { ImmutableUtils } from "../../utils/immutable-utils/immutable-utils";
import { Cluster, ClusterJS } from "../cluster/cluster";
import { Customization, CustomizationJS } from "../customization/customization";
import { DataCube, DataCubeJS } from "../data-cube/data-cube";
import { Manifest } from "../manifest/manifest";
import { shareOptionsDefaults } from "../share-options/share-options";

export interface AppSettingsValue {
  version?: number;
  clusters?: Cluster[];
  customization?: Customization;
  dataCubes?: DataCube[];
}

export interface AppSettingsJS {
  version?: number;
  clusters?: ClusterJS[];
  customization?: CustomizationJS;
  dataCubes?: DataCubeJS[];
}

export interface AppSettingsContext {
  visualizations: Manifest[];
  executorFactory?: (dataCube: DataCube) => Executor;
}

var check: Class<AppSettingsValue, AppSettingsJS>;

export class AppSettings implements Instance<AppSettingsValue, AppSettingsJS> {
  static BLANK = AppSettings.fromJS({}, { visualizations: [] });

  static isAppSettings(candidate: any): candidate is AppSettings {
    return candidate instanceof AppSettings;
  }

  static fromJS(parameters: AppSettingsJS, context?: AppSettingsContext): AppSettings {
    if (!context) throw new Error("AppSettings must have context");
    var clusters: Cluster[];
    if (parameters.clusters) {
      clusters = parameters.clusters.map(cluster => Cluster.fromJS(cluster));

    } else if (hasOwnProperty(parameters, "druidHost") || hasOwnProperty(parameters, "brokerHost")) {
      var clusterJS: any = JSON.parse(JSON.stringify(parameters));
      clusterJS.name = "druid";
      clusterJS.type = "druid";
      clusterJS.host = clusterJS.druidHost || clusterJS.brokerHost;
      clusters = [Cluster.fromJS(clusterJS)];

    } else {
      clusters = [];
    }

    var executorFactory = context.executorFactory;
    var dataCubes = (parameters.dataCubes || (parameters as any).dataSources || []).map((dataCubeJS: DataCubeJS) => {
      var dataCubeClusterName = dataCubeJS.clusterName || (dataCubeJS as any).engine;
      if (dataCubeClusterName !== "native") {
        var cluster = NamedArray.findByName(clusters, dataCubeClusterName);
        if (!cluster) throw new Error(`Can not find cluster '${dataCubeClusterName}' for data cube '${dataCubeJS.name}'`);
      }

      var dataCubeObject = DataCube.fromJS(dataCubeJS, { cluster });
      if (executorFactory) {
        var executor = executorFactory(dataCubeObject);
        if (executor) dataCubeObject = dataCubeObject.attachExecutor(executor);
      }
      return dataCubeObject;
    });

    var value: AppSettingsValue = {
      version: parameters.version,
      clusters,
      customization: Customization.fromJS(parameters.customization || {}),
      dataCubes
    };

    return new AppSettings(value);
  }

  public version: number;
  public clusters: Cluster[];
  public customization: Customization;
  public dataCubes: DataCube[];

  constructor(parameters: AppSettingsValue) {
    const {
      version,
      clusters,
      customization,
      dataCubes
    } = parameters;

    for (var dataCube of dataCubes) {
      if (dataCube.clusterName === "native") continue;
      if (!NamedArray.findByName(clusters, dataCube.clusterName)) {
        throw new Error(`data cube ${dataCube.name} refers to an unknown cluster ${dataCube.clusterName}`);
      }
    }

    this.version = version || 0;
    this.clusters = clusters;
    this.customization = customization;
    this.dataCubes = dataCubes;
  }

  public valueOf(): AppSettingsValue {
    return {
      version: this.version,
      clusters: this.clusters,
      customization: this.customization,
      dataCubes: this.dataCubes
    };
  }

  public toJS(): AppSettingsJS {
    var js: AppSettingsJS = {};
    if (this.version) js.version = this.version;
    js.clusters = this.clusters.map(cluster => cluster.toJS());
    js.customization = this.customization.toJS();
    js.dataCubes = this.dataCubes.map(dataCube => dataCube.toJS());
    return js;
  }

  public toJSON(): AppSettingsJS {
    return this.toJS();
  }

  public toString(): string {
    return `[AppSettings v${this.version} dataCubes=${this.dataCubes.length}]`;
  }

  public equals(other: AppSettings): boolean {
    return AppSettings.isAppSettings(other) &&
      this.version === other.version &&
      immutableArraysEqual(this.clusters, other.clusters) &&
      immutableEqual(this.customization, other.customization) &&
      immutableArraysEqual(this.dataCubes, other.dataCubes);
  }

  public toClientSettings(): AppSettings {
    var value = this.valueOf();

    value.clusters = value.clusters.map(c => c.toClientCluster());

    value.dataCubes = value.dataCubes
      .filter(ds => ds.isQueryable())
      .map(ds => ds.toClientDataCube());

    return new AppSettings(value);
  }

  public getVersion(): number {
    return this.version;
  }

  public getDataCubesForCluster(clusterName: string): DataCube[] {
    return this.dataCubes.filter(dataCube => dataCube.clusterName === clusterName);
  }

  public getDataCube(dataCubeName: string): DataCube {
    return NamedArray.findByName(this.dataCubes, dataCubeName);
  }

  public addOrUpdateDataCube(dataCube: DataCube): AppSettings {
    var value = this.valueOf();
    value.dataCubes = NamedArray.overrideByName(value.dataCubes, dataCube);
    return new AppSettings(value);
  }

  public deleteDataCube(dataCube: DataCube): AppSettings {
    var value = this.valueOf();
    var index = value.dataCubes.indexOf(dataCube);

    if (index === -1) {
      throw new Error(`Unknown dataCube : ${dataCube.toString()}`);
    }

    var newDataCubes = value.dataCubes.concat();
    newDataCubes.splice(index, 1);

    value.dataCubes = newDataCubes;
    return new AppSettings(value);
  }

  public attachExecutors(executorFactory: (dataCube: DataCube) => Executor): AppSettings {
    var value = this.valueOf();
    value.dataCubes = value.dataCubes.map(ds => {
      var executor = executorFactory(ds);
      if (executor) ds = ds.attachExecutor(executor);
      return ds;
    });
    return new AppSettings(value);
  }

  public getSuggestedCubes(): DataCube[] {
    return this.dataCubes;
  }

  changeCustomization(customization: Customization): AppSettings {
    return this.change("customization", customization);
  }

  changeClusters(clusters: Cluster[]): AppSettings {
    return this.change("clusters", clusters);
  }

  addCluster(cluster: Cluster): AppSettings {
    return this.changeClusters(NamedArray.overrideByName(this.clusters, cluster));
  }

  change(propertyName: string, newValue: any): AppSettings {
    return ImmutableUtils.change(this, propertyName, newValue);
  }

  changeDataCubes(dataCubes: DataCube[]): AppSettings {
    return this.change("dataCubes", dataCubes);
  }

  addDataCube(dataCube: DataCube): AppSettings {
    return this.changeDataCubes(NamedArray.overrideByName(this.dataCubes, dataCube));
  }

  filterDataCubes(fn: (dataCube: DataCube, index?: number, dataCubes?: DataCube[]) => boolean): AppSettings {
    var value = this.valueOf();
    value.dataCubes = value.dataCubes.filter(fn);
    return new AppSettings(value);
  }

}

check = AppSettings;
