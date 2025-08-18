export const generatePayload = (id: number) => {
  return {
    value: id,
  };
};

export interface TestPayload {
  value: number;
}
