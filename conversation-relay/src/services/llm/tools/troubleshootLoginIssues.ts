import mockData from "../../../data/mock-data";

export interface troubleshootLoginIssuesParams {
  userId: string;
}

export async function troubleshootLoginIssues(params: troubleshootLoginIssuesParams): Promise<string> {

  console.log('Troubleshooting login issues', params);

  const user = mockData.users.find((user) => user.userId === params.userId);

  if(user?.login) { 
    return JSON.stringify({ userId: params.userId, login: user.login });
  } else {
    return "No login data found.";
  }
}
