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

import { basicExecutorFactory, Dataset } from "plywood";
import { MANIFESTS } from "../../../common/manifests/index";
import { ClusterFixtures } from "../cluster/cluster.fixtures";
import { DataCubeFixtures } from "../data-cube/data-cube.fixtures";
import { shareOptionsDefaults } from "../share-options/share-options";
import { AppSettings, AppSettingsContext, AppSettingsJS } from "./app-settings";

const SMALL_WIKI_DATA = [
  {
    time: new Date("2015-09-12T00:46:58Z"),
    channel: "en",
    cityName: null,
    comment: "added project",
    commentLength: 13,
    countryIsoCode: null,
    countryName: null,
    deltaBucket100: 0,
    isAnonymous: false,
    isMinor: false,
    isNew: false,
    isRobot: false,
    isUnpatrolled: false,
    metroCode: null,
    namespace: "Talk",
    page: "Talk:Oswald Tilghman",
    regionIsoCode: null,
    regionName: null,
    user: "GELongstreet",
    userChars: ["E", "G", "L", "N", "O", "R", "S", "T"],
    delta: 36,
    added: 36,
    deleted: 0,
    deltaByTen: 3.6
  },
  {
    time: new Date("2015-09-12T00:47:00Z"),
    channel: "ca",
    cityName: null,
    comment: "Robot inserta {{Commonscat}} que enllaça amb [[commons:category:Rallicula]]",
    commentLength: 75,
    countryIsoCode: null,
    countryName: null,
    deltaBucket100: 0,
    isAnonymous: false,
    isMinor: true,
    isNew: false,
    isRobot: true,
    isUnpatrolled: false,
    metroCode: null,
    namespace: "Main",
    page: "Rallicula",
    regionIsoCode: null,
    regionName: null,
    user: "PereBot",
    userChars: ["B", "E", "O", "P", "R", "T"],
    delta: 17,
    added: 17,
    deleted: 0,
    deltaByTen: 1.7
  },
  {
    time: new Date("2015-09-12T00:47:05Z"),
    channel: "en",
    cityName: "Auburn",
    comment: "/* Status of peremptory norms under international law */ fixed spelling of 'Wimbledon'",
    commentLength: 86,
    countryIsoCode: "AU",
    countryName: "Australia",
    deltaBucket100: 0,
    isAnonymous: true,
    isMinor: false,
    isNew: false,
    isRobot: false,
    isUnpatrolled: false,
    metroCode: "123",
    namespace: "Main",
    page: "Peremptory norm",
    regionIsoCode: "NSW",
    regionName: "New South Wales",
    user: "60.225.66.142",
    userChars: [".", "0", "1", "2", "4", "5", "6"],
    delta: 0,
    added: 0,
    deleted: 0,
    deltaByTen: 0
  },
  {
    time: new Date("2015-09-12T00:47:08Z"),
    channel: "vi",
    cityName: null,
    comment: "fix Lỗi CS1: ngày tháng",
    commentLength: 23,
    countryIsoCode: null,
    countryName: null,
    deltaBucket100: 0,
    isAnonymous: false,
    isMinor: true,
    isNew: false,
    isRobot: true,
    isUnpatrolled: false,
    metroCode: null,
    namespace: "Main",
    page: "Apamea abruzzorum",
    regionIsoCode: null,
    regionName: null,
    user: "Cheers!-bot",
    userChars: ["!", "-", "B", "C", "E", "H", "O", "R", "S", "T"],
    delta: 18,
    added: 18,
    deleted: 0,
    deltaByTen: 1.8
  },
  {
    time: new Date("2015-09-12T00:47:11Z"),
    channel: "vi",
    cityName: null,
    comment: "clean up using [[Project:AWB|AWB]]",
    commentLength: 34,
    countryIsoCode: null,
    countryName: null,
    deltaBucket100: 0,
    isAnonymous: false,
    isMinor: false,
    isNew: false,
    isRobot: true,
    isUnpatrolled: false,
    metroCode: null,
    namespace: "Main",
    page: "Atractus flammigerus",
    regionIsoCode: null,
    regionName: null,
    user: "ThitxongkhoiAWB",
    userChars: ["A", "B", "G", "H", "I", "K", "N", "O", "T", "W", "X"],
    delta: 18,
    added: 18,
    deleted: 0,
    deltaByTen: 1.8
  },
  {
    time: new Date("2015-09-12T00:47:13Z"),
    channel: "vi",
    cityName: null,
    comment: "clean up using [[Project:AWB|AWB]]",
    commentLength: 34,
    countryIsoCode: null,
    countryName: null,
    deltaBucket100: 0,
    isAnonymous: false,
    isMinor: false,
    isNew: false,
    isRobot: true,
    isUnpatrolled: false,
    metroCode: null,
    namespace: "Main",
    page: "Agama mossambica",
    regionIsoCode: null,
    regionName: null,
    user: "ThitxongkhoiAWB",
    userChars: ["A", "B", "G", "H", "I", "K", "N", "O", "T", "W", "X"],
    delta: 18,
    added: 18,
    deleted: 0,
    deltaByTen: 1.8
  },
  {
    time: new Date("2015-09-12T00:47:17Z"),
    channel: "ca",
    cityName: null,
    comment: "/* Imperi Austrohongarès */",
    commentLength: 27,
    countryIsoCode: null,
    countryName: null,
    deltaBucket100: -100,
    isAnonymous: false,
    isMinor: false,
    isNew: false,
    isRobot: false,
    isUnpatrolled: false,
    metroCode: null,
    namespace: "Main",
    page: "Campanya dels Balcans (1914-1918)",
    regionIsoCode: null,
    regionName: null,
    user: "Jaumellecha",
    userChars: ["A", "C", "E", "H", "J", "L", "M", "U"],
    delta: -20,
    added: 0,
    deleted: 20,
    deltaByTen: -2
  },
  {
    time: new Date("2015-09-12T00:47:19Z"),
    channel: "en",
    cityName: null,
    comment: "adding comment on notability and possible COI",
    commentLength: 45,
    countryIsoCode: null,
    countryName: null,
    deltaBucket100: 300,
    isAnonymous: false,
    isMinor: false,
    isNew: true,
    isRobot: false,
    isUnpatrolled: true,
    metroCode: null,
    namespace: "Talk",
    page: "Talk:Dani Ploeger",
    regionIsoCode: null,
    regionName: null,
    user: "New Media Theorist",
    userChars: [" ", "A", "D", "E", "H", "I", "M", "N", "O", "R", "S", "T", "W"],
    delta: 345,
    added: 345,
    deleted: 0,
    deltaByTen: 34.5
  },
  {
    time: new Date("2015-09-12T00:47:21Z"),
    channel: "en",
    cityName: null,
    comment: "Copying assessment table to wiki",
    commentLength: 32,
    countryIsoCode: null,
    countryName: null,
    deltaBucket100: 100,
    isAnonymous: false,
    isMinor: false,
    isNew: false,
    isRobot: true,
    isUnpatrolled: false,
    metroCode: null,
    namespace: "User",
    page: "User:WP 1.0 bot/Tables/Project/Pubs",
    regionIsoCode: null,
    regionName: null,
    user: "WP 1.0 bot",
    userChars: [" ", ".", "0", "1", "B", "O", "P", "T", "W"],
    delta: 121,
    added: 121,
    deleted: 0,
    deltaByTen: 12.1
  },
  {
    time: new Date("2015-09-12T00:47:25Z"),
    channel: "vi",
    cityName: null,
    comment: "clean up using [[Project:AWB|AWB]]",
    commentLength: 34,
    countryIsoCode: null,
    countryName: null,
    deltaBucket100: 0,
    isAnonymous: false,
    isMinor: false,
    isNew: false,
    isRobot: true,
    isUnpatrolled: false,
    metroCode: null,
    namespace: "Main",
    page: "Agama persimilis",
    regionIsoCode: null,
    regionName: null,
    user: "ThitxongkhoiAWB",
    userChars: ["A", "B", "G", "H", "I", "K", "N", "O", "T", "W", "X"],
    delta: 18,
    added: 18,
    deleted: 0,
    deltaByTen: 1.8
  }
];

export class AppSettingsFixtures {
  public static wikiOnlyJS(): AppSettingsJS {
    return {
      customization: {
        title: "Hello World",
        headerBackground: "brown",
        customLogoSvg: "ansvgstring",
        shareOptions: shareOptionsDefaults
      },
      clusters: [
        ClusterFixtures.druidWikiClusterJS()
      ],
      dataCubes: [
        DataCubeFixtures.WIKI_JS
      ]
    };
  }

  public static wikiTwitterJS(): AppSettingsJS {
    return {
      customization: {
        title: "Hello World",
        shareOptions: shareOptionsDefaults
      },
      clusters: [
        ClusterFixtures.druidWikiClusterJS(),
        ClusterFixtures.druidTwitterClusterJS()
      ],
      dataCubes: [
        DataCubeFixtures.WIKI_JS,
        DataCubeFixtures.TWITTER_JS
      ]
    };
  }

  static getContext(): AppSettingsContext {
    return {
      visualizations: MANIFESTS
    };
  }

  static wikiOnly() {
    return AppSettings.fromJS(AppSettingsFixtures.wikiOnlyJS(), AppSettingsFixtures.getContext());
  }

  static wikiOnlyWithExecutor() {
    return AppSettingsFixtures.wikiOnly().attachExecutors(() => {
      return basicExecutorFactory({
        datasets: {
          main: Dataset.fromJS(SMALL_WIKI_DATA)
        }
      });
    });
  }

  static wikiTwitter() {
    return AppSettings.fromJS(AppSettingsFixtures.wikiTwitterJS(), AppSettingsFixtures.getContext());
  }
}
