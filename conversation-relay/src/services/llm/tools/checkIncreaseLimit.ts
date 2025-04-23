import mockData from "../../../data/mock-data";

export interface checkIncreaseLimitParams {
  userId: string;
}

export async function checkIncreaseLimit(params: checkIncreaseLimitParams): Promise<string> {

  console.log('Check Increase Limit', params);

  const user = mockData.users.find((user) => user.userId === params.userId);

  if(user?.bankAccount) { 
    return JSON.stringify({ userId: params.userId, bankAccount: user.bankAccount });
  } else {
    return "No Bank account found.";
  }
}
