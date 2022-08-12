import { DocumentClient } from "aws-sdk/clients/dynamodb"
import { v4 as uuid } from "uuid"

export interface Product {
    id: string,
    productName: string,
    code: string,
    price: number,
    model: string,
    productUrl: string
}

export class ProductRepository {
    private ddbClient: DocumentClient
    private productsDdb: string

    constructor(ddbClient: DocumentClient, productsDdb: string) {
        this.ddbClient = ddbClient
        this.productsDdb = productsDdb
    }

    //return all items of the table
    async getAllProducts(): Promise<Product[]> {
        const data = await this.ddbClient.scan({
            TableName: this.productsDdb,

        }).promise()

        return data.Items as Product[]
    }

    //search using ID
    async getProductById(productId: string): Promise<Product> {
        const data = await this.ddbClient.get({
            TableName: this.productsDdb,
            Key: {
                id: productId
            }
        }).promise()

        if (data.Item) {
            return data.Item as Product;
        } else {
            throw new Error("Product not found")
        }
    }

    //Create product in the table
    async createProduct(product: Product): Promise<Product> {
        product.id = uuid();
        await this.ddbClient.put({
            TableName: this.productsDdb,
            Item: product
        }).promise()

        return product
    }

    //Delete product
    async deleteProduct(productId: string): Promise<Product> {
        const data = await this.ddbClient.delete({
            TableName: this.productsDdb,
            Key: {
                id: productId
            },
            //Retorna valores da tabela antiga antes de executar a ação
            ReturnValues: "ALL_OLD"
        }).promise()

        if (data.Attributes) {
            return data.Attributes as Product
        } else {
            throw new Error("Product not found")
        }
    }

    //Update product attributes
    async updateProduct(productId: string, product: Product): Promise<Product> {
        const data = await this.ddbClient.update({
            TableName: this.productsDdb,
            Key: {
                id: productId
            },
            //Executa somente se 
            ConditionExpression: 'attribute_exists(id)',
            //Retorna o que foi alterado
            ReturnValues: "UPDATED_NEW",
            UpdateExpression: 'set productName = :n, code = :c, price = :p, model = :m, productUrl = :u',
            ExpressionAttributeValues: {
                ":n": product.productName,
                ":c": product.code,
                ":p": product.price,
                ":m": product.model,
                ":u": product.productUrl
            }
        }).promise()

        data.Attributes!.id = productId;
        return data.Attributes as Product;
    }

}