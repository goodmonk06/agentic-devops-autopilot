import { env } from '../config/env';

export class RailwayService {
  private apiToken: string | null;
  private baseUrl = 'https://backboard.railway.app/graphql';

  constructor() {
    this.apiToken = env.RAILWAY_API_TOKEN || null;
  }

  /**
   * GraphQL クエリを実行
   */
  private async query(query: string, variables?: any): Promise<any> {
    if (!this.apiToken) {
      throw new Error('Railway API token not configured');
    }

    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiToken}`,
      },
      body: JSON.stringify({
        query,
        variables,
      }),
    });

    if (!response.ok) {
      throw new Error(`Railway API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.data;
  }

  /**
   * デプロイメント情報を取得
   */
  async getDeployment(deploymentId: string) {
    const query = `
      query GetDeployment($id: String!) {
        deployment(id: $id) {
          id
          status
          createdAt
          meta
        }
      }
    `;

    return this.query(query, { id: deploymentId });
  }

  /**
   * サービスの最新デプロイを取得
   */
  async getLatestDeployment(serviceId: string) {
    const query = `
      query GetService($id: String!) {
        service(id: $id) {
          id
          name
          deployments(first: 1) {
            edges {
              node {
                id
                status
                createdAt
              }
            }
          }
        }
      }
    `;

    return this.query(query, { id: serviceId });
  }

  /**
   * デプロイをロールバック（再デプロイ）
   */
  async rollbackDeployment(serviceId: string, deploymentId: string) {
    const query = `
      mutation DeploymentRedeploy($id: String!) {
        deploymentRedeploy(id: $id) {
          id
        }
      }
    `;

    console.log(`✓ Triggered rollback for deployment ${deploymentId}`);
    return this.query(query, { id: deploymentId });
  }
}

export const railwayService = new RailwayService();
