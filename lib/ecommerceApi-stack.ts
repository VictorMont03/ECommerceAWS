import * as lambda from "aws-cdk-lib/aws-lambda";

import * as lambdaNodeJS from "aws-cdk-lib/aws-lambda-nodejs";

import * as cdk from "aws-cdk-lib";

import * as apigateway from "aws-cdk-lib/aws-apigateway";

import * as cwlogs from "aws-cdk-lib/aws-logs";

import { Construct } from "constructs";

//Caracteriza o recebimento de uma função lambda via props na instancia da classe
interface ECommerceApiStackProps extends cdk.StackProps {
  productsFetchHandler: lambdaNodeJS.NodejsFunction;
  productsAdminHandler: lambdaNodeJS.NodejsFunction;
  moviesFetchHandler: lambdaNodeJS.NodejsFunction;
  moviesAdminHandler: lambdaNodeJS.NodejsFunction;
  ordersHandler: lambdaNodeJS.NodejsFunction;
  infosAdminHandler: lambdaNodeJS.NodejsFunction;
}

export class ECommerceApiStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: ECommerceApiStackProps) {
    super(scope, id, props);

    //Pastas que guarda os logs
    const logGroup = new cwlogs.LogGroup(this, "ECommerceApiLogs");

    //Criando REST API utilizando o apigateway do aws cdk
    const api = new apigateway.RestApi(this, "EcommerceApi", {
      restApiName: "ECommerceApi",
      deployOptions: {
        accessLogDestination: new apigateway.LogGroupLogDestination(logGroup),
        accessLogFormat: apigateway.AccessLogFormat.jsonWithStandardFields({
          httpMethod: true,
          ip: true,
          protocol: true,
          requestTime: true,
          resourcePath: true,
          responseLength: true,
          status: true,
          caller: true,
          user: true,
        }),
      },
    });

    //PRODUCTS
    this.createProductsService(props, api);

    //CINEMA
    this.createMoviesService(props, api);

    //ORDERS
    this.createOrdersService(props, api);

    //Infos
    this.createInfosService(props, api);
  }

  private createProductsService(
    props: ECommerceApiStackProps,
    api: cdk.aws_apigateway.RestApi
  ) {
    const moviesFetchIntegration = new apigateway.LambdaIntegration(
      props.moviesFetchHandler
    );

    const moviesResource = api.root.addResource("movies");
    moviesResource.addMethod("GET", moviesFetchIntegration);

    const moviesIdResource = moviesResource.addResource("{id}");
    moviesIdResource.addMethod("GET", moviesFetchIntegration);

    //Adm cinema
    const moviesAdminIntegration = new apigateway.LambdaIntegration(
      props.moviesAdminHandler
    );

    moviesResource.addMethod("POST", moviesAdminIntegration);

    moviesIdResource.addMethod("PUT", moviesAdminIntegration);

    moviesIdResource.addMethod("DELETE", moviesAdminIntegration);
  }

  private createMoviesService(
    props: ECommerceApiStackProps,
    api: cdk.aws_apigateway.RestApi
  ) {
    const productsFetchIntegration = new apigateway.LambdaIntegration(
      props.productsFetchHandler
    );

    //Criação da rota /products
    const productsResource = api.root.addResource("products");
    //Redirecionar uma chamada em /products para a função declarada
    productsResource.addMethod("GET", productsFetchIntegration);

    //Criação da rota /products/{id}
    const productIdResource = productsResource.addResource("{id}");
    productIdResource.addMethod("GET", productsFetchIntegration);

    //Administração de produtos
    const productsAdminIntegration = new apigateway.LambdaIntegration(
      props.productsAdminHandler
    );

    productsResource.addMethod("POST", productsAdminIntegration);

    productIdResource.addMethod("PUT", productsAdminIntegration);

    productIdResource.addMethod("DELETE", productsAdminIntegration);
  }

  private createOrdersService(
    props: ECommerceApiStackProps,
    api: cdk.aws_apigateway.RestApi
  ) {
    const ordersIntegration = new apigateway.LambdaIntegration(
      props.ordersHandler
    );

    //resource
    const ordersResource = api.root.addResource("orders");

    //GET
    ordersResource.addMethod("GET", ordersIntegration);

    //DELETE
    const orderDeletionValidator = new apigateway.RequestValidator(
      this,
      "OrderDeletionValidator",
      {
        restApi: api,
        requestValidatorName: "OrderDeletionValidator",
        validateRequestParameters: true,
      }
    );
    ordersResource.addMethod("DELETE", ordersIntegration, {
      requestParameters: {
        "method.request.querystring.email": true,
        "method.request.querystring.orderId": true,
      },
      requestValidator: orderDeletionValidator,
    });

    //POST
    // const orderRequestValidator = new apigateway.RequestValidator(
    //   this,
    //   "OrderRequestValidator",
    //   {
    //     restApi: api,
    //     requestValidatorName: "Order request validator",
    //     validateRequestBody: true,
    //   }
    // );

    // const orderModel = new apigateway.Model(this, "OrderModel", {
    //   modelName: "OrderModel",
    //   restApi: api,
    //   schema:{
    //     type: apigateway.JsonSchemaType.STRING,
    //     properties: {
    //       email: {
    //         type: apigateway.JsonSchemaType.STRING
    //       }
    //     }
    //   }
    // });

    ordersResource.addMethod("POST", ordersIntegration);
  }

  private createInfosService(
    props: ECommerceApiStackProps,
    api: cdk.aws_apigateway.RestApi
  ) {
    const infosIntegration = new apigateway.LambdaIntegration(
      props.infosAdminHandler
    );

    //resource
    const infosResource = api.root.addResource("infos");

    //GET
    infosResource.addMethod("GET", infosIntegration);

    //DELETE
    const infosDeletetionValidator = new apigateway.RequestValidator(
      this,
      "infosDeletetionValidator",
      {
        restApi: api,
        requestValidatorName: "infosDeletetionValidator",
        validateRequestParameters: true,
      }
    );
    infosResource.addMethod("DELETE", infosIntegration, {
      requestParameters: {
        "method.request.querystring.infoId": true,
      },
      requestValidator: infosDeletetionValidator,
    });

    infosResource.addMethod("POST", infosIntegration);
    infosResource.addMethod("PUT", infosIntegration);
  }
}
