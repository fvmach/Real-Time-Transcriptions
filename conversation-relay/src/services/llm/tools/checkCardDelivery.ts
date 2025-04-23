import mockData from "../../../data/mock-data";

export interface checkCardDeliveryParams {
  userId: string;
}

export async function checkCardDelivery(params: checkCardDeliveryParams): Promise<string> {

  console.log('Checking Card Delivery Status', params);

  const user = mockData.users.find((user) => user.userId === params.userId);

  if(user?.bankAccount?.cardDelivery) { 
    return JSON.stringify({ userId: params.userId, cardDelivery: user.bankAccount.cardDelivery });
  } else {
    return "No card delivery data found.";
  }
}
