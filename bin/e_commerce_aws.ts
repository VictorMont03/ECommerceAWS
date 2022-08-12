#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import {ProductsAppStack} from '../lib/productsApp-stack'
import {ECommerceApiStack} from '../lib/ecommerceApi-stack'
import {ProductsAppLayersStack} from '../lib/productsAppLayers-stack'

const app = new cdk.App();

//Ditando região e conta a qual a aplicacao está vinculada

const env: cdk.Environment = {
  account: '610729534299',
  region: 'us-east-1',
}

const tags = {
  cost: "ECommerce",
  team: "VictorDev"
}

const productsAppLayersStack = new ProductsAppLayersStack(app, "ProductsAppLayers", {
  tags: tags, env: env
})

const productsAppStack = new ProductsAppStack(app, "ProductsApp", {tags: tags, env: env})
//Stack de produtos depende indiretamente da stack de layers
productsAppStack.addDependency(productsAppLayersStack)

const eCommerceApiStack = new ECommerceApiStack(app, "ECommerceApi", {productsFetchHandler: productsAppStack.productsFetchHandler, productsAdminHandler: productsAppStack.productsAdminHandler,tags: tags, env: env})

eCommerceApiStack.addDependency(productsAppStack)