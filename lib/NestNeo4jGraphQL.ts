import { DynamicModule, Module, Provider } from '@nestjs/common';
import { DiscoveryModule } from '@nestjs/core';

import { IQuery } from 'neo4j-driver';
import { Closable } from 'neo4j-driver-core';

import { NEST_NEO4J_OPTIONS } from './constants';
import { createConfigProvider, getDriver } from './helpers';
import { Neo4jModuleAsyncOptions, Neo4jModuleOptions } from './interfaces';
import { Neo4jGraphQLService } from './services';
import { addConstraint, addIndexes } from './store';
import { GraphQLNeo4jComponent } from './types';

@Module({
  imports: [DiscoveryModule],
  providers: [Neo4jGraphQLService],
  exports: [Neo4jGraphQLService],
})
export class NestNeo4jGraphQL {
  private static graphQLNeo4jComponent: GraphQLNeo4jComponent;

  static setGraphQLNeo4jComponent(
    schemaName: string,
    driver: IQuery & Closable,
  ): GraphQLNeo4jComponent {
    this.graphQLNeo4jComponent = {
      schemaName,
      driver,
    };
    return this.graphQLNeo4jComponent;
  }

  static getDriverOptions(): GraphQLNeo4jComponent {
    return this.graphQLNeo4jComponent;
  }

  static forRoot(options: Neo4jModuleOptions): DynamicModule {
    return {
      module: NestNeo4jGraphQL,
      global: options.global || false,
      providers: [
        {
          provide: NEST_NEO4J_OPTIONS,
          useValue: options,
        },
        createConfigProvider(),
      ],
      exports: [createConfigProvider()],
    };
  }

  static forRootAsync(options: Neo4jModuleAsyncOptions): DynamicModule {
    return {
      module: NestNeo4jGraphQL,
      global: options.global || false,
      imports: options.imports || [],
      providers: [
        ...this.createAsyncProviders(options),
        createConfigProvider(),
      ],
      exports: [createConfigProvider()],
    };
  }

  static createAsyncProviders(options: Neo4jModuleAsyncOptions): Provider[] {
    if (options.useExisting || options.useFactory) {
      return [this.createAsyncOptionsProvider(options)];
    }

    return [
      this.createAsyncOptionsProvider(options),
      {
        provide: options.useClass,
        useClass: options.useClass,
      },
    ];
  }

  static createAsyncOptionsProvider(
    options: Neo4jModuleAsyncOptions,
  ): Provider {
    if (options.useFactory) {
      return {
        provide: NEST_NEO4J_OPTIONS,
        useFactory: options.useFactory,
        inject: options.inject || [],
      };
    }

    return {
      provide: NEST_NEO4J_OPTIONS,
      useFactory: async (optionsFactory) =>
        await optionsFactory.createNeo4jOptions(),
      inject: [options.useClass || options.useExisting],
    };
  }

  static async addConstraint(
    constraintName: string,
    entityLabel: string,
    entityProperty: string,
  ): Promise<void> {
    const driver = getDriver();
    return addConstraint(
      driver,
      constraintName,
      entityLabel,
      entityProperty,
    );
  }

  static async addIndexes(
    indexName: string,
    entityLabel: string,
    entityProperties: string[],
  ): Promise<void> {
    const driver = getDriver();
    return addIndexes(driver, indexName, entityLabel, entityProperties);
  }
}
