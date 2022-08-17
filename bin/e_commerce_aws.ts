#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { ProductsAppStack } from "../lib/productsApp-stack";
import { ECommerceApiStack } from "../lib/ecommerceApi-stack";
import { ProductsAppLayersStack } from "../lib/productsAppLayers-stack";
import { EventsDdbStack } from "../lib/eventsDdb-stack";

//Cinema
import { MoviesAppStack } from "../lib/moviesApp-stack";

const app = new cdk.App();

//Ditando região e conta a qual a aplicacao está vinculada

const env: cdk.Environment = {
  account: "610729534299",
  region: "us-east-1",
};

const tags = {
  cost: "ECommerce",
  team: "VictorDev",
};

//Iniciando a pilha
const productsAppLayersStack = new ProductsAppLayersStack(
  app,
  "ProductsAppLayers",
  {
    tags: tags,
    env: env,
  }
);

//Iniciando a pilha
const eventsDdbStack = new EventsDdbStack(app, "EventsDdb", {
  tags: tags,
  env: env,
});

const productsAppStack = new ProductsAppStack(app, "ProductsApp", {
  eventsDdb: eventsDdbStack.table,
  tags: tags,
  env: env,
});

const moviesAppStack = new MoviesAppStack(app, "MoviesApp", {
  tags: tags,
  env: env,
});
//Stack de produtos depende indiretamente da stack de layers
moviesAppStack.addDependency(productsAppLayersStack);
productsAppStack.addDependency(productsAppLayersStack);
productsAppStack.addDependency(eventsDdbStack);

const eCommerceApiStack = new ECommerceApiStack(app, "ECommerceApi", {
  productsFetchHandler: productsAppStack.productsFetchHandler,
  productsAdminHandler: productsAppStack.productsAdminHandler,
  moviesFetchHandler: moviesAppStack.moviesFetchHandler,
  moviesAdminHandler: moviesAppStack.moviesAdminHandler,
  tags: tags,
  env: env,
});

eCommerceApiStack.addDependency(productsAppStack);
eCommerceApiStack.addDependency(moviesAppStack);
