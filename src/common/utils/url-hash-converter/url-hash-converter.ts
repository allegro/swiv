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

import { DataCube, Essence, Manifest } from "../../models";
import { DEFAULT_VIEW_DEFINITION_VERSION, definitionConverters, definitionUrlEncoders, ViewDefinitionVersion } from "../../view-definitions";

export interface EssenceToUrlPathConverter {
  essenceFromHash(hash: string, dataCube: DataCube, visializations: Manifest[]): Essence;

  toHash(essence: Essence, version?: ViewDefinitionVersion): string;
}

export class UrlHashConverter implements EssenceToUrlPathConverter {
  essenceFromHash(hash: string, dataCube: DataCube, visualizations: Manifest[]): Essence {
    const hashParts = hash.split('/');

    if (hashParts.length < 3) return null;

    const visualization = hashParts[0];
    const version = hashParts[1] as ViewDefinitionVersion;
    const encodedModel = hashParts.splice(2).join("/");

    const urlEncoder = definitionUrlEncoders[version];
    const definitionConverter = definitionConverters[version];

    if (urlEncoder == null || definitionConverter == null) return null;

    const definition = urlEncoder.decodeUrlHash(encodedModel, visualization);
    return definitionConverter.fromViewDefinition(definition, dataCube, visualizations);
  }

  toHash(essence: Essence, version: ViewDefinitionVersion = DEFAULT_VIEW_DEFINITION_VERSION): string {
    const { visualization } = essence;

    const urlEncoder = definitionUrlEncoders[version];
    const definitionConverter = definitionConverters[version];

    if (urlEncoder == null || definitionConverter == null) return null;

    const definition = definitionConverter.toViewDefinition(essence);
    const encodedDefinition = urlEncoder.encodeUrlHash(definition);

    return [
      visualization.name,
      version,
      encodedDefinition
    ].join("/");
  }
}
