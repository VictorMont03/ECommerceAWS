import { DocumentClient } from "aws-sdk/clients/dynamodb";
import { v4 as uuid } from "uuid";

export interface Infos {
  id: string;
  cinemaName: string;
  address: string;
  phone: string;
}

export class InfosRepository {
  private ddbClient: DocumentClient;
  private infosDdb: string;

  constructor(ddbClient: DocumentClient, moviesDdb: string) {
    this.ddbClient = ddbClient;
    this.infosDdb = moviesDdb;
  }

  //return all items of the table
  async getInfos(): Promise<Infos[]> {
    const data = await this.ddbClient
      .scan({
        TableName: this.infosDdb,
      })
      .promise();

    return data.Items as Infos[];
  }

  //Create product in the table
  async createInfos(infos: Infos): Promise<Infos> {
    infos.id = uuid();
    await this.ddbClient
      .put({
        TableName: this.infosDdb,
        Item: infos,
      })
      .promise();

    return infos;
  }

  //Delete product
  async deleteInfos(infosId: string): Promise<Infos> {
    const data = await this.ddbClient
      .delete({
        TableName: this.infosDdb,
        Key: {
          id: infosId,
        },
        ReturnValues: "ALL_OLD",
      })
      .promise();

    if (data.Attributes) {
      return data.Attributes as Infos;
    } else {
      throw new Error("Infos not found");
    }
  }

  //Update product attributes
  async updateInfos(infosId: string, infos: Infos): Promise<Infos> {
    const data = await this.ddbClient
      .update({
        TableName: this.infosDdb,
        Key: {
          id: infosId,
        },
        ConditionExpression: "attribute_exists(id)",
        ReturnValues: "UPDATED_NEW",
        UpdateExpression: "set cinemaName = :c, address = :a, phone = :p",
        ExpressionAttributeValues: {
          ":c": infos.cinemaName,
          ":a": infos.address,
          ":p": infos.phone,
        },
      })
      .promise();

    data.Attributes!.id = infosId;
    return data.Attributes as Infos;
  }
}
